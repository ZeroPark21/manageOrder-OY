import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "daily" // daily, weekly, monthly
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const campaignId = searchParams.get("campaignId")

    const supabase = createServerClient()

    // 뷰 선택
    let tableName = "gmv_daily_summary"
    let dateColumn = "gmv_date"
    
    switch (view) {
      case "weekly":
        tableName = "gmv_weekly_summary"
        dateColumn = "week_start"
        break
      case "monthly":
        tableName = "gmv_monthly_summary"
        dateColumn = "month_start"
        break
    }

    // 기본 쿼리 빌드
    let query = supabase
      .from(tableName)
      .select(`
        ${dateColumn},
        campaign_id,
        campaign_name,
        video_count,
        creator_count,
        total_gmv,
        total_orders,
        total_ad_spend,
        total_impressions,
        total_clicks,
        avg_click_rate,
        avg_conversion_rate,
        roi
      `)
      .order(dateColumn, { ascending: true })

    // 날짜 필터
    if (startDate) {
      query = query.gte(dateColumn, startDate)
    }
    if (endDate) {
      query = query.lte(dateColumn, endDate)
    }

    // 캠페인 필터
    if (campaignId) {
      query = query.eq("campaign_id", campaignId)
    }

    const { data, error } = await query

    if (error) {
      console.error("GMV trends query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 전체 통계 계산
    const totalStats = data?.reduce((acc: any, row: any) => ({
      totalGMV: acc.totalGMV + (row.total_gmv || 0),
      totalOrders: acc.totalOrders + (row.total_orders || 0),
      totalAdSpend: acc.totalAdSpend + (row.total_ad_spend || 0),
      totalImpressions: acc.totalImpressions + (row.total_impressions || 0),
      totalClicks: acc.totalClicks + (row.total_clicks || 0),
    }), {
      totalGMV: 0,
      totalOrders: 0,
      totalAdSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgROI: 0,
      avgCTR: 0,
      avgCVR: 0,
    }) || {}

    // 평균 계산
    if (totalStats.totalAdSpend > 0) {
      totalStats.avgROI = totalStats.totalGMV / totalStats.totalAdSpend
    }
    if (totalStats.totalImpressions > 0) {
      totalStats.avgCTR = (totalStats.totalClicks / totalStats.totalImpressions) * 100
    }
    if (totalStats.totalClicks > 0) {
      totalStats.avgCVR = (totalStats.totalOrders / totalStats.totalClicks) * 100
    }

    return NextResponse.json({
      data: data || [],
      stats: totalStats,
      view,
      period: { startDate, endDate }
    })
  } catch (err: any) {
    console.error("API /api/gmv-trends error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

// 데이터 집계 상태 조회
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "get-collection-status") {
      const supabase = createServerClient()
      
      // 최근 수집 로그 조회
      const { data: logs, error } = await supabase
        .from("gmv_collection_logs")
        .select("*")
        .order("target_date", { ascending: false })
        .limit(30)

      if (error) {
        throw error
      }

      // 누락된 날짜 확인
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)

      const missingDates = []
      const currentDate = new Date(thirtyDaysAgo)
      
      while (currentDate < today) {
        const dateStr = currentDate.toISOString().split("T")[0]
        const hasData = logs?.some(log => 
          log.target_date === dateStr && log.status === "completed"
        )
        
        if (!hasData) {
          missingDates.push(dateStr)
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return NextResponse.json({
        logs: logs || [],
        missingDates,
        lastSuccessfulCollection: logs?.find(log => log.status === "completed")?.target_date
      })
    }

    // Materialized View 새로고침
    if (action === "refresh-views") {
      const supabase = createServerClient()
      const { error } = await supabase.rpc("refresh_gmv_materialized_views")
      
      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, message: "Views refreshed successfully" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("API /api/gmv-trends POST error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}