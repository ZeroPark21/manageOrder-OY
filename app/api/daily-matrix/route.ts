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
          products: [],
          dates: [],
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
        dates: [],
        matrix: {},
      })
    }

    // 날짜별로 그룹화하고 상품별 수량 집계
    const dateProductMap: { [date: string]: { [product: string]: number } } = {}
    const productSet = new Set<string>()
    const dateSet = new Set<string>()

    // 상품별로 그룹화하고 SKU 정보도 함께 저장
    const productSkuMap: { [product: string]: { seller_sku: string; sku_id: number } } = {}

    orders.forEach((order) => {
      if (!order.created_time || !order.product_name) return

      const date = new Date(order.created_time).toISOString().split("T")[0] // YYYY-MM-DD
      const product = order.product_name
      const quantity = Number(order.quantity) || 0

      // SKU 정보 저장 (첫 번째 발견된 것 사용)
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

    // 날짜 정렬
    const sortedDates = Array.from(dateSet).sort()
    const products = Array.from(productSet)

    // 각 상품별 총 수량 계산 및 정렬
    const productTotals = products.map((product) => {
      const total = sortedDates.reduce((sum, date) => {
        return sum + (dateProductMap[date]?.[product] || 0)
      }, 0)
      return { product, total }
    })

    // 총 수량 기준으로 내림차순 정렬
    productTotals.sort((a, b) => b.total - a.total)
    const sortedProducts = productTotals.map((item) => item.product)

    // 매트릭스 데이터 생성
    const matrix: { [product: string]: { [date: string]: number; total: number } } = {}

    sortedProducts.forEach((product) => {
      matrix[product] = { total: 0 }
      sortedDates.forEach((date) => {
        const quantity = dateProductMap[date]?.[product] || 0
        matrix[product][date] = quantity
        matrix[product].total += quantity
      })
    })

    // 응답에 SKU 정보 추가
    return NextResponse.json({
      products: sortedProducts,
      dates: sortedDates,
      matrix: matrix,
      productSkuMap: productSkuMap,
    })
  } catch (err: any) {
    console.error("API /api/daily-matrix error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
