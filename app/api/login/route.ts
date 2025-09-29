import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // request.url이 undefined일 경우 대비
  const baseUrl = request.url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }

  if (data.user) {
    const response = NextResponse.redirect(new URL("/select-company", baseUrl));

    // 세션 쿠키 설정
    if (data.session) {
      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  }

  return NextResponse.redirect(new URL("/login", baseUrl));
}
