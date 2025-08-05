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

// 날짜 파싱 함수: 다양한 형식 처리
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  try {
    // MM/DD/YYYY HH:MM:SS AM/PM 형식 (가장 먼저 체크)
    if (dateStr.includes('/')) {
      // "07/31/2025 10:14:33 AM" -> Date 객체로 변환
      const parts = dateStr.split(' ')
      const datePart = parts[0] // "07/31/2025"
      const timePart = parts[1] || "00:00:00" // "10:14:33"
      const ampm = parts[2] || "" // "AM" or "PM"
      
      const [month, day, year] = datePart.split('/')
      
      // 시간이 있는 경우
      if (timePart !== "00:00:00") {
        const [hours, minutes, seconds] = timePart.split(':')
        let hour = parseInt(hours)
        if (ampm === 'PM' && hour !== 12) hour += 12
        if (ampm === 'AM' && hour === 12) hour = 0
        
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes) || 0, parseInt(seconds) || 0)
      } else {
        // 시간이 없는 경우
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
    }
    
    // ISO 형식 (2025-07-30T23:29:27.000Z) 또는 YYYY-MM-DD
    if (dateStr.includes('T')) {
      return new Date(dateStr)
    }
    
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00')
    }
    
    // 기타 형식 시도
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }
    
    return null
  } catch (e) {
    console.error('Date parsing error:', dateStr, e)
    return null
  }
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
      .gte("created_time", "2025-06-01T00:00:00")
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
    
    console.log(`[monthly-matrix] Total samples from DB: ${orders.length}`)
    if (orders.length > 0) {
      console.log(`[monthly-matrix] Sample created_time formats:`, orders.slice(0, 3).map(o => o.created_time))
    }

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

    let parsedCount = 0
    let failedCount = 0
    
    orders.forEach((order) => {
      if (!order.created_time || !order.product_name) return

      const date = parseDate(order.created_time)
      if (!date) {
        failedCount++
        console.log(`[monthly-matrix] Failed to parse date: ${order.created_time}`)
        return
      }
      
      parsedCount++
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
    
    console.log(`[monthly-matrix] Parsed ${parsedCount} orders, failed ${failedCount}`)
    console.log(`[monthly-matrix] Unique months: ${sortedMonths.join(', ')}`)

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
