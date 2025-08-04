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

function getWeekKey(date: Date): string {
  // 월요일을 주의 시작으로 설정
  const startOfWeek = new Date(date)
  const dayOfWeek = date.getDay() // 0=일요일, 1=월요일, ..., 6=토요일
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // 일요일이면 -6, 아니면 1-dayOfWeek
  startOfWeek.setDate(date.getDate() + daysToMonday)

  // 시간을 00:00:00으로 설정하여 정확한 날짜만 반환
  startOfWeek.setHours(0, 0, 0, 0)
  return startOfWeek.toISOString().split("T")[0]
}

function formatWeekDisplay(weekKey: string): string {
  const startDate = new Date(weekKey) // 월요일
  const year = startDate.getFullYear().toString().slice(-2) // 25
  const month = String(startDate.getMonth() + 1).padStart(2, "0") // 07
  const day = String(startDate.getDate()).padStart(2, "0") // 14

  return `${year}.${month}.${day}`
}

function formatWeekRange(weekKey: string): string {
  const startDate = new Date(weekKey) // 월요일
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6) // 일요일

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${month}/${day}`
  }

  return `${formatDate(startDate)}~${formatDate(endDate)}`
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
          weeks: [],
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
        weeks: [],
        matrix: {},
      })
    }

    // 주별로 그룹화하고 상품별 수량 집계
    const weekProductMap: { [week: string]: { [product: string]: number } } = {}
    const productSet = new Set<string>()
    const weekSet = new Set<string>()

    // 상품별 SKU 정보 저장
    const productSkuMap: { [product: string]: { seller_sku: string; sku_id: number } } = {}

    orders.forEach((order) => {
      if (!order.created_time || !order.product_name) return

      const date = parseDate(order.created_time)
      if (!date) return
      
      const weekKey = getWeekKey(date) // 해당 날짜가 속한 주의 월요일
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

    // 주 정렬 (월요일 기준) - 이제 각 주는 고유한 월요일 날짜를 가짐
    const sortedWeeks = Array.from(weekSet).sort()
    const products = Array.from(productSet)

    console.log("📅 Weekly data summary:", {
      totalWeeks: sortedWeeks.length,
      weekKeys: sortedWeeks,
      weekRanges: sortedWeeks.map((week) => `${formatWeekDisplay(week)} (${formatWeekRange(week)})`),
    })

    // 각 상품별 총 수량 계산 및 정렬
    const productTotals = products.map((product) => {
      const total = sortedWeeks.reduce((sum, week) => {
        return sum + (weekProductMap[week]?.[product] || 0)
      }, 0)
      return { product, total }
    })

    // 총 수량 기준으로 내림차순 정렬
    productTotals.sort((a, b) => b.total - a.total)
    const sortedProducts = productTotals.map((item) => item.product)

    // 매트릭스 데이터 생성
    const matrix: { [product: string]: { [week: string]: number; total: number } } = {}

    sortedProducts.forEach((product) => {
      matrix[product] = { total: 0 }
      sortedWeeks.forEach((week) => {
        const quantity = weekProductMap[week]?.[product] || 0
        matrix[product][week] = quantity
        matrix[product].total += quantity
      })
    })

    return NextResponse.json({
      products: sortedProducts,
      weeks: sortedWeeks,
      matrix: matrix,
      productSkuMap: productSkuMap,
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
    })
  } catch (err: any) {
    console.error("API /api/weekly-matrix error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
