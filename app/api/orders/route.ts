import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

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

    // 모든 샘플 데이터를 페이지네이션으로 가져오기
    let allOrders: OrderSimple[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select(
          `
          id,
          product_name,
          quantity,
          created_time,
          order_amount,
          sku_unit_original_price
        `
        )
        .eq("sku_unit_original_price", 0)  // 샘플만 필터링
        .order("created_time", { ascending: true })
        .range(offset, offset + batchSize - 1)

      if (dbError) {
        console.error(`Error fetching batch at offset ${offset}:`, dbError)
        if (offset === 0) {
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
          return NextResponse.json({ error: dbError.message }, { status: 500 })
        }
        break
      }
      
      if (data && data.length > 0) {
        allOrders = [...allOrders, ...data]
        console.log(`📦 Orders batch ${Math.floor(offset / batchSize) + 1}: ${data.length}개 (총 ${allOrders.length}개)`)
        offset += batchSize
        
        if (data.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    console.log(`📦 Total orders fetched: ${allOrders.length}`)

    const orders = allOrders

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
