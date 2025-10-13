import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 쿠키에서 세션 토큰 가져오기
  const accessToken = request.cookies.get('sb-access-token')?.value
  const refreshToken = request.cookies.get('sb-refresh-token')?.value
  const hasToken = !!(accessToken || refreshToken)

  // 로그인 페이지 처리
  if (pathname === '/login') {
    // 이미 로그인한 사용자는 업체 선택 페이지로
    if (hasToken) {
      return NextResponse.redirect(new URL('/select-company', request.url))
    }
    // 로그인 안한 사용자는 로그인 페이지 표시
    return NextResponse.next()
  }

  // 회원가입 페이지는 로그인 없이 접근 가능
  if (pathname === '/signup') {
    // 이미 로그인한 사용자는 업체 선택 페이지로
    if (hasToken) {
      return NextResponse.redirect(new URL('/select-company', request.url))
    }
    return NextResponse.next()
  }

  // 로그인이 필요한 모든 페이지
  if (!hasToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 루트 경로 처리 - 연결된 업체가 1개면 자동 리다이렉트
  if (pathname === '/') {
    if (accessToken && refreshToken) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // 사용자의 업체 목록 조회
          const { data: userCompanies } = await supabase
            .from('user_companies')
            .select('company_id, is_default')
            .eq('user_id', user.id)

          if (userCompanies) {
            // 업체가 1개만 있으면 자동 리다이렉트
            if (userCompanies.length === 1) {
              return NextResponse.redirect(new URL(`/dashboard/${userCompanies[0].company_id}`, request.url))
            }

            // 여러 업체 중 기본 업체가 설정되어 있으면 해당 업체로
            const defaultCompany = userCompanies.find(uc => uc.is_default)
            if (defaultCompany) {
              return NextResponse.redirect(new URL(`/dashboard/${defaultCompany.company_id}`, request.url))
            }
          }
        }
      } catch (error) {
        console.error('Error checking user companies:', error)
      }
    }

    // 업체가 여러 개이거나 에러가 있으면 선택 페이지로
    return NextResponse.redirect(new URL('/select-company', request.url))
  }

  // 업체 선택 페이지는 그대로 표시
  if (pathname === '/select-company') {
    return NextResponse.next()
  }

  // 업체별 페이지 권한 검증 (/dashboard/1001, /dashboard/1001/amazon/overview 등)
  const companyMatch = pathname.match(/^\/dashboard\/(\d+)/)
  if (companyMatch && accessToken && refreshToken) {
    const companyId = parseInt(companyMatch[1])
    console.log(`[Middleware] Checking access to company ${companyId} for path ${pathname}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
      // 세션 설정
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        console.log('[Middleware] Session error:', sessionError)
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // 사용자 정보 가져오기 (세션 설정 후 getUser 호출)
      const { data: { user } } = await supabase.auth.getUser()
      console.log(`[Middleware] User: ${user?.id}, ${user?.email}`)

      if (!user) {
        console.log('[Middleware] No user found, redirecting to login')
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // 먼저 사용자의 전체 권한 확인 (admin 체크)
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id, role')
        .eq('user_id', user.id)

      // admin 권한이 있는지 확인
      const hasAdminRole = userCompanies?.some(uc => uc.role === 'admin')
      let userRole = 'viewer'

      if (hasAdminRole) {
        console.log(`[Middleware] User has admin role - granting access to company ${companyId}`)
        // admin은 모든 회사 접근 가능
        userRole = 'admin'
      } else {
        // admin이 아니면 해당 회사 권한 확인
        const { data: userCompany, error } = await supabase
          .from('user_companies')
          .select('id, company_id, role')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .single()

        console.log(`[Middleware] User company check:`, { userCompany, error })

        if (!userCompany) {
          console.log(`[Middleware] No access to company ${companyId}, redirecting to select-company`)
          // 권한 없으면 업체 선택 페이지로
          return NextResponse.redirect(new URL('/select-company', request.url))
        }

        userRole = userCompany.role || 'viewer'
      }

      console.log(`[Middleware] User role: ${userRole}`)

      // 업로드 페이지는 editor 이상만 접근 가능
      if (pathname.includes('/upload') && userRole === 'viewer') {
        console.log(`[Middleware] Access denied to upload page for viewer role`)
        // 권한 없음 페이지로 리다이렉트 (또는 이전 페이지로)
        return NextResponse.redirect(new URL(`/dashboard/${companyId}`, request.url))
      }

      console.log(`[Middleware] Access granted to company ${companyId} with role ${userRole}`)
    } catch (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/.*|_next/static|_next/image|favicon.ico).*)',
  ],
}