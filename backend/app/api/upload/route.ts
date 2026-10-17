import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400, headers: corsHeaders })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let extractedText = ''

    const mime = file.type || ''
    const name = file.name.toLowerCase()

    if (mime.includes('image') || name.match(/\.(png|jpg|jpeg|webp)$/)) {
      extractedText = `[File Gambar: ${file.name}]`
    } else if (mime.includes('pdf') || name.endsWith('.pdf')) {
      extractedText = `[File PDF: ${file.name}]`
    } else if (
      name.endsWith('.docx') ||
      name.endsWith('.doc') ||
      name.endsWith('.pptx') ||
      name.endsWith('.xlsx')
    ) {
      try {
        const officeparser = await import('officeparser')
        const result = await officeparser.parseOffice(buffer)
        extractedText = typeof result === 'string' ? result : JSON.stringify(result)
      } catch (err: any) {
        extractedText = `[Gagal parsing file office: ${err.message}]`
      }
    } else {
      extractedText = buffer.toString('utf-8')
    }

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('materials')
      .upload(safeName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    let publicUrl = ''
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('materials').getPublicUrl(uploadData.path)
      publicUrl = urlData.publicUrl
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          fileName: file.name,
          url: publicUrl,
          type: file.type || 'unknown',
          text: extractedText,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

