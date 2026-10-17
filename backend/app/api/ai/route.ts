import { NextResponse } from 'next/server'
import { ai } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash']

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  try {
    let query = supabase.from('ai_responses').select('*')
    if (taskId) query = query.eq('task_id', taskId)
    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
    }
    return NextResponse.json({ success: true, data }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, material, taskId } = await request.json()

    const materialSection = material
      ? `\n\nGunakan materi berikut sebagai sumber utama jawaban (dari file yang diunggah mahasiswa):\n"""\n${material}\n"""\n`
      : ''

    const prompt =
      'Berikan penjelasan ringkas, jawaban lengkap, dan 2 soal pilihan ganda post-test untuk tugas kuliah berikut:\n' +
      `Judul: ${title}\n` +
      `Deskripsi: ${description}` +
      materialSection +
      '\n\nPENTING: Jika kamu menuliskan kode, bungkus di dalam blok kode dengan nama bahasanya ' +
      '(contoh: ```dart untuk Flutter, ```python, ```js, ```sql). Jangan campur kode di dalam teks biasa.\n' +
      '\n\nFormat output JSON murni tanpa markdown backticks (```json ... ```):\n' +
      '{\n' +
      '  "explanation": "Penjelasan materi...",\n' +
      '  "answer": "Jawaban lengkap tugas...",\n' +
      '  "post_test": [\n' +
      '    {\n' +
      '      "question": "Pertanyaan 1?",\n' +
      '      "options": ["A", "B", "C", "D"],\n' +
      '      "answer": "A"\n' +
      '    }\n' +
      '  ]\n' +
      '}'

    let response: any = null
    let lastError: any = null

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await ai.models.generateContent({ model, contents: prompt })
          break
        } catch (err: any) {
          lastError = err
          const msg = String(err?.message || '')
          const retryable =
            msg.includes('503') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('high demand') ||
            msg.includes('429')
          if (!retryable) break
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
      if (response) break
    }

    if (!response) {
      throw new Error(lastError?.message || 'Model AI sedang tidak tersedia. Coba lagi nanti.')
    }

    const text = response.text || '{}'
    let cleanedText = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const firstBrace = cleanedText.indexOf('{')
    const lastBrace = cleanedText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) cleanedText = cleanedText.slice(firstBrace, lastBrace + 1)
    const data = JSON.parse(cleanedText)

    if (taskId) {
      const { error } = await supabase.from('ai_responses').upsert(
        {
          task_id: taskId,
          explanation: data.explanation,
          answer: data.answer,
          post_test: data.post_test,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'task_id' }
      )
      if (error) console.error('Gagal menyimpan ai_responses:', error)
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

