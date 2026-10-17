import { NextResponse } from 'next/server'

export function checkAuth(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  const validKey = process.env.BACKEND_API_KEY || 'secret123'
  
  if (!apiKey || apiKey !== validKey) {
    return false
  }
  return true
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401, headers: corsHeaders }
  )
}
