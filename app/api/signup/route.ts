import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { email, password, companyName } = await request.json()

  // 유효성 검사
  if (!email || !password || !companyName) {
    return NextResponse.json(
      { error: "모든 필드를 입력해주세요" },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (authError) {
      console.error("Auth error:", authError)

      // 이미 존재하는 이메일인 경우
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "이미 등록된 이메일입니다" },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "사용자 생성에 실패했습니다" },
        { status: 500 }
      )
    }

    // 2. Service Role Key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log("Using Service Role Key:", serviceRoleKey ? "Yes" : "No")

    // Service Role Key로 별도 클라이언트 생성 (RLS 우회)
    const adminSupabase = serviceRoleKey
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // companies 테이블의 다음 ID 가져오기
    const { data: maxIdData } = await adminSupabase
      .from("companies")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .single()

    const nextCompanyId = maxIdData ? maxIdData.id + 1 : 1001

    // 3. 회사가 이미 존재하는지 확인 (대소문자 구분 없이)
    console.log("Checking for existing company:", companyName.trim())
    const { data: existingCompany, error: searchError } = await adminSupabase
      .from("companies")
      .select("id")
      .ilike('name', companyName.trim())
      .single()

    if (searchError && searchError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected if company doesn't exist
      console.error("Error searching for company:", searchError)
    }

    let companyId: number

    if (existingCompany) {
      // 기존 회사가 있으면 그 회사 사용
      console.log("Found existing company with ID:", existingCompany.id)
      companyId = existingCompany.id
    } else {
      // 새로운 회사 생성 (ID 명시적으로 지정)
      console.log("Creating new company with ID:", nextCompanyId, "Name:", companyName.trim())
      const { data: newCompany, error: companyError } = await adminSupabase
        .from("companies")
        .insert({
          id: nextCompanyId,
          name: companyName.trim()
        })
        .select()
        .single()

      if (companyError || !newCompany) {
        console.error("Company creation error:", companyError)
        console.error("Company data:", newCompany)
        // 회사 생성 실패해도 계속 진행 (나중에 admin이 수동으로 처리)
        return NextResponse.json(
          {
            error: "회원가입은 완료되었지만 회사 등록에 실패했습니다. 관리자에게 문의해주세요.",
            partial: true
          },
          { status: 207 }
        )
      }

      console.log("Created new company with ID:", newCompany.id)
      companyId = newCompany.id
    }

    // 4. user_companies 테이블에 회사 연결 정보 추가
    console.log("Inserting user_companies record:", {
      user_id: authData.user.id,
      company_id: companyId,
      role: "editor",
      is_default: true
    })

    // Service Role Key를 사용하여 RLS 우회
    const { data: userCompanyData, error: userCompanyError } = await adminSupabase
      .from("user_companies")
      .insert({
        user_id: authData.user.id,
        company_id: companyId,
        role: "editor",
        is_default: true
      })
      .select()

    if (userCompanyError) {
      console.error("User company insert failed:", userCompanyError)
      console.log("⚠️ RLS 정책으로 인해 user_companies 삽입 실패")
      console.log("해결 방법:")
      console.log("1. Supabase Dashboard → SQL Editor에서 실행:")
      console.log(`   INSERT INTO user_companies (user_id, company_id, role, is_default)`)
      console.log(`   VALUES ('${authData.user.id}', ${companyId}, 'editor', true);`)
      console.log("2. 또는 RLS 정책 수정:")
      console.log("   CREATE POLICY \"Allow inserts during signup\" ON user_companies FOR INSERT WITH CHECK (true);")
    } else {
      console.log("✅ User company created successfully:", userCompanyData)
    }

    // 5. 자동 로그인 처리
    console.log("Attempting auto-login...")

    // Admin 클라이언트로 이메일 확인 처리 (Service Role Key 필요)
    if (serviceRoleKey) {
      const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(
        authData.user.id,
        { email_confirm: true }
      )

      if (confirmError) {
        console.error("Failed to confirm email:", confirmError)
      } else {
        console.log("Email confirmed successfully")
      }
    }

    // 로그인 시도
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError || !signInData.session) {
      console.error("Auto-login failed:", signInError)
      // 로그인 실패해도 회원가입은 성공
      return NextResponse.json({
        success: true,
        message: "회원가입이 완료되었습니다. 로그인 페이지에서 로그인해주세요.",
        autoLogin: false,
        needsLogin: true,
        companyId: companyId,
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      })
    }

    // 6. 쿠키에 세션 저장
    console.log("Setting session cookies...")
    const cookieStore = await cookies()

    cookieStore.set('sb-access-token', signInData.session.access_token, {
      httpOnly: false, // Changed to allow JavaScript access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7일
    })

    cookieStore.set('sb-refresh-token', signInData.session.refresh_token, {
      httpOnly: false, // Changed to allow JavaScript access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30일
    })

    // 7. 성공 응답 (자동 로그인 완료)
    console.log("Signup and auto-login completed successfully")
    return NextResponse.json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      autoLogin: true, // 자동 로그인 성공!
      companyId: companyId,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}