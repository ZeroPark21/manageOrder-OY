import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

interface OrderData {
  id: number
  product_name: string
  seller_sku: string
  sku_id: number
  quantity: number
  created_time: string
}

// 일별 그룹화 함수
function groupByDate(orders: OrderData[]) {
  const dateProductMap: { [date: string]: { [product: string]: number } } = {}
  const productSet = new Set<string>()
  const dateSet = new Set<string>()
  const productSkuMap: { [product: string]: { seller_sku: string; sku_id: number } } = {}

  orders.forEach((order) => {
    if (!order.created_time || !order.product_name) return

    const date = new Date(order.created_time).toISOString().split("T")[0]
    const product = order.product_name
    const quantity = Number(order.quantity) || 0

    if (!productSkuMap[product]) {
      productSkuMap[product] = {
        seller_sku: order.seller_sku || "",
        sku_id: order.sku_id || 0,
      }
    }

    if (!dateProductMap[date]) {
      dateProductMap[date] = {}
    }
    if (!dateProductMap[date][product]) {
      dateProductMap[date][product] = 0
    }

    dateProductMap[date][product] += quantity
    productSet.add(product)
    dateSet.add(date)
  })

  const sortedDates = Array.from(dateSet).sort()
  const products = Array.from(productSet)

  const productTotals = products.map((product) => {
    const total = sortedDates.reduce((sum, date) => {
      return sum + (dateProductMap[date]?.[product] || 0)
    }, 0)
    return { product, total }
  })

  productTotals.sort((a, b) => b.total - a.total)
  const sortedProducts = productTotals.map((item) => item.product)

  const matrix: { [product: string]: { [date: string]: number; total: number } } = {}
  sortedProducts.forEach((product) => {
    matrix[product] = { total: 0 }
    sortedDates.forEach((date) => {
      const quantity = dateProductMap[date]?.[product] || 0
      matrix[product][date] = quantity
      matrix[product].total += quantity
    })
  })

  return { products: sortedProducts, dates: sortedDates, matrix, productSkuMap }
}

// 주별 그룹화 함수
function groupByWeek(orders: OrderData[]) {
  function getWeekKey(date: Date): string {
    const startOfWeek = new Date(date)
    const dayOfWeek = date.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startOfWeek.setDate(date.getDate() + daysToMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    return startOfWeek.toISOString().split("T")[0]
  }

  const weekProductMap: { [week: string]: { [product: string]: number } } = {}
  const productSet = new Set<string>()
  const weekSet = new Set<string>()
  const productSkuMap: { [product: string]: { seller_sku: string; sku_id: number } } = {}

  orders.forEach((order) => {
    if (!order.created_time || !order.product_name) return

    const date = new Date(order.created_time)
    const weekKey = getWeekKey(date)
    const product = order.product_name
    const quantity = Number(order.quantity) || 0

    if (!productSkuMap[product]) {
      productSkuMap[product] = {
        seller_sku: order.seller_sku || "",
        sku_id: order.sku_id || 0,
      }
    }

    if (!weekProductMap[weekKey]) {
      weekProductMap[weekKey] = {}
    }
    if (!weekProductMap[weekKey][product]) {
      weekProductMap[weekKey][product] = 0
    }

    weekProductMap[weekKey][product] += quantity
    productSet.add(product)
    weekSet.add(weekKey)
  })

  const sortedWeeks = Array.from(weekSet).sort()
  const products = Array.from(productSet)

  const productTotals = products.map((product) => {
    const total = sortedWeeks.reduce((sum, week) => {
      return sum + (weekProductMap[week]?.[product] || 0)
    }, 0)
    return { product, total }
  })

  productTotals.sort((a, b) => b.total - a.total)
  const sortedProducts = productTotals.map((item) => item.product)

  const matrix: { [product: string]: { [week: string]: number; total: number } } = {}
  sortedProducts.forEach((product) => {
    matrix[product] = { total: 0 }
    sortedWeeks.forEach((week) => {
      const quantity = weekProductMap[week]?.[product] || 0
      matrix[product][week] = quantity
      matrix[product].total += quantity
    })
  })

  // 주별 포맷팅 함수들
  const formatWeekDisplay = (weekKey: string): string => {
    const startDate = new Date(weekKey)
    const year = startDate.getFullYear().toString().slice(-2)
    const month = String(startDate.getMonth() + 1).padStart(2, "0")
    const day = String(startDate.getDate()).padStart(2, "0")
    return `${year}.${month}.${day}`
  }

  const formatWeekRange = (weekKey: string): string => {
    const startDate = new Date(weekKey)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    const formatDate = (date: Date) => {
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${month}/${day}`
    }

    return `${formatDate(startDate)}~${formatDate(endDate)}`
  }

  return {
    products: sortedProducts,
    weeks: sortedWeeks,
    matrix,
    productSkuMap,
    formatWeekDisplay: sortedWeeks.reduce(
      (acc, week) => {
        acc[week] = formatWeekDisplay(week)
        return acc
      },
      {} as { [key: string]: string },
    ),
    formatWeekRange: sortedWeeks.reduce(
      (acc, week) => {
        acc[week] = formatWeekRange(week)
        return acc
      },
      {} as { [key: string]: string },
    ),
  }
}

// 월별 그룹화 함수
function groupByMonth(orders: OrderData[]) {
  function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }

  const monthProductMap: { [month: string]: { [product: string]: number } } = {}
  const productSet = new Set<string>()
  const monthSet = new Set<string>()
  const productSkuMap: { [product: string]: { seller_sku: string; sku_id: number } } = {}

  orders.forEach((order) => {
    if (!order.created_time || !order.product_name) return

    const date = new Date(order.created_time)
    const monthKey = getMonthKey(date)
    const product = order.product_name
    const quantity = Number(order.quantity) || 0

    if (!productSkuMap[product]) {
      productSkuMap[product] = {
        seller_sku: order.seller_sku || "",
        sku_id: order.sku_id || 0,
      }
    }

    if (!monthProductMap[monthKey]) {
      monthProductMap[monthKey] = {}
    }
    if (!monthProductMap[monthKey][product]) {
      monthProductMap[monthKey][product] = 0
    }

    monthProductMap[monthKey][product] += quantity
    productSet.add(product)
    monthSet.add(monthKey)
  })

  const sortedMonths = Array.from(monthSet).sort()
  const products = Array.from(productSet)

  const productTotals = products.map((product) => {
    const total = sortedMonths.reduce((sum, month) => {
      return sum + (monthProductMap[month]?.[product] || 0)
    }, 0)
    return { product, total }
  })

  productTotals.sort((a, b) => b.total - a.total)
  const sortedProducts = productTotals.map((item) => item.product)

  const matrix: { [product: string]: { [month: string]: number; total: number } } = {}
  sortedProducts.forEach((product) => {
    matrix[product] = { total: 0 }
    sortedMonths.forEach((month) => {
      const quantity = monthProductMap[month]?.[product] || 0
      matrix[product][month] = quantity
      matrix[product].total += quantity
    })
  })

  return { products: sortedProducts, months: sortedMonths, matrix, productSkuMap }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 7월 1일부터 데이터 조회
    const { data, error: dbError } = await supabase
      .from("orders")
      .select("id, product_name, seller_sku, sku_id, quantity, created_time")
      .gte("created_time", "2025-07-01")
      .order("created_time", { ascending: true })

    if (dbError) {
      if ((dbError as any).code === "42P01") {
        return NextResponse.json({
          daily: { products: [], dates: [], matrix: {}, productSkuMap: {} },
          weekly: { products: [], weeks: [], matrix: {}, productSkuMap: {} },
          monthly: { products: [], months: [], matrix: {}, productSkuMap: {} },
        })
      }
      console.error("Supabase error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const orders = (data || []) as OrderData[]

    if (orders.length === 0) {
      return NextResponse.json({
        daily: { products: [], dates: [], matrix: {}, productSkuMap: {} },
        weekly: { products: [], weeks: [], matrix: {}, productSkuMap: {} },
        monthly: { products: [], months: [], matrix: {}, productSkuMap: {} },
      })
    }

    // 각 매트릭스 데이터 생성
    const dailyData = groupByDate(orders)
    const weeklyData = groupByWeek(orders)
    const monthlyData = groupByMonth(orders)

    return NextResponse.json({
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
    })
  } catch (err: any) {
    console.error("API /api/all-matrix error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
