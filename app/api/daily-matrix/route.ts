import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // URL 파라미터에서 날짜 범위 가져오기
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // 기본값: 현재 월의 첫날
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    // 2025년 6월 이전이면 6월로 설정
    let defaultStartDate: string
    if (!startDate) {
      if (currentYear === 2025 && currentMonth < 6) {
        defaultStartDate = "2025-06-01"
      } else {
        defaultStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      }
    } else {
      defaultStartDate = startDate
    }
    const defaultEndDate: string = endDate || now.toISOString().split('T')[0]

    // 데이터 조회 - 샘플만 조회 (sku_unit_original_price = 0)
    // 날짜에 시간을 추가하여 전체 날짜 범위를 포함하도록 수정
    const startDateTime = `${defaultStartDate}T00:00:00`
    const endDateTime = `${defaultEndDate}T23:59:59`
    
    // 모든 샘플 데이터를 배치로 가져오기
    let allOrders: OrderData[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select("id, product_name, seller_sku, sku_id, quantity, created_time, sku_unit_original_price")
        .eq("sku_unit_original_price", 0)  // 샘플만 필터링
        .order("created_time", { ascending: true })
        .range(offset, offset + batchSize - 1)
      
      if (dbError) {
        console.error(`Error fetching batch at offset ${offset}:`, dbError)
        if (offset === 0) {
          if ((dbError as any).code === "42P01") {
            return NextResponse.json({
              products: [],
              dates: [],
              matrix: {},
            })
          }
          return NextResponse.json({ error: dbError.message }, { status: 500 })
        }
        break
      }
      
      if (data && data.length > 0) {
        allOrders = [...allOrders, ...data]
        offset += batchSize
        
        if (data.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    console.log(`[daily-matrix] Total samples from DB: ${allOrders.length}`)
    if (allOrders.length > 0) {
      console.log(`[daily-matrix] Sample created_time formats:`, allOrders.slice(0, 3).map(o => o.created_time))
    }
    
    // 클라이언트 측에서 날짜 필터링
    const filterStartDate = new Date(defaultStartDate)
    const filterEndDate = new Date(defaultEndDate)
    filterEndDate.setHours(23, 59, 59, 999)
    
    console.log(`[daily-matrix] Filter range: ${defaultStartDate} to ${defaultEndDate}`)
    
    const orders = allOrders.filter(order => {
      const orderDate = parseDate(order.created_time)
      if (!orderDate) {
        console.log(`[daily-matrix] Failed to parse date: ${order.created_time}`)
        return false
      }
      return orderDate >= filterStartDate && orderDate <= filterEndDate
    })
    
    console.log(`[daily-matrix] Filtered ${orders.length} orders from ${allOrders.length} total samples`)

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

      const parsedDate = parseDate(order.created_time)
      if (!parsedDate) return
      
      const date = parsedDate.toISOString().split("T")[0] // YYYY-MM-DD
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

    // 날짜 범위 생성 (빈 날짜도 포함)
    const startDateObj = new Date(defaultStartDate)
    const endDateObj = new Date(defaultEndDate)
    const allDates: string[] = []
    
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      allDates.push(new Date(d).toISOString().split("T")[0])
    }
    
    const sortedDates = allDates
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
