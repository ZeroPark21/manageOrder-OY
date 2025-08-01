import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

interface OrderData {
  id: number
  product_name: string
  seller_sku: string
  sku_id: number
  quantity: number
  created_time: string
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-")
  return `${year}-${month}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 6월 1일부터 데이터 조회 - 샘플만 조회 (sku_unit_original_price = 0)
    const { data, error: dbError } = await supabase
      .from("orders")
      .select("id, product_name, seller_sku, sku_id, quantity, created_time, sku_unit_original_price")
      .eq("sku_unit_original_price", 0)  // 샘플만 필터링
      .gte("created_time", "2025-06-01")
      .order("created_time", { ascending: true })

    if (dbError) {
      if ((dbError as any).code === "42P01") {
        return NextResponse.json({
          products: [],
          months: [],
          matrix: {},
        })
      }
      console.error("Supabase error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const orders = (data || []) as OrderData[]

    if (orders.length === 0) {
      return NextResponse.json({
        products: [],
        months: [],
        matrix: {},
      })
    }

    // 월별로 그룹화하고 상품별 수량 집계
    const monthProductMap: { [month: string]: { [product: string]: number } } = {}
    const productSet = new Set<string>()
    const monthSet = new Set<string>()

    // 상품별 SKU 정보 저장
    const productSkuMap: { [product: string]: { seller_sku: string; sku_id: number } } = {}

    orders.forEach((order) => {
      if (!order.created_time || !order.product_name) return

      const date = new Date(order.created_time)
      const monthKey = getMonthKey(date)
      const product = order.product_name
      const quantity = Number(order.quantity) || 0

      if (!monthProductMap[monthKey]) {
        monthProductMap[monthKey] = {}
      }

      if (!monthProductMap[monthKey][product]) {
        monthProductMap[monthKey][product] = 0
      }

      monthProductMap[monthKey][product] += quantity
      productSet.add(product)
      monthSet.add(monthKey)

      if (!productSkuMap[product]) {
        productSkuMap[product] = {
          seller_sku: order.seller_sku || "",
          sku_id: order.sku_id || 0,
        }
      }
    })

    // 월 정렬
    const sortedMonths = Array.from(monthSet).sort()
    const products = Array.from(productSet)

    // 각 상품별 총 수량 계산 및 정렬
    const productTotals = products.map((product) => {
      const total = sortedMonths.reduce((sum, month) => {
        return sum + (monthProductMap[month]?.[product] || 0)
      }, 0)
      return { product, total }
    })

    // 총 수량 기준으로 내림차순 정렬
    productTotals.sort((a, b) => b.total - a.total)
    const sortedProducts = productTotals.map((item) => item.product)

    // 매트릭스 데이터 생성
    const matrix: { [product: string]: { [month: string]: number; total: number } } = {}

    sortedProducts.forEach((product) => {
      matrix[product] = { total: 0 }
      sortedMonths.forEach((month) => {
        const quantity = monthProductMap[month]?.[product] || 0
        matrix[product][month] = quantity
        matrix[product].total += quantity
      })
    })

    return NextResponse.json({
      products: sortedProducts,
      months: sortedMonths,
      matrix: matrix,
      productSkuMap: productSkuMap,
    })
  } catch (err: any) {
    console.error("API /api/monthly-matrix error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
