import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const days = searchParams.get('days')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

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

    // dateFrom/dateTo가 있으면 그것을 사용, 없으면 days 사용
    if (dateFrom && dateTo) {
      fromDateStr = dateFrom
      toDateStr = dateTo
    } else if (days === 'all') {
      // 모든 데이터 가져오기
      fromDateStr = '2020-01-01'
      toDateStr = new Date().toISOString().split('T')[0]
    } else {
      // days 파라미터 사용 (기본값 30)
      const daysAgo = parseInt(days || '30')
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - daysAgo)
      fromDateStr = fromDate.toISOString().split('T')[0]
      toDateStr = new Date().toISOString().split('T')[0]
    }

    // 날짜 범위 계산 (비교용 이전 기간)
    const currentFrom = new Date(fromDateStr)
    const currentTo = new Date(toDateStr)
    const daysDiff = Math.ceil((currentTo.getTime() - currentFrom.getTime()) / (1000 * 60 * 60 * 24))

    const prevToDate = new Date(currentFrom)
    prevToDate.setDate(prevToDate.getDate() - 1)
    const prevFromDate = new Date(prevToDate)
    prevFromDate.setDate(prevFromDate.getDate() - daysDiff)

    const prevFromDateStr = prevFromDate.toISOString().split('T')[0]
    const prevToDateStr = prevToDate.toISOString().split('T')[0]

    // 현재 기간 데이터 가져오기
    const { data: currentReports, error: currentError } = await supabase
      .from('amazon_business_reports')
      .select('*')
      .eq('company_id', companyId)
      .gte('report_date', fromDateStr)
      .lte('report_date', toDateStr)
      .order('report_date', { ascending: true })

    if (currentError) {
      console.error("Error fetching current reports:", currentError)
      return NextResponse.json({ error: currentError.message }, { status: 500 })
    }

    // 이전 기간 데이터 가져오기 (비교용)
    const { data: prevReports, error: prevError } = await supabase
      .from('amazon_business_reports')
      .select('*')
      .eq('company_id', companyId)
      .gte('report_date', prevFromDateStr)
      .lt('report_date', prevToDateStr)

    if (prevError) {
      console.error("Error fetching previous reports:", prevError)
      return NextResponse.json({ error: prevError.message }, { status: 500 })
    }

    // 메트릭 계산 함수
    const calculateMetrics = (reports: any[]) => {
      const orderedProductSales = reports.reduce((sum, r) => sum + (parseFloat(r.ordered_product_sales) || 0), 0)
      const unitsOrdered = reports.reduce((sum, r) => sum + (parseInt(r.units_ordered) || 0), 0)
      const totalOrderItems = reports.reduce((sum, r) => sum + (parseInt(r.total_order_items) || 0), 0)
      const ordersShipped = reports.reduce((sum, r) => sum + (parseInt(r.orders_shipped) || 0), 0)
      const unitsShipped = reports.reduce((sum, r) => sum + (parseInt(r.units_shipped) || 0), 0)
      const unitsRefunded = reports.reduce((sum, r) => sum + (parseInt(r.units_refunded) || 0), 0)
      const pageViewsMobile = reports.reduce((sum, r) => sum + (parseInt(r.page_views_mobile) || 0), 0)
      const pageViewsBrowser = reports.reduce((sum, r) => sum + (parseInt(r.page_views_browser) || 0), 0)

      const avgSalesPerOrderItem = totalOrderItems > 0 ? orderedProductSales / totalOrderItems : 0
      const avgSellingPrice = unitsOrdered > 0 ? orderedProductSales / unitsOrdered : 0
      const refundRate = unitsOrdered > 0 ? (unitsRefunded / unitsOrdered * 100) : 0

      return {
        orderedProductSales: Math.round(orderedProductSales * 100) / 100,
        unitsOrdered,
        totalOrderItems,
        avgSalesPerOrderItem: Math.round(avgSalesPerOrderItem * 100) / 100,
        avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
        pageViewsMobile,
        pageViewsBrowser,
        pageViewsTotal: pageViewsMobile + pageViewsBrowser,
        unitsRefunded,
        refundRate: Math.round(refundRate * 100) / 100,
        unitsShipped,
        ordersShipped,
      }
    }

    const currentMetrics = calculateMetrics(currentReports || [])
    const prevMetrics = calculateMetrics(prevReports || [])

    // 변화율 계산
    const calculateChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0
      return Math.round(((current - prev) / prev) * 100 * 10) / 10
    }

    // 일별 판매 추이 (모든 지표 포함)
    const dailySales = (currentReports || []).map(report => ({
      date: report.report_date,
      orderedProductSales: Math.round((parseFloat(report.ordered_product_sales) || 0) * 100) / 100,
      unitsOrdered: parseInt(report.units_ordered) || 0,
      totalOrderItems: parseInt(report.total_order_items) || 0,
      avgSalesPerOrderItem: parseFloat(report.avg_sales_per_order_item) || 0,
      avgSellingPrice: parseFloat(report.avg_selling_price) || 0,
      pageViewsMobile: parseInt(report.page_views_mobile) || 0,
      pageViewsBrowser: parseInt(report.page_views_browser) || 0,
      pageViewsTotal: parseInt(report.page_views_total) || 0,
      unitsRefunded: parseInt(report.units_refunded) || 0,
      refundRate: parseFloat(report.refund_rate) || 0,
      unitsShipped: parseInt(report.units_shipped) || 0,
      ordersShipped: parseInt(report.orders_shipped) || 0,
    }))

    // Weekly 데이터 집계 (월요일 기준)
    const weeklySales: Record<string, any> = {}
    dailySales.forEach(day => {
      const date = new Date(day.date)
      // 월요일 기준 주 시작일 계산
      const dayOfWeek = date.getDay() // 0=일, 1=월, ..., 6=토
      const daysToMonday = (dayOfWeek + 6) % 7 // 월요일까지의 일수
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - daysToMonday) // 월요일로 설정
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklySales[weekKey]) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // 일요일까지
        weeklySales[weekKey] = {
          week: weekKey,
          dateRange: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
          orderedProductSales: 0,
          unitsOrdered: 0,
          totalOrderItems: 0,
          pageViewsMobile: 0,
          pageViewsBrowser: 0,
          pageViewsTotal: 0,
          unitsRefunded: 0,
          unitsShipped: 0,
          ordersShipped: 0,
          days: 0,
        }
      }

      weeklySales[weekKey].orderedProductSales += day.orderedProductSales
      weeklySales[weekKey].unitsOrdered += day.unitsOrdered
      weeklySales[weekKey].totalOrderItems += day.totalOrderItems
      weeklySales[weekKey].pageViewsMobile += day.pageViewsMobile
      weeklySales[weekKey].pageViewsBrowser += day.pageViewsBrowser
      weeklySales[weekKey].pageViewsTotal += day.pageViewsTotal
      weeklySales[weekKey].unitsRefunded += day.unitsRefunded
      weeklySales[weekKey].unitsShipped += day.unitsShipped
      weeklySales[weekKey].ordersShipped += day.ordersShipped
      weeklySales[weekKey].days += 1
    })

    const weeklyData = Object.values(weeklySales).map((week: any) => ({
      ...week,
      orderedProductSales: Math.round(week.orderedProductSales * 100) / 100,
      avgSalesPerOrderItem: week.totalOrderItems > 0 ? Math.round((week.orderedProductSales / week.totalOrderItems) * 100) / 100 : 0,
      avgSellingPrice: week.unitsOrdered > 0 ? Math.round((week.orderedProductSales / week.unitsOrdered) * 100) / 100 : 0,
      refundRate: week.unitsOrdered > 0 ? Math.round((week.unitsRefunded / week.unitsOrdered * 100) * 100) / 100 : 0,
    }))

    // Monthly 데이터 집계
    const monthlySales: Record<string, any> = {}
    dailySales.forEach(day => {
      const date = new Date(day.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlySales[monthKey]) {
        monthlySales[monthKey] = {
          month: monthKey,
          monthName: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
          orderedProductSales: 0,
          unitsOrdered: 0,
          totalOrderItems: 0,
          pageViewsMobile: 0,
          pageViewsBrowser: 0,
          pageViewsTotal: 0,
          unitsRefunded: 0,
          unitsShipped: 0,
          ordersShipped: 0,
          days: 0,
        }
      }

      monthlySales[monthKey].orderedProductSales += day.orderedProductSales
      monthlySales[monthKey].unitsOrdered += day.unitsOrdered
      monthlySales[monthKey].totalOrderItems += day.totalOrderItems
      monthlySales[monthKey].pageViewsMobile += day.pageViewsMobile
      monthlySales[monthKey].pageViewsBrowser += day.pageViewsBrowser
      monthlySales[monthKey].pageViewsTotal += day.pageViewsTotal
      monthlySales[monthKey].unitsRefunded += day.unitsRefunded
      monthlySales[monthKey].unitsShipped += day.unitsShipped
      monthlySales[monthKey].ordersShipped += day.ordersShipped
      monthlySales[monthKey].days += 1
    })

    const monthlyData = Object.values(monthlySales).map((month: any) => ({
      ...month,
      orderedProductSales: Math.round(month.orderedProductSales * 100) / 100,
      avgSalesPerOrderItem: month.totalOrderItems > 0 ? Math.round((month.orderedProductSales / month.totalOrderItems) * 100) / 100 : 0,
      avgSellingPrice: month.unitsOrdered > 0 ? Math.round((month.orderedProductSales / month.unitsOrdered) * 100) / 100 : 0,
      refundRate: month.unitsOrdered > 0 ? Math.round((month.unitsRefunded / month.unitsOrdered * 100) * 100) / 100 : 0,
    }))

    const response = {
      metrics: {
        orderedProductSales: {
          value: currentMetrics.orderedProductSales,
          change: calculateChange(currentMetrics.orderedProductSales, prevMetrics.orderedProductSales)
        },
        unitsOrdered: {
          value: currentMetrics.unitsOrdered,
          change: calculateChange(currentMetrics.unitsOrdered, prevMetrics.unitsOrdered)
        },
        totalOrderItems: {
          value: currentMetrics.totalOrderItems,
          change: calculateChange(currentMetrics.totalOrderItems, prevMetrics.totalOrderItems)
        },
        avgSalesPerOrderItem: {
          value: currentMetrics.avgSalesPerOrderItem,
          change: calculateChange(currentMetrics.avgSalesPerOrderItem, prevMetrics.avgSalesPerOrderItem)
        },
        avgSellingPrice: {
          value: currentMetrics.avgSellingPrice,
          change: calculateChange(currentMetrics.avgSellingPrice, prevMetrics.avgSellingPrice)
        },
        pageViewsTotal: {
          value: currentMetrics.pageViewsTotal,
          change: calculateChange(currentMetrics.pageViewsTotal, prevMetrics.pageViewsTotal)
        },
        pageViewsMobile: {
          value: currentMetrics.pageViewsMobile,
          change: calculateChange(currentMetrics.pageViewsMobile, prevMetrics.pageViewsMobile)
        },
        pageViewsBrowser: {
          value: currentMetrics.pageViewsBrowser,
          change: calculateChange(currentMetrics.pageViewsBrowser, prevMetrics.pageViewsBrowser)
        },
        unitsRefunded: {
          value: currentMetrics.unitsRefunded,
          change: calculateChange(currentMetrics.unitsRefunded, prevMetrics.unitsRefunded)
        },
        refundRate: {
          value: currentMetrics.refundRate,
          change: calculateChange(currentMetrics.refundRate, prevMetrics.refundRate)
        },
        unitsShipped: {
          value: currentMetrics.unitsShipped,
          change: calculateChange(currentMetrics.unitsShipped, prevMetrics.unitsShipped)
        },
        ordersShipped: {
          value: currentMetrics.ordersShipped,
          change: calculateChange(currentMetrics.ordersShipped, prevMetrics.ordersShipped)
        }
      },
      dailySales,
      weeklySales: weeklyData,
      monthlySales: monthlyData
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Overview API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다"
      },
      { status: 500 }
    )
  }
}
