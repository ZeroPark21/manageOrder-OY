import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const days = searchParams.get('days')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const dateRange = searchParams.get('dateRange')

    if (!companyId) {
      return NextResponse.json({ error: "회사 ID가 필요합니다" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let fromDateStr: string
    let toDateStr: string

    if (dateFrom && dateTo) {
      fromDateStr = dateFrom
      toDateStr = dateTo
    } else if (days === 'all') {
      fromDateStr = '2020-01-01'
      toDateStr = new Date().toISOString().split('T')[0]
    } else {
      const daysAgo = parseInt(dateRange || days || '30')
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - daysAgo)
      fromDateStr = fromDate.toISOString().split('T')[0]
      toDateStr = new Date().toISOString().split('T')[0]
    }

    // 데이터 가져오기
    const { data: reports, error } = await supabase
      .from('amazon_business_reports')
      .select('*')
      .eq('company_id', companyId)
      .gte('report_date', fromDateStr)
      .lte('report_date', toDateStr)
      .order('report_date', { ascending: true })

    if (error) {
      console.error("Error fetching reports:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 전환율 데이터 계산
    const conversionData = (reports || []).map(report => ({
      date: report.report_date,
      // 주문 아이템 세션 전환율 (이미 계산된 값)
      orderItemSessionPercentage: parseFloat(report.order_item_session_percentage) || 0,
      orderItemSessionPercentageB2B: parseFloat(report.order_item_session_percentage_b2b) || 0,
      // 유닛 세션 전환율
      unitSessionPercentage: parseFloat(report.unit_session_percentage) || 0,
      unitSessionPercentageB2B: parseFloat(report.unit_session_percentage_b2b) || 0,
      // Buy Box 비율 (경쟁력 지표)
      buyBoxPercentage: parseFloat(report.buy_box_percentage) || 0,
      buyBoxPercentageB2B: parseFloat(report.buy_box_percentage_b2b) || 0,
      // 세션 및 주문 데이터
      sessions: parseInt(report.sessions_total) || 0,
      orders: parseInt(report.total_order_items) || 0,
      units: parseInt(report.units_ordered) || 0,
      // 페이지 조회수
      pageViews: parseInt(report.page_views_total) || 0
    }))

    // 전체 평균 계산
    const totals = conversionData.reduce((acc, item) => {
      acc.totalSessions += item.sessions
      acc.totalOrders += item.orders
      acc.totalUnits += item.units
      acc.totalPageViews += item.pageViews
      return acc
    }, { totalSessions: 0, totalOrders: 0, totalUnits: 0, totalPageViews: 0 })

    const summary = {
      avgOrderItemSessionPercentage: totals.totalSessions > 0
        ? Math.round((totals.totalOrders / totals.totalSessions * 100) * 100) / 100
        : 0,
      avgUnitSessionPercentage: totals.totalSessions > 0
        ? Math.round((totals.totalUnits / totals.totalSessions * 100) * 100) / 100
        : 0,
      totalSessions: totals.totalSessions,
      totalOrders: totals.totalOrders,
      totalUnits: totals.totalUnits,
      totalPageViews: totals.totalPageViews
    }

    return NextResponse.json({
      conversionData,
      summary
    })

  } catch (error) {
    console.error("Conversion API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다"
      },
      { status: 500 }
    )
  }
}
