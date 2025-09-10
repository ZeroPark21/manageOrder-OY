import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

interface SalesOrder {
  id: number
  product_name: string
  quantity: number
  created_time: string
  order_amount: number
  sku_unit_original_price: number
  seller_sku: string
  sku_id: number
}

interface ProductSalesData {
  [date: string]: {
    quantity: number
    revenue: number
  }
  total: {
    quantity: number
    revenue: number
  }
}

function createMatrix(orders: SalesOrder[], timeExtractor: (date: Date) => string, timeFormatter: (key: string) => string) {
  // 제품별로 데이터 그룹화
  const productData: { [product: string]: ProductSalesData } = {}
  const productSkuMap: { [product: string]: { seller_sku: string, sku_id: number } } = {}
  const timeKeys = new Set<string>()

  orders.forEach(order => {
    const date = new Date(order.created_time)
    const timeKey = timeExtractor(date)
    const product = order.product_name
    
    timeKeys.add(timeKey)
    
    if (!productData[product]) {
      productData[product] = {
        total: { quantity: 0, revenue: 0 }
      }
    }
    
    if (!productData[product][timeKey]) {
      productData[product][timeKey] = { quantity: 0, revenue: 0 }
    }
    
    // SKU 정보 저장 (첫 번째 발견된 것으로)
    if (!productSkuMap[product]) {
      productSkuMap[product] = {
        seller_sku: order.seller_sku || "",
        sku_id: order.sku_id || 0
      }
    }
    
    // 데이터 집계
    productData[product][timeKey].quantity += Number(order.quantity) || 0
    productData[product][timeKey].revenue += Number(order.order_amount) || 0
    productData[product].total.quantity += Number(order.quantity) || 0
    productData[product].total.revenue += Number(order.order_amount) || 0
  })

  // 시간 키 정렬
  const sortedTimeKeys = Array.from(timeKeys).sort()
  
  // 제품을 총 매출액 기준으로 정렬
  const sortedProducts = Object.keys(productData).sort(
    (a, b) => productData[b].total.revenue - productData[a].total.revenue
  )

  return {
    timeKeys: sortedTimeKeys,
    products: sortedProducts,
    matrix: productData,
    productSkuMap
  }
}

function getDayKey(date: Date): string {
  return date.toISOString().split("T")[0] // YYYY-MM-DD
}

function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay()) // 일요일로 설정
  return startOfWeek.toISOString().split("T")[0]
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatWeekDisplay(weekKey: string): string {
  const date = new Date(weekKey)
  const endDate = new Date(date)
  endDate.setDate(date.getDate() + 6)
  
  const startMonth = date.getMonth() + 1
  const startDay = date.getDate()
  const endMonth = endDate.getMonth() + 1
  const endDay = endDate.getDate()
  
  return `${startMonth}/${startDay}-${endMonth}/${endDay}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // orders 테이블에서 매출 데이터만 조회 (SKU Unit Original Price > 0)
    const { data, error: dbError } = await supabase
      .from("orders")
      .select(
        `
        id,
        product_name,
        quantity,
        created_time,
        order_amount,
        sku_unit_original_price,
        seller_sku,
        sku_id
      `,
      )
      .gt("sku_unit_original_price", 0)  // 매출이 발생한 주문만 필터링
      .gte("created_time", "2025-06-01")
      .order("created_time", { ascending: true })

    if (dbError) {
      // 테이블이 없으면 빈 데이터로 응답
      if ((dbError as any).code === "42P01") {
        console.warn("orders 테이블이 없어 빈 결과를 반환합니다.")
        return NextResponse.json({
          summary: {
            totalRevenue: 0,
            totalQuantity: 0,
            activeProducts: 0
          },
          daily: {
            dates: [],
            products: [],
            matrix: {},
            productSkuMap: {}
          },
          weekly: {
            weeks: [],
            products: [],
            matrix: {},
            productSkuMap: {},
            formatWeekDisplay: {},
            formatWeekRange: {}
          },
          monthly: {
            months: [],
            products: [],
            matrix: {},
            productSkuMap: {}
          }
        })
      }

      console.error("Supabase error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const orders = (data || []) as SalesOrder[]

    // 데이터 검증 및 정제
    const safeOrders = orders.map((o) => ({
      ...o,
      quantity: Number(o.quantity) || 0,
      order_amount: Number(o.order_amount) || 0,
      sku_unit_original_price: Number(o.sku_unit_original_price) || 0,
      sku_id: Number(o.sku_id) || 0
    }))

    // 요약 통계 계산
    const totalQuantity = safeOrders.reduce((sum, o) => sum + o.quantity, 0)
    const totalRevenue = safeOrders.reduce((sum, o) => sum + o.order_amount, 0)
    const activeProducts = new Set(safeOrders.map((o) => o.product_name)).size

    // 일별 매트릭스
    const dailyMatrix = createMatrix(safeOrders, getDayKey, (key) => key)
    
    // 주별 매트릭스
    const weeklyMatrix = createMatrix(safeOrders, getWeekKey, (key) => key)
    const formatWeekDisplay: { [key: string]: string } = {}
    const formatWeekRange: { [key: string]: string } = {}
    
    weeklyMatrix.timeKeys.forEach(weekKey => {
      const date = new Date(weekKey)
      const endDate = new Date(date)
      endDate.setDate(date.getDate() + 6)
      
      formatWeekDisplay[weekKey] = `${date.getMonth() + 1}/${date.getDate()}-${endDate.getMonth() + 1}/${endDate.getDate()}`
      formatWeekRange[weekKey] = `${date.toLocaleDateString('ko-KR')} - ${endDate.toLocaleDateString('ko-KR')}`
    })
    
    // 월별 매트릭스
    const monthlyMatrix = createMatrix(safeOrders, getMonthKey, (key) => key)

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalQuantity,
        activeProducts
      },
      daily: {
        dates: dailyMatrix.timeKeys,
        products: dailyMatrix.products,
        matrix: dailyMatrix.matrix,
        productSkuMap: dailyMatrix.productSkuMap
      },
      weekly: {
        weeks: weeklyMatrix.timeKeys,
        products: weeklyMatrix.products,
        matrix: weeklyMatrix.matrix,
        productSkuMap: weeklyMatrix.productSkuMap,
        formatWeekDisplay,
        formatWeekRange
      },
      monthly: {
        months: monthlyMatrix.timeKeys,
        products: monthlyMatrix.products,
        matrix: monthlyMatrix.matrix,
        productSkuMap: monthlyMatrix.productSkuMap
      }
    })
  } catch (err: any) {
    console.error("API /api/sales-analysis error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}