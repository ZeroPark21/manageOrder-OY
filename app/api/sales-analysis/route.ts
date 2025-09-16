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
  sku_id: string // TEXT 타입으로 수정
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
  const productSkuMap: { [product: string]: { seller_sku: string, sku_id: string } } = {}
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
        sku_id: order.sku_id || ""
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
  // 월요일을 주의 시작으로 설정 (샘플 발송과 동일)
  const startOfWeek = new Date(date)
  const dayOfWeek = date.getDay() // 0=일요일, 1=월요일, ..., 6=토요일
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // 일요일이면 -6, 아니면 1-dayOfWeek
  startOfWeek.setDate(date.getDate() + daysToMonday)

  // 시간을 00:00:00으로 설정하여 정확한 날짜만 반환
  startOfWeek.setHours(0, 0, 0, 0)
  return startOfWeek.toISOString().split("T")[0]
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
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

  return `${formatDate(startDate)}-${formatDate(endDate)}`
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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // URL 파라미터에서 날짜 범위 가져오기
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    console.log(`🔍 Fetching sales data with filters: startDate=${startDate}, endDate=${endDate}`)

    // 모든 매출 데이터를 페이지네이션으로 가져오기
    let allOrders: SalesOrder[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from("orders")
        .select("id, product_name, seller_sku, sku_id, quantity, created_time, order_amount, sku_unit_original_price")
        .gt("order_amount", 0)  // 매출 데이터만 필터링
        .order("created_time", { ascending: true })
        .range(offset, offset + batchSize - 1)
      
      if (batchError) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError)
        if (offset === 0) {
          return NextResponse.json({ error: batchError.message }, { status: 500 })
        }
        break
      }
      
      if (batch && batch.length > 0) {
        allOrders = [...allOrders, ...batch]
        console.log(`📦 Sales batch ${Math.floor(offset / batchSize) + 1}: ${batch.length}개 (총 ${allOrders.length}개)`)
        offset += batchSize
        
        if (batch.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    console.log(`📦 Total sales orders fetched: ${allOrders.length}`)
    
    console.log(`[sales-analysis] Total orders from DB: ${allOrders.length}`)
    if (allOrders.length > 0) {
      console.log(`[sales-analysis] Sample created_time formats:`, allOrders.slice(0, 3).map(o => o.created_time))
    }
    
    // 날짜 필터링 적용 (startDate와 endDate가 제공된 경우)
    let orders = allOrders
    if (startDate && endDate) {
      const filterStartDate = new Date(startDate)
      const filterEndDate = new Date(endDate)
      filterEndDate.setHours(23, 59, 59, 999)
      
      console.log(`[sales-analysis] Filter range: ${startDate} to ${endDate}`)
      
      orders = allOrders.filter(order => {
        const orderDate = parseDate(order.created_time)
        if (!orderDate) {
          console.log(`[sales-analysis] Failed to parse date: ${order.created_time}`)
          return false
        }
        return orderDate >= filterStartDate && orderDate <= filterEndDate
      })
      
      console.log(`[sales-analysis] Filtered ${orders.length} orders from ${allOrders.length} total`)
    }

    if (orders.length === 0) {
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
          productSkuMap: {}
        },
        monthly: {
          months: [],
          products: [],
          matrix: {},
          productSkuMap: {}
        }
      })
    }

    // 데이터 검증 및 정제 (SKU ID를 문자열로 강제 변환)
    const safeOrders = orders.map((o) => ({
      ...o,
      quantity: Number(o.quantity) || 0,
      order_amount: Number(o.order_amount) || 0,
      sku_unit_original_price: Number(o.sku_unit_original_price) || 0,
      sku_id: String(o.sku_id || "") // 강제로 문자열 변환
    }))

    // 요약 통계 계산
    const totalQuantity = safeOrders.reduce((sum, o) => sum + o.quantity, 0)
    const totalRevenue = safeOrders.reduce((sum, o) => sum + o.order_amount, 0)
    const activeProducts = new Set(safeOrders.map((o) => o.product_name)).size

    console.log(`📊 Summary: ${totalQuantity} items, $${totalRevenue}, ${activeProducts} products`)

    // 일별, 주별, 월별 매트릭스 생성
    const dailyMatrix = createMatrix(safeOrders, getDayKey, (key) => key)
    const weeklyMatrix = createMatrix(safeOrders, getWeekKey, formatWeekDisplay)
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
        productSkuMap: weeklyMatrix.productSkuMap
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