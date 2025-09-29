import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API 레벨에서 사용자의 회사 접근 권한을 검증하는 유틸리티
 */
export async function verifyCompanyAccess(
  request: NextRequest,
  companyId: number | string
): Promise<{ isValid: boolean; error?: NextResponse; userId?: string }> {
  try {
    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      // 쿠키에서 토큰 시도
      const cookieHeader = request.headers.get('cookie')
      const cookies = parseCookies(cookieHeader || '')
      const accessToken = cookies['sb-access-token']

      if (!accessToken) {
        return {
          isValid: false,
          error: NextResponse.json(
            { error: '인증 토큰이 없습니다' },
            { status: 401 }
          )
        }
      }

      // 쿠키 토큰으로 사용자 확인
      const { data: { user }, error } = await supabase.auth.getUser(accessToken)

      if (error || !user) {
        return {
          isValid: false,
          error: NextResponse.json(
            { error: '유효하지 않은 인증 토큰입니다' },
            { status: 401 }
          )
        }
      }

      // 사용자의 회사 접근 권한 확인
      const { data: userCompany, error: companyError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single()

      if (companyError || !userCompany) {
        return {
          isValid: false,
          error: NextResponse.json(
            { error: '해당 회사에 대한 접근 권한이 없습니다' },
            { status: 403 }
          )
        }
      }

      return {
        isValid: true,
        userId: user.id
      }
    }

    // Bearer 토큰으로 사용자 확인
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: '유효하지 않은 인증 토큰입니다' },
          { status: 401 }
        )
      }
    }

    // 사용자의 회사 접근 권한 확인
    const { data: userCompany, error: companyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single()

    if (companyError || !userCompany) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: '해당 회사에 대한 접근 권한이 없습니다' },
          { status: 403 }
        )
      }
    }

    return {
      isValid: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Company access verification error:', error)
    return {
      isValid: false,
      error: NextResponse.json(
        { error: '권한 검증 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }
  }
}

/**
 * 쿠키 문자열을 파싱하여 객체로 변환
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })
  return cookies
}

/**
 * API 라우트에서 사용하기 쉬운 래퍼 함수
 */
export async function withCompanyAuth<T>(
  request: NextRequest,
  handler: (userId: string, companyId: number) => Promise<T>
): Promise<NextResponse | T> {
  // URL에서 companyId 추출
  const url = new URL(request.url)
  const companyId = url.searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json(
      { error: 'companyId 파라미터가 필요합니다' },
      { status: 400 }
    )
  }

  // 권한 검증
  const { isValid, error, userId } = await verifyCompanyAccess(request, companyId)

  if (!isValid || error) {
    return error || NextResponse.json(
      { error: '권한 검증에 실패했습니다' },
      { status: 403 }
    )
  }

  // 핸들러 실행
  return handler(userId!, parseInt(companyId))
}