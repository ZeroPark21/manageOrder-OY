import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const dateRange = searchParams.get('dateRange') || '30'

    if (!companyId) {
      return NextResponse.json({ error: "회사 ID가 필요합니다" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 날짜 범위 계산
    const daysAgo = parseInt(dateRange)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - daysAgo)
    const fromDateStr = fromDate.toISOString().split('T')[0]

    // 기간 내 주문 데이터 가져오기
    const { data: orders, error } = await supabase
      .from('amazon_orders')
      .select('*')
      .eq('company_id', companyId)
      .gte('purchase_date', fromDateStr)

    if (error) {
      console.error("Error fetching orders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ASIN별 종합 통계
    const asinStats = new Map<string, {
      asin: string
      product_name: string
      sku: Set<string>
      quantity: number
      revenue: number
      orders: number
      avgOrderValue: number
      promotionOrders: number
      promotionDiscount: number
      states: Map<string, number>
      cities: Map<string, number>
      serviceLevel: Map<string, number>
      dailySales: Map<string, { quantity: number, revenue: number, orders: number }>
    }>()

    orders?.forEach(order => {
      const asin = order.asin
      if (!asin) return

      const revenue =
        (parseFloat(order.item_price) || 0) +
        (parseFloat(order.item_tax) || 0) -
        (parseFloat(order.item_promotion_discount) || 0)

      const quantity = parseInt(order.quantity_purchased) || 0
      const hasPromotion = (parseFloat(order.item_promotion_discount) || 0) > 0 ||
                          (parseFloat(order.ship_promotion_discount) || 0) > 0
      const promotionDiscount = (parseFloat(order.item_promotion_discount) || 0) +
                               (parseFloat(order.ship_promotion_discount) || 0)

      if (!asinStats.has(asin)) {
        asinStats.set(asin, {
          asin,
          product_name: order.product_name || '',
          sku: new Set(),
          quantity: 0,
          revenue: 0,
          orders: 0,
          avgOrderValue: 0,
          promotionOrders: 0,
          promotionDiscount: 0,
          states: new Map(),
          cities: new Map(),
          serviceLevel: new Map(),
          dailySales: new Map()
        })
      }

      const stats = asinStats.get(asin)!

      // SKU 추가
      if (order.sku) {
        stats.sku.add(order.sku)
      }

      // 기본 통계
      stats.quantity += quantity
      stats.revenue += revenue
      stats.orders += 1

      // 프로모션 통계
      if (hasPromotion) {
        stats.promotionOrders += 1
        stats.promotionDiscount += promotionDiscount
      }

      // 지역별 통계
      if (order.ship_state) {
        stats.states.set(
          order.ship_state,
          (stats.states.get(order.ship_state) || 0) + 1
        )
      }
      if (order.ship_city) {
        stats.cities.set(
          order.ship_city,
          (stats.cities.get(order.ship_city) || 0) + 1
        )
      }

      // 배송 서비스 레벨
      if (order.ship_service_level) {
        stats.serviceLevel.set(
          order.ship_service_level,
          (stats.serviceLevel.get(order.ship_service_level) || 0) + 1
        )
      }

      // 일별 판매
      const date = order.purchase_date?.split('T')[0]
      if (date) {
        if (!stats.dailySales.has(date)) {
          stats.dailySales.set(date, { quantity: 0, revenue: 0, orders: new Set() })
        }
        const daily = stats.dailySales.get(date)!
        daily.quantity += quantity
        daily.revenue += revenue
        daily.orders.add(order.order_id)
      }
    })

    // ASIN 목록 생성
    const asinList = Array.from(asinStats.values()).map(stats => {
      const avgOrderValue = stats.orders > 0 ? stats.revenue / stats.orders : 0
      const promotionRate = stats.orders > 0 ? (stats.promotionOrders / stats.orders) * 100 : 0

      // 상위 5개 주 추출
      const topStates = Array.from(stats.states.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([state, count]) => ({ state, count }))

      // 상위 5개 도시 추출
      const topCities = Array.from(stats.cities.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }))

      // 배송 서비스 레벨 분포
      const serviceLevelDist = Object.fromEntries(stats.serviceLevel)

      // 일별 판매 추이
      const dailySales = Array.from(stats.dailySales.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          date,
          quantity: data.quantity,
          revenue: Math.round(data.revenue * 100) / 100,
          orders: data.orders.size
        }))

      // 주별 판매 추이
      const getWeekKey = (dateStr: string) => {
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const weekNum = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7)
        return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-W${weekNum}`
      }

      const weeklySalesMap = new Map<string, { quantity: number, revenue: number, orders: Set<string> }>()
      Array.from(stats.dailySales.entries()).forEach(([date, data]) => {
        const weekKey = getWeekKey(date)
        if (!weeklySalesMap.has(weekKey)) {
          weeklySalesMap.set(weekKey, { quantity: 0, revenue: 0, orders: new Set() })
        }
        const weekly = weeklySalesMap.get(weekKey)!
        weekly.quantity += data.quantity
        weekly.revenue += data.revenue
        data.orders.forEach(orderId => weekly.orders.add(orderId))
      })

      const weeklySales = Array.from(weeklySalesMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, data]) => ({
          week,
          quantity: data.quantity,
          revenue: Math.round(data.revenue * 100) / 100,
          orders: data.orders.size
        }))

      // 월별 판매 추이
      const monthlySalesMap = new Map<string, { quantity: number, revenue: number, orders: Set<string> }>()
      Array.from(stats.dailySales.entries()).forEach(([date, data]) => {
        const month = date.substring(0, 7) // YYYY-MM
        if (!monthlySalesMap.has(month)) {
          monthlySalesMap.set(month, { quantity: 0, revenue: 0, orders: new Set() })
        }
        const monthly = monthlySalesMap.get(month)!
        monthly.quantity += data.quantity
        monthly.revenue += data.revenue
        data.orders.forEach(orderId => monthly.orders.add(orderId))
      })

      const monthlySales = Array.from(monthlySalesMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          quantity: data.quantity,
          revenue: Math.round(data.revenue * 100) / 100,
          orders: data.orders.size
        }))

      return {
        asin: stats.asin,
        product_name: stats.product_name,
        sku_list: Array.from(stats.sku),
        quantity: stats.quantity,
        revenue: Math.round(stats.revenue * 100) / 100,
        orders: stats.orders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        promotionOrders: stats.promotionOrders,
        promotionRate: Math.round(promotionRate * 10) / 10,
        promotionDiscount: Math.round(stats.promotionDiscount * 100) / 100,
        topStates,
        topCities,
        serviceLevelDist,
        dailySales,
        weeklySales,
        monthlySales
      }
    })

    // 매출 기준 정렬
    asinList.sort((a, b) => b.revenue - a.revenue)

    const response = {
      asinList,
      summary: {
        totalAsins: asinList.length,
        totalRevenue: asinList.reduce((sum, item) => sum + item.revenue, 0),
        totalQuantity: asinList.reduce((sum, item) => sum + item.quantity, 0),
        totalOrders: asinList.reduce((sum, item) => sum + item.orders, 0)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Products API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다"
      },
      { status: 500 }
    )
  }
}
