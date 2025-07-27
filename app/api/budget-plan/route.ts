import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

interface BudgetPlan {
  id: number
  year: number
  month: number
  budget: number
  ratio: number
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2025"
    
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from("budget_plan")
      .select("*")
      .eq("year", parseInt(year))
      .order("month", { ascending: true })
    
    if (error) {
      console.error("Budget plan fetch error:", error)
      return NextResponse.json(
        { error: "예산 계획 데이터를 가져오는데 실패했습니다." },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: data || [],
      year: parseInt(year)
    })
    
  } catch (error) {
    console.error("Budget plan API error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year, month, budget, ratio } = body
    
    if (!year || !month || budget === undefined || ratio === undefined) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      )
    }
    
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from("budget_plan")
      .upsert({
        year: parseInt(year),
        month: parseInt(month),
        budget: parseInt(budget),
        ratio: parseFloat(ratio)
      })
      .select()
    
    if (error) {
      console.error("Budget plan upsert error:", error)
      return NextResponse.json(
        { error: "예산 계획 저장에 실패했습니다." },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: data?.[0] || null
    })
    
  } catch (error) {
    console.error("Budget plan POST API error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}