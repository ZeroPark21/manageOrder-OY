import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

interface Order {
  id: number
  order_id: string
  delivered_time: string | null
  product_name: string
  seller_sku: string
  sku_id: string
  sku_unit_original_price: number
  quantity: number
}

function parseDeliveredTime(dateStr: string | null): Date | null {
  if (!dateStr) return null
  
  // Parse MM/DD/YYYY format with possible time component
  const datePart = dateStr.split(' ')[0]
  const parts = datePart.split('/')
  
  if (parts.length !== 3) {
    console.warn(`Invalid date format: ${dateStr}`)
    return null
  }
  
  const month = parseInt(parts[0], 10)
  const day = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  
  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    console.warn(`Invalid date values: ${dateStr}`)
    return null
  }
  
  // Create date in local timezone
  const date = new Date(year, month - 1, day)
  
  // Validate the date
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    console.warn(`Date validation failed: ${dateStr}`)
    return null
  }
  
  return date
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get("groupBy") || "daily"

    const supabase = createServerClient()

    // 모든 판매 데이터 가져오기 (delivered_time이 있는 모든 데이터)
    // 날짜 필터링은 파싱 후 처리 (MM/DD/YYYY 형식이라 문자열 비교 불가)
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .gt("sku_unit_original_price", 0)
      .not("delivered_time", "is", null)
      .order("delivered_time", { ascending: true })

    if (error) {
      console.error("Database query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!orders || !Array.isArray(orders)) {
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

    // Filter orders to only include those delivered after July 1, 2025
    const julyFirst = new Date(2025, 6, 1) // July 1, 2025 (month is 0-indexed)
    const today = new Date()
    
    const filteredOrders = orders.filter(order => {
      const date = parseDeliveredTime(order.delivered_time)
      if (!date) return false
      
      // 디버깅을 위해 날짜 범위 확인
      if (date < julyFirst || date > today) {
        return false
      }
      return true
    })
    
    console.log(`[product-sales/all-matrix] Total orders: ${orders.length}, Filtered orders: ${filteredOrders.length}`)
    console.log(`[product-sales/all-matrix] Date range: ${julyFirst.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`)

    if (filteredOrders.length === 0) {
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
    filteredOrders.forEach(order => {
      if (!productPriceMap[order.product_name]) {
        productPriceMap[order.product_name] = { 
          totalRevenue: 0, 
          totalQuantity: 0,
          seller_sku: order.seller_sku,
          sku_id: order.sku_id
        }
      }
      productPriceMap[order.product_name].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
      productPriceMap[order.product_name].totalQuantity += order.quantity || 0
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

      filteredOrders.forEach(order => {
        const parsedDate = parseDeliveredTime(order.delivered_time)
        if (!parsedDate) return
        const date = parsedDate.toISOString().split("T")[0]
        dates.add(date)

        if (!dailyStats[date]) {
          dailyStats[date] = {
            totalQuantity: 0,
            totalRevenue: 0,
            productStats: {}
          }
        }

        dailyStats[date].totalQuantity += order.quantity || 0
        dailyStats[date].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)

        if (!dailyStats[date].productStats[order.product_name]) {
          dailyStats[date].productStats[order.product_name] = { quantity: 0, revenue: 0 }
        }
        dailyStats[date].productStats[order.product_name].quantity += order.quantity || 0
        dailyStats[date].productStats[order.product_name].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
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

      filteredOrders.forEach(order => {
        const date = parseDeliveredTime(order.delivered_time)
        if (!date) return
        
        // 주의 시작일 (일요일) 계산
        const startOfWeek = new Date(date)
        const dayOfWeek = date.getDay()
        startOfWeek.setDate(date.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)
        
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

        weeklyStats[weekKey].totalQuantity += order.quantity || 0
        weeklyStats[weekKey].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)

        if (!weeklyStats[weekKey].productStats[order.product_name]) {
          weeklyStats[weekKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
        }
        weeklyStats[weekKey].productStats[order.product_name].quantity += order.quantity || 0
        weeklyStats[weekKey].productStats[order.product_name].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
      })

      // 유니크 제품 수 계산
      Object.values(weeklyStats).forEach(week => {
        week.uniqueProducts = Object.keys(week.productStats).length
      })

      const sortedWeeks = Array.from(weeks).sort()
      console.log(`[product-sales/all-matrix] Weekly data: ${sortedWeeks.length} weeks from ${sortedWeeks[0]} to ${sortedWeeks[sortedWeeks.length - 1]}`)
      
      return NextResponse.json({
        weeks: sortedWeeks,
        products,
        weeklyStats,
      })
    } else {
      // 월별 통계
      const monthlyStats: { [key: string]: any } = {}
      const months = new Set<string>()

      filteredOrders.forEach(order => {
        const date = parseDeliveredTime(order.delivered_time)
        if (!date) return
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        months.add(monthKey)

        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            totalQuantity: 0,
            totalRevenue: 0,
            productStats: {}
          }
        }

        monthlyStats[monthKey].totalQuantity += order.quantity || 0
        monthlyStats[monthKey].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)

        if (!monthlyStats[monthKey].productStats[order.product_name]) {
          monthlyStats[monthKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
        }
        monthlyStats[monthKey].productStats[order.product_name].quantity += order.quantity || 0
        monthlyStats[monthKey].productStats[order.product_name].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
      })

      return NextResponse.json({
        months: Array.from(months).sort(),
        products,
        monthlyStats,
      })
    }
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}