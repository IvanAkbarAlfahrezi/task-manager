import { NextResponse } from 'next/server'
import { OfficeParser } from 'officeparser'
import { ai } from '@/lib/gemini'
import { supabaseAdmin, storageBucket } from '@/lib/supabaseAdmin'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

export const maxDuration = 60

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

const safeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
  let lastError: any = null
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Ekstrak dan tuliskan seluruh teks pada gambar ini (OCR), lalu berikan deskripsi singkat isi gambarnya. Jika tidak ada teks, cukup deskripsikan gambarnya secara ringkas.',
              },
              { inlineData: { mimeType, data: buffer.toString('base64') } },
            ],
          },
        ],
      })
      if (response.text) return response.text
    } catch (err: any) {
      lastError = err
      const msg = String(err?.message || '')
      if (!(msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429'))) break
    }
  }
  throw new Error(lastError?.message || 'Gagal menganalisis gambar')
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'File tidak ditemukan pada request' },
        { status: 400, headers: corsHeaders }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const fileName = file.name || 'material'
    const isImage = IMAGE_TYPES.includes(mimeType) || /\.(png|jpe?g|webp|gif)$/i.test(fileName)

    let text = ''
    try {
      if (isImage) {
        text = await extractFromImage(buffer, mimeType)
      } else if (/\.txt$/i.test(fileName)) {
        text = buffer.toString('utf-8')
      } else {
        const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${safeName(fileName)}`)
        await fs.writeFile(tmpPath, buffer)
        try {
          const ast = await OfficeParser.parseOffice(tmpPath, { extractAttachments: false })
          text = ((await ast.to('text')) as any).value || ''
        } finally {
          await fs.unlink(tmpPath).catch(() => {})
        }
      }
    } catch (err: any) {
      console.error('Gagal mengekstrak teks:', err)
      text = ''
    }

    let url = ''
    if (supabaseAdmin) {
      const path = `${Date.now()}-${safeName(fileName)}`
      const { error: uploadError } = await supabaseAdmin.storage
        .from(storageBucket)
        .upload(path, buffer, { contentType: mimeType, upsert: false })

      if (uploadError) {
        console.error('Gagal upload ke storage:', uploadError)
      } else {
        const { data: publicUrl } = supabaseAdmin.storage.from(storageBucket).getPublicUrl(path)
        url = publicUrl.publicUrl
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          fileName,
          url,
          type: isImage ? 'image' : 'document',
          mimeType,
          text: text.trim(),
        },
      },
      { headers: corsHeaders }
    )
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders })
  }
}
