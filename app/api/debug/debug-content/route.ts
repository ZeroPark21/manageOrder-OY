import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 8월 콘텐츠 데이터 확인
    const { data: augustData, error: augustError } = await supabase
      .from("contents")
      .select("publish_date, content_title")
      .gte("publish_date", "2025-08-01")
      .lt("publish_date", "2025-09-01")
      .order("publish_date", { ascending: true })
      // 디버그용이므로 제한 제거
    
    // 8월 총 개수 확인
    const { count: augustCount, error: countError } = await supabase
      .from("contents")
      .select("*", { count: 'exact', head: true })
      .gte("publish_date", "2025-08-01")
      .lt("publish_date", "2025-09-01")
    
    // 전체 월별 카운트
    const { data: allData, error: allError } = await supabase
      .from("contents")
      .select("publish_date")
    
    const monthCount: { [key: string]: number } = {}
    if (allData) {
      allData.forEach((item) => {
        const month = item.publish_date.substring(0, 7)
        monthCount[month] = (monthCount[month] || 0) + 1
      })
    }
    
    return NextResponse.json({
      augustSamples: augustData,
      augustSampleCount: augustData?.length || 0,
      augustTotalCount: augustCount || 0,
      monthlyCount: monthCount,
      errors: {
        august: augustError?.message,
        all: allError?.message
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}