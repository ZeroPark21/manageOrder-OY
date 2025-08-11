import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 7월 21일 이후 콘텐츠 직접 확인
    const { data: afterJuly21, count: afterCount } = await supabase
      .from("contents")
      .select("*", { count: 'exact' })
      .gte("publish_date", "2025-07-21")
      .order("publish_date", { ascending: true })
    
    // 8월 데이터만 확인
    const { data: augustData, count: augustCount } = await supabase
      .from("contents")
      .select("*", { count: 'exact' })
      .gte("publish_date", "2025-08-01")
      .lt("publish_date", "2025-09-01")
    
    // 주별로 그룹화
    const weeklyData: { [key: string]: number } = {}
    if (afterJuly21) {
      afterJuly21.forEach((content: any) => {
        const date = new Date(content.publish_date)
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay())
        const weekKey = startOfWeek.toISOString().split("T")[0]
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
      })
    }
    
    return NextResponse.json({
      totalAfterJuly21: afterCount,
      augustCount: augustCount,
      weeklyBreakdown: weeklyData,
      sampleData: afterJuly21?.slice(0, 5).map((c: any) => ({
        publish_date: c.publish_date,
        content_title: c.content_title
      })),
      lastDateInData: afterJuly21?.[afterJuly21.length - 1]?.publish_date
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}