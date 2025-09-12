import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 8월 데이터를 페이지네이션으로 모두 조회
    let augustData: any[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
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
        .range(offset, offset + batchSize - 1)
      
      if (batchError) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError)
        if (offset === 0) {
          return NextResponse.json({ error: batchError.message }, { status: 500 })
        }
        break
      }
      
      if (batch && batch.length > 0) {
        augustData = [...augustData, ...batch]
        console.log(`📦 August batch ${Math.floor(offset / batchSize) + 1}: ${batch.length}개 (총 ${augustData.length}개)`)
        offset += batchSize
        
        if (batch.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    console.log(`📦 Total August data fetched: ${augustData.length}`)
    
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