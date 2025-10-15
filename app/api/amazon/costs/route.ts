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

    // dateFrom/dateTo가 있으면 그것을 사용, 없으면 days 또는 dateRange 사용
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

    // 주문당 비용 계산
    const costPerOrderData = (reports || []).map(report => {
      const totalOrders = parseInt(report.total_order_items) || 0
      const totalRevenue = parseFloat(report.ordered_product_sales) || 0
      const shippedOrders = parseInt(report.orders_shipped) || 0
      const shippedRevenue = parseFloat(report.shipped_product_sales) || 0

      return {
        date: report.report_date,
        // 주문 아이템당 평균 판매량 (이미 계산된 값)
        costPerOrderItem: parseFloat(report.avg_sales_per_order_item) || 0,
        // 배송된 주문당 비용
        costPerShippedOrder: shippedOrders > 0 ? Math.round((shippedRevenue / shippedOrders) * 100) / 100 : 0,
        // 전체 주문당 평균 비용
        avgCostPerOrder: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        shippedOrders,
        shippedRevenue: Math.round(shippedRevenue * 100) / 100
      }
    })

    // 전체 평균 계산
    const totals = costPerOrderData.reduce((acc, item) => {
      acc.totalRevenue += item.totalRevenue
      acc.totalOrders += item.totalOrders
      acc.shippedRevenue += item.shippedRevenue
      acc.shippedOrders += item.shippedOrders
      return acc
    }, { totalRevenue: 0, totalOrders: 0, shippedRevenue: 0, shippedOrders: 0 })

    const summary = {
      avgCostPerOrder: totals.totalOrders > 0
        ? Math.round((totals.totalRevenue / totals.totalOrders) * 100) / 100
        : 0,
      avgCostPerShippedOrder: totals.shippedOrders > 0
        ? Math.round((totals.shippedRevenue / totals.shippedOrders) * 100) / 100
        : 0,
      totalOrders: totals.totalOrders,
      totalRevenue: Math.round(totals.totalRevenue * 100) / 100
    }

    return NextResponse.json({
      costPerOrderData,
      summary
    })

  } catch (error) {
    console.error("Costs API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다"
      },
      { status: 500 }
    )
  }
}
