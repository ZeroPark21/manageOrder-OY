import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"
import { globalCache } from "@/lib/database/cache"

export const runtime = "edge"

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
    
    // Check cache first
    const cacheKey = `budget-plan-${year}`
    const cached = globalCache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('X-Cache', 'HIT')
      return response
    }
    
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from("budget_plan")
      .select("*")
      .eq("year", parseInt(year))
      .order("month", { ascending: true })
    
    if (error) {
      // If table doesn't exist, return default data
      if ((error as any).code === "42P01") {
        const defaultData = [
          { id: 1, year: 2025, month: 7, budget: 10000000, ratio: 10 },
          { id: 2, year: 2025, month: 8, budget: 15000000, ratio: 15 },
          { id: 3, year: 2025, month: 9, budget: 20000000, ratio: 20 },
          { id: 4, year: 2025, month: 10, budget: 20000000, ratio: 20 },
          { id: 5, year: 2025, month: 11, budget: 20000000, ratio: 20 },
          { id: 6, year: 2025, month: 12, budget: 15000000, ratio: 15 },
        ]
        
        const result = { data: defaultData }
        globalCache.set(cacheKey, result)
        
        const response = NextResponse.json(result)
        response.headers.set('X-Cache', 'DEFAULT')
        return response
      }
      
      console.error("Budget plan fetch error:", error)
      return NextResponse.json(
        { error: "예산 계획 데이터를 가져오는데 실패했습니다." },
        { status: 500 }
      )
    }
    
    const result = {
      success: true,
      data: data || [],
      year: parseInt(year)
    }
    
    // Store in cache
    globalCache.set(cacheKey, result)
    
    const response = NextResponse.json(result)
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
    return response
    
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