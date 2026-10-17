import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET() {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
  return NextResponse.json({ success: true, data }, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Validate required fields
    if (!body.company || !body.position) {
      return NextResponse.json(
        { success: false, error: 'company dan position wajib diisi' },
        { status: 400, headers: corsHeaders }
      )
    }
    const payload = {
      company: body.company,
      position: body.position,
      status: body.status || 'wishlist',
      job_description: body.job_description || null,
      location: body.location || null,
      apply_date: body.apply_date || null,
      interview_date: body.interview_date || null,
      notes: body.notes || null,
      source_url: body.source_url || null,
    }
    const { data, error } = await supabase
      .from('applications')
      .insert([payload])
      .select()
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }
    return NextResponse.json({ success: true, data }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    const body = await request.json()
    const { data, error } = await supabase
      .from('applications')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }
    return NextResponse.json({ success: true, data }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    const { error } = await supabase.from('applications').delete().eq('id', id)
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
