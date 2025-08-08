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
  recipient_address_2: string
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
    if (!order.order_time) return

    const date = new Date(order.order_time)
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

    grouped[dateKey].totalQuantity += order.sku_quantity || 0
    grouped[dateKey].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
    grouped[dateKey].products.push(order)

    // 제품별 통계
    if (!grouped[dateKey].productStats[order.product_name]) {
      grouped[dateKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
    }
    grouped[dateKey].productStats[order.product_name].quantity += order.sku_quantity || 0
    grouped[dateKey].productStats[order.product_name].revenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
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
    if (!order.order_time) return

    const date = new Date(order.order_time)
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

    grouped[weekKey].totalQuantity += order.sku_quantity || 0
    grouped[weekKey].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
    grouped[weekKey].products.push(order)

    // 제품별 통계
    if (!grouped[weekKey].productStats[order.product_name]) {
      grouped[weekKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
    }
    grouped[weekKey].productStats[order.product_name].quantity += order.sku_quantity || 0
    grouped[weekKey].productStats[order.product_name].revenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
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
    if (!order.order_time) return

    const date = new Date(order.order_time)
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

    grouped[monthKey].totalQuantity += order.sku_quantity || 0
    grouped[monthKey].totalRevenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
    grouped[monthKey].products.push(order)

    // 제품별 통계
    if (!grouped[monthKey].productStats[order.product_name]) {
      grouped[monthKey].productStats[order.product_name] = { quantity: 0, revenue: 0 }
    }
    grouped[monthKey].productStats[order.product_name].quantity += order.sku_quantity || 0
    grouped[monthKey].productStats[order.product_name].revenue += (order.sku_quantity || 0) * (order.sku_unit_original_price || 0)
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
      .order("order_time", { ascending: true })

    // 날짜 필터
    if (startDate) {
      query = query.gte("order_time", startDate)
    } else {
      // 기본적으로 2025년 7월부터
      query = query.gte("order_time", "2025-07-01")
    }

    if (endDate) {
      query = query.lte("order_time", endDate)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error("Database query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        data: [],
        totalQuantity: 0,
        totalRevenue: 0,
        uniqueProducts: 0,
        totalOrders: 0,
      })
    }

    // 전체 통계
    const totalQuantity = orders.reduce((sum, order) => sum + (order.sku_quantity || 0), 0)
    const totalRevenue = orders.reduce((sum, order) => sum + ((order.sku_quantity || 0) * (order.sku_unit_original_price || 0)), 0)
    const uniqueProducts = new Set(orders.map(o => o.product_name)).size
    const totalOrders = new Set(orders.map(o => o.order_id)).size

    // 그룹화
    let groupedData
    if (groupBy === "all") {
      return NextResponse.json({
        totalQuantity,
        totalRevenue,
        uniqueProducts,
        totalOrders,
      })
    } else if (groupBy === "weekly") {
      groupedData = groupByWeek(orders)
    } else if (groupBy === "monthly") {
      groupedData = groupByMonth(orders)
    } else {
      groupedData = groupByDate(orders)
    }

    return NextResponse.json({
      data: groupedData,
      totalQuantity,
      totalRevenue,
      uniqueProducts,
      totalOrders,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}