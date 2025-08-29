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
  country: string
}

function parseDeliveredTime(dateStr: string | null): Date | null {
  if (!dateStr) return null
  
  // Parse MM/DD/YYYY format
  const parts = dateStr.split(' ')[0].split('/')
  if (parts.length !== 3) return null
  
  const month = parseInt(parts[0])
  const day = parseInt(parts[1])
  const year = parseInt(parts[2])
  
  return new Date(year, month - 1, day)
}

function groupByDate(orders: Order[]) {
  const grouped: { [key: string]: { 
    date: string; 
    totalQuantity: number; 
    totalRevenue: number;
    uniqueProducts: number;
    productStats: { [key: string]: { quantity: number; revenue: number } };
    products: Order[] 
  } } = {}

  orders.forEach((order) => {
    const date = parseDeliveredTime(order.delivered_time)
    if (!date) return
    const dateKey = date.toISOString().split("T")[0] // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueProducts: 0,
        productStats: {},
        products: [],
      }
    }

    grouped[dateKey].totalQuantity += order.quantity || 0
    grouped[dateKey].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
    grouped[dateKey].products.push(order)

    // 제품별 통계
    if (!grouped[dateKey].productStats[order.product_name]) {
      grouped[dateKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
    }
    grouped[dateKey].productStats[order.product_name].quantity += order.quantity || 0
    grouped[dateKey].productStats[order.product_name].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
  })

  // 유니크 제품 수 계산
  Object.values(grouped).forEach(day => {
    day.uniqueProducts = Object.keys(day.productStats).length
  })

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
}

function groupByWeek(orders: Order[]) {
  const grouped: { [key: string]: { 
    week: string; 
    totalQuantity: number; 
    totalRevenue: number;
    uniqueProducts: number;
    productStats: { [key: string]: { quantity: number; revenue: number } };
    products: Order[] 
  } } = {}

  orders.forEach((order) => {
    const date = parseDeliveredTime(order.delivered_time)
    if (!date) return
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay()) // 일요일로 설정
    const weekKey = startOfWeek.toISOString().split("T")[0]

    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        week: weekKey,
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueProducts: 0,
        productStats: {},
        products: [],
      }
    }

    grouped[weekKey].totalQuantity += order.quantity || 0
    grouped[weekKey].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
    grouped[weekKey].products.push(order)

    // 제품별 통계
    if (!grouped[weekKey].productStats[order.product_name]) {
      grouped[weekKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
    }
    grouped[weekKey].productStats[order.product_name].quantity += order.quantity || 0
    grouped[weekKey].productStats[order.product_name].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
  })

  // 유니크 제품 수 계산
  Object.values(grouped).forEach(week => {
    week.uniqueProducts = Object.keys(week.productStats).length
  })

  return Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week))
}

function groupByMonth(orders: Order[]) {
  const grouped: { [key: string]: { 
    month: string; 
    totalQuantity: number; 
    totalRevenue: number;
    uniqueProducts: number;
    productStats: { [key: string]: { quantity: number; revenue: number } };
    products: Order[] 
  } } = {}

  orders.forEach((order) => {
    const date = parseDeliveredTime(order.delivered_time)
    if (!date) return
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` // YYYY-MM

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: monthKey,
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueProducts: 0,
        productStats: {},
        products: [],
      }
    }

    grouped[monthKey].totalQuantity += order.quantity || 0
    grouped[monthKey].totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
    grouped[monthKey].products.push(order)

    // 제품별 통계
    if (!grouped[monthKey].productStats[order.product_name]) {
      grouped[monthKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
    }
    grouped[monthKey].productStats[order.product_name].quantity += order.quantity || 0
    grouped[monthKey].productStats[order.product_name].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
  })

  // 유니크 제품 수 계산
  Object.values(grouped).forEach(month => {
    month.uniqueProducts = Object.keys(month.productStats).length
  })

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get("groupBy") || "daily"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = createServerClient()

    // 기본 쿼리 - SKU Unit Original Price > 0인 주문만 (실제 판매)
    let query = supabase
      .from("orders")
      .select("*")
      .gt("sku_unit_original_price", 0) // 0보다 큰 경우만 (실제 판매)
      .not("delivered_time", "is", null) // 배송 완료된 주문만
      .order("delivered_time", { ascending: true })

    // 날짜 필터 - MM/DD/YYYY 형식 사용
    if (startDate) {
      query = query.gte("delivered_time", startDate)
    } else {
      // 기본적으로 2025년 7월부터 (MM/DD/YYYY 형식)
      query = query.gte("delivered_time", "07/01/2025")
    }

    if (endDate) {
      query = query.lte("delivered_time", endDate)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error("Database query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({
        data: [],
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueProducts: 0,
        totalOrders: 0,
      })
    }

    // Filter orders to only include those delivered after July 1, 2025
    const filteredOrders = orders.filter(order => {
      const date = parseDeliveredTime(order.delivered_time)
      if (!date) return false
      return date >= new Date(2025, 6, 1) // July 1, 2025
    })

    if (filteredOrders.length === 0) {
      return NextResponse.json({
        data: [],
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueProducts: 0,
        totalOrders: 0,
      })
    }

    // 전체 통계 - use filtered orders
    const totalQuantity = filteredOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + ((order.quantity || 0) * (order.sku_unit_original_price || 0)), 0)
    const uniqueProducts = new Set(filteredOrders.map(o => o.product_name)).size
    const totalOrders = new Set(filteredOrders.map(o => o.order_id)).size

    // 그룹화 - use filtered orders
    let groupedData
    if (groupBy === "all") {
      return NextResponse.json({
        totalQuantity,
        totalRevenue,
        uniqueProducts,
        totalOrders,
      })
    } else if (groupBy === "weekly") {
      groupedData = groupByWeek(filteredOrders)
    } else if (groupBy === "monthly") {
      groupedData = groupByMonth(filteredOrders)
    } else {
      groupedData = groupByDate(filteredOrders)
    }

    return NextResponse.json({
      data: groupedData,
      totalQuantity,
      totalRevenue,
      uniqueProducts,
      totalOrders,
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}