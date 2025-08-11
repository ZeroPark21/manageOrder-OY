import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 전체 범위 확인
    const { data: allData, error: allError } = await supabase
      .from("contents")
      .select("publish_date")
      .order("publish_date", { ascending: true })
    
    // 7월 21일 이후 데이터 확인
    const { data: afterJuly21, count: afterJuly21Count } = await supabase
      .from("contents")
      .select("publish_date", { count: 'exact' })
      .gt("publish_date", "2025-07-21")
      .order("publish_date", { ascending: true })
      .limit(10)
    
    if (!allData || allError) {
      return NextResponse.json({ error: allError?.message || "No data" }, { status: 500 })
    }
    
    // 첫 번째와 마지막 날짜
    const firstDate = allData[0]?.publish_date
    const lastDate = allData[allData.length - 1]?.publish_date
    
    // 2025-06-01부터 2025-12-31까지의 데이터
    const { data: filteredData, error: filteredError } = await supabase
      .from("contents")
      .select("publish_date")
      .gte("publish_date", "2025-06-01")
      .lte("publish_date", "2025-12-31")
      .order("publish_date", { ascending: true })
    
    // 월별 카운트
    const monthCount: { [key: string]: number } = {}
    if (filteredData) {
      filteredData.forEach((item) => {
        const month = new Date(item.publish_date).toISOString().substring(0, 7)
        monthCount[month] = (monthCount[month] || 0) + 1
      })
    }
    
    // 2025-08-01부터 2025-08-31까지 데이터 확인
    const { data: augustData, count: augustCount } = await supabase
      .from("contents")
      .select("publish_date", { count: 'exact' })
      .gte("publish_date", "2025-08-01")
      .lt("publish_date", "2025-09-01")
      .limit(5)
    
    return NextResponse.json({
      totalContents: allData.length,
      dateRange: {
        first: firstDate,
        last: lastDate
      },
      filteredCount: filteredData?.length || 0,
      monthlyBreakdown: monthCount,
      augustCheck: {
        count: augustCount,
        samples: augustData
      },
      afterJuly21: {
        count: afterJuly21Count,
        samples: afterJuly21
      },
      error: filteredError?.message
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}