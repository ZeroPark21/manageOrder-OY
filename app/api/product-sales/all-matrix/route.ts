import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

interface Order {
  id: number
  order_id: string
  order_time: string
  product_name: string
  seller_sku: string
  sku_id: string
  sku_unit_original_price: number
  sku_quantity: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get("groupBy") || "daily"

    const supabase = createServerClient()

    // 7월부터 현재까지 모든 판매 데이터 가져오기
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .gt("sku_unit_original_price", 0)
      .gte("order_time", "2025-07-01")
      .order("order_time", { ascending: true })

    if (error) {
      console.error("Database query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({
        dates: [],
        weeks: [],
        months: [],
        products: [],
        dailyStats: {},
        weeklyStats: {},
        monthlyStats: {},
      })
    }

    // 제품별 평균 가격 계산
    const productPriceMap: { [key: string]: { totalRevenue: number; totalQuantity: number; seller_sku?: string; sku_id?: string } } = {}
    orders.forEach(order => {
      if (!productPriceMap[order.product_name]) {
        productPriceMap[order.product_name] = { 
          totalRevenue: 0, 
          totalQuantity: 0,
          seller_sku: order.seller_sku,
          sku_id: order.sku_id
        }
      }
      productPriceMap[order.product_name].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
      productPriceMap[order.product_name].totalQuantity += order.sku_quantity || 0
    })

    // 제품 리스트 생성 (판매량 기준 정렬)
    const products = Object.entries(productPriceMap)
      .map(([name, data]) => ({
        product_name: name,
        seller_sku: data.seller_sku || '',
        sku_id: data.sku_id || '',
        total_quantity: data.totalQuantity,
        avg_price: data.totalQuantity > 0 ? data.totalRevenue / data.totalQuantity : 0
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)

    if (groupBy === "daily") {
      // 일별 통계
      const dailyStats: { [key: string]: any } = {}
      const dates = new Set<string>()

      orders.forEach(order => {
        const date = new Date(order.order_time).toISOString().split("T")[0]
        dates.add(date)

        if (!dailyStats[date]) {
          dailyStats[date] = {
            totalQuantity: 0,
            totalRevenue: 0,
            productStats: {}
          }
        }

        dailyStats[date].totalQuantity += order.sku_quantity || 0
        dailyStats[date].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)

        if (!dailyStats[date].productStats[order.product_name]) {
          dailyStats[date].productStats[order.product_name] = { quantity: 0, revenue: 0 }
        }
        dailyStats[date].productStats[order.product_name].quantity += order.sku_quantity || 0
        dailyStats[date].productStats[order.product_name].revenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
      })

      return NextResponse.json({
        dates: Array.from(dates).sort(),
        products,
        dailyStats,
      })
    } else if (groupBy === "weekly") {
      // 주별 통계
      const weeklyStats: { [key: string]: any } = {}
      const weeks = new Set<string>()

      orders.forEach(order => {
        const date = new Date(order.order_time)
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay())
        const weekKey = startOfWeek.toISOString().split("T")[0]
        weeks.add(weekKey)

        if (!weeklyStats[weekKey]) {
          weeklyStats[weekKey] = {
            totalQuantity: 0,
            totalRevenue: 0,
            uniqueProducts: 0,
            productStats: {}
          }
        }

        weeklyStats[weekKey].totalQuantity += order.sku_quantity || 0
        weeklyStats[weekKey].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)

        if (!weeklyStats[weekKey].productStats[order.product_name]) {
          weeklyStats[weekKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
        }
        weeklyStats[weekKey].productStats[order.product_name].quantity += order.sku_quantity || 0
        weeklyStats[weekKey].productStats[order.product_name].revenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
      })

      // 유니크 제품 수 계산
      Object.values(weeklyStats).forEach(week => {
        week.uniqueProducts = Object.keys(week.productStats).length
      })

      return NextResponse.json({
        weeks: Array.from(weeks).sort(),
        products,
        weeklyStats,
      })
    } else {
      // 월별 통계
      const monthlyStats: { [key: string]: any } = {}
      const months = new Set<string>()

      orders.forEach(order => {
        const date = new Date(order.order_time)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        months.add(monthKey)

        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            totalQuantity: 0,
            totalRevenue: 0,
            productStats: {}
          }
        }

        monthlyStats[monthKey].totalQuantity += order.sku_quantity || 0
        monthlyStats[monthKey].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)

        if (!monthlyStats[monthKey].productStats[order.product_name]) {
          monthlyStats[monthKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
        }
        monthlyStats[monthKey].productStats[order.product_name].quantity += order.sku_quantity || 0
        monthlyStats[monthKey].productStats[order.product_name].revenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
      })

      return NextResponse.json({
        months: Array.from(months).sort(),
        products,
        monthlyStats,
      })
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}