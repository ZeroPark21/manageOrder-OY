import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 8월 데이터만 직접 조회
    const { data: augustData, error: augustError } = await supabase
      .from("contents")
      .select(`
        publish_date,
        content_title,
        gmv,
        affiliate_items_sold,
        affiliate_orders
      `)
      .gte("publish_date", "2025-08-01")
      .lt("publish_date", "2025-09-01")
      .order("publish_date", { ascending: true })
      .limit(1000)
    
    if (augustError) {
      return NextResponse.json({ error: augustError.message }, { status: 500 })
    }
    
    // 날짜별 카운트
    const dateCount: { [key: string]: number } = {}
    const totalStats = {
      totalCount: 0,
      totalGmv: 0,
      totalItemsSold: 0,
      totalOrders: 0
    }
    
    if (augustData) {
      augustData.forEach((content) => {
        const date = new Date(content.publish_date).toISOString().split("T")[0]
        dateCount[date] = (dateCount[date] || 0) + 1
        
        totalStats.totalCount++
        totalStats.totalGmv += content.gmv || 0
        totalStats.totalItemsSold += content.affiliate_items_sold || 0
        totalStats.totalOrders += content.affiliate_orders || 0
      })
    }
    
    return NextResponse.json({
      augustDataCount: augustData?.length || 0,
      dateBreakdown: dateCount,
      totalStats,
      firstDate: augustData?.[0]?.publish_date,
      lastDate: augustData?.[augustData.length - 1]?.publish_date
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}