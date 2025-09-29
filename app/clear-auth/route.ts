import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/database/supabase'

export async function GET() {
  const supabase = createServerClient()

  // 세션 클리어
  await supabase.auth.signOut()

  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))

  // 모든 인증 관련 쿠키 삭제
  response.cookies.delete('access-token')
  response.cookies.delete('refresh-token')

  return response
}