import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

interface OrderSimple {
  id: number
  product_name: string
  quantity: number
  created_time: string
  order_amount: number
}

function groupByDate(orders: OrderSimple[]) {
  const grouped: { [key: string]: { date: string; totalQuantity: number; orders: OrderSimple[] } } = {}

  orders.forEach((order) => {
    if (!order.created_time) return

    const date = new Date(order.created_time)
    const dateKey = date.toISOString().split("T")[0] // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        totalQuantity: 0,
        orders: [],
      }
    }

    grouped[dateKey].totalQuantity += order.quantity
    grouped[dateKey].orders.push(order)
  })

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
}

function groupByWeek(orders: OrderSimple[]) {
  const grouped: { [key: string]: { week: string; totalQuantity: number; orders: OrderSimple[] } } = {}

  orders.forEach((order) => {
    if (!order.created_time) return

    const date = new Date(order.created_time)
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay()) // 일요일로 설정
    const weekKey = startOfWeek.toISOString().split("T")[0]

    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        week: weekKey,
        totalQuantity: 0,
        orders: [],
      }
    }

    grouped[weekKey].totalQuantity += order.quantity
    grouped[weekKey].orders.push(order)
  })

  return Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week))
}

function groupByMonth(orders: OrderSimple[]) {
  const grouped: { [key: string]: { month: string; totalQuantity: number; orders: OrderSimple[] } } = {}

  orders.forEach((order) => {
    if (!order.created_time) return

    const date = new Date(order.created_time)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: monthKey,
        totalQuantity: 0,
        orders: [],
      }
    }

    grouped[monthKey].totalQuantity += order.quantity
    grouped[monthKey].orders.push(order)
  })

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
}

function groupByProduct(orders: OrderSimple[]) {
  const grouped: { [key: string]: { product: string; totalQuantity: number; orders: OrderSimple[] } } = {}

  orders.forEach((order) => {
    const productKey = order.product_name

    if (!grouped[productKey]) {
      grouped[productKey] = {
        product: productKey,
        totalQuantity: 0,
        orders: [],
      }
    }

    grouped[productKey].totalQuantity += order.quantity
    grouped[productKey].orders.push(order)
  })

  return Object.values(grouped).sort((a, b) => b.totalQuantity - a.totalQuantity)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get("groupBy") || "daily"

    const supabase = createServerClient()

    // orders 테이블에서 모든 데이터 조회 (7월 1일부터)
    const { data, error: dbError } = await supabase
      .from("orders")
      .select(
        `
        id,
        product_name,
        quantity,
        created_time,
        order_amount
      `,
      )
      .gte("created_time", "2025-07-01")
      .order("created_time", { ascending: true })

    if (dbError) {
      // 테이블이 없으면 빈 데이터로 응답
      if ((dbError as any).code === "42P01") {
        console.warn("orders 테이블이 없어 빈 결과를 반환합니다.")
        return NextResponse.json({
          data: [],
          totalOrders: 0,
          totalQuantity: 0,
          uniqueProducts: 0,
        })
      }

      console.error("Supabase error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const orders = (data || []) as OrderSimple[]

    const safeOrders = orders.map((o) => ({
      ...o,
      quantity: Number(o.quantity) || 0,
    }))

    // 고유 상품 수 계산
    const uniqueProducts = new Set(safeOrders.map((o) => o.product_name)).size

    let groupedData

    switch (groupBy) {
      case "daily":
        groupedData = groupByDate(safeOrders)
        break
      case "weekly":
        groupedData = groupByWeek(safeOrders)
        break
      case "monthly":
        groupedData = groupByMonth(safeOrders)
        break
      case "product":
        groupedData = groupByProduct(safeOrders)
        break
      default:
        groupedData = groupByDate(safeOrders)
    }

    return NextResponse.json({
      data: groupedData,
      totalOrders: safeOrders.length,
      totalQuantity: safeOrders.reduce((sum, o) => sum + o.quantity, 0),
      uniqueProducts: uniqueProducts,
    })
  } catch (err: any) {
    console.error("API /api/orders error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
