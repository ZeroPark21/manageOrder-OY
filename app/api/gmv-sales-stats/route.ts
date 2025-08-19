import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // 전체 통계 쿼리 (배치 방식으로 모든 데이터 가져오기)
    let allOrders = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      try {
        const { data: batch, error: batchError } = await supabase
          .from('orders')
          .select('*')
          .range(offset, offset + batchSize - 1)
        
        if (batchError) {
          console.error(`[gmv-sales-stats] 배치 조회 오류 (offset ${offset}):`, batchError)
          // 첫 번째 배치에서 실패하면 전체 실패, 아니면 계속 진행
          if (offset === 0) {
            throw batchError
          }
          break
        }
        
        if (batch && batch.length > 0) {
          allOrders = [...allOrders, ...batch]
          console.log(`[gmv-sales-stats] 배치 ${Math.floor(offset / batchSize) + 1}: ${batch.length}개 (총 ${allOrders.length}개)`)
          offset += batchSize
          
          if (batch.length < batchSize) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
        
        // 배치 간 짧은 대기 (과부하 방지)
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      } catch (batchErr) {
        console.error(`[gmv-sales-stats] 배치 처리 중 예외 (offset ${offset}):`, batchErr)
        if (offset === 0) {
          throw batchErr
        }
        break
      }
    }
    
    console.log(`[gmv-sales-stats] Total orders fetched: ${allOrders.length}`)
    
    // 날짜 파싱 함수
    function parseDate(dateStr) {
      if (!dateStr) return null
      
      try {
        if (dateStr.includes('/')) {
          const parts = dateStr.split(' ')
          const datePart = parts[0]
          const timePart = parts[1] || "00:00:00"
          const ampm = parts[2] || ""
          
          const [month, day, year] = datePart.split('/')
          
          if (timePart !== "00:00:00") {
            const [hours, minutes, seconds] = timePart.split(':')
            let hour = parseInt(hours)
            if (ampm === 'PM' && hour !== 12) hour += 12
            if (ampm === 'AM' && hour === 12) hour = 0
            
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes) || 0, parseInt(seconds) || 0)
          } else {
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
        }
        
        if (dateStr.includes('T')) {
          return new Date(dateStr)
        }
        
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return new Date(dateStr + 'T00:00:00')
        }
        
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date
        }
        
        return null
      } catch (e) {
        return null
      }
    }
    
    // 6월 1일 이후 데이터만 필터링 (월별 매트릭스와 동일한 기준)
    const startDate = new Date(2025, 5, 1) // 2025년 6월 1일
    const filteredOrders = allOrders.filter(order => {
      const orderDate = parseDate(order.created_time)
      return orderDate && orderDate >= startDate
    })
    
    console.log(`[gmv-sales-stats] Filtered to ${filteredOrders.length} orders from June 1st`)
    const orders = filteredOrders
    
    // 판매 vs 샘플 vs 허수 구분
    // 실제 판매: sku_unit_original_price가 0보다 크고 숫자인 경우
    const salesOrders = orders?.filter(order => {
      const price = order.sku_unit_original_price
      return typeof price === 'number' && !isNaN(price) && price > 0
    }) || []
    
    // 샘플: sku_unit_original_price가 정확히 0인 경우
    const sampleOrders = orders?.filter(order => {
      const price = order.sku_unit_original_price
      return typeof price === 'number' && !isNaN(price) && price === 0
    }) || []
    
    // 허수: sku_unit_original_price가 텍스트이거나 유효하지 않은 값인 경우
    const invalidOrders = orders?.filter(order => {
      const price = order.sku_unit_original_price
      return typeof price !== 'number' || isNaN(price)
    }) || []
    
    // 취소된 주문 구분
    const cancelledSales = salesOrders.filter(order => 
      order.order_status === 'Cancelled' || 
      order.order_status === 'Canceled' ||
      order.cancelled_time !== null
    )
    
    const cancelledSamples = sampleOrders.filter(order => 
      order.order_status === 'Cancelled' || 
      order.order_status === 'Canceled' ||
      order.cancelled_time !== null
    )
    
    // 허수 중 취소된 주문 구분
    const cancelledInvalid = invalidOrders.filter(order => 
      order.order_status === 'Cancelled' || 
      order.order_status === 'Canceled' ||
      order.cancelled_time !== null
    )
    
    // 통계 계산
    const stats = {
      // 실제 판매 통계
      sales: {
        totalOrders: salesOrders.length,
        totalAmount: salesOrders.reduce((sum, order) => sum + (order.order_amount || 0), 0),
        totalQuantity: salesOrders.reduce((sum, order) => sum + (order.quantity || 0), 0),
        cancelledOrders: cancelledSales.length,
        cancelledAmount: cancelledSales.reduce((sum, order) => sum + (order.order_amount || 0), 0),
        cancelledQuantity: cancelledSales.reduce((sum, order) => sum + (order.quantity || 0), 0),
        activeOrders: salesOrders.length - cancelledSales.length,
        activeAmount: salesOrders.reduce((sum, order) => sum + (order.order_amount || 0), 0) - 
                     cancelledSales.reduce((sum, order) => sum + (order.order_amount || 0), 0)
      },
      
      // 샘플 통계
      samples: {
        totalOrders: sampleOrders.length,
        totalQuantity: sampleOrders.reduce((sum, order) => sum + (order.quantity || 0), 0),
        cancelledOrders: cancelledSamples.length,
        cancelledQuantity: cancelledSamples.reduce((sum, order) => sum + (order.quantity || 0), 0),
        activeOrders: sampleOrders.length - cancelledSamples.length,
        activeQuantity: sampleOrders.reduce((sum, order) => sum + (order.quantity || 0), 0) - 
                       cancelledSamples.reduce((sum, order) => sum + (order.quantity || 0), 0)
      },
      
      // 허수 통계
      invalid: {
        totalOrders: invalidOrders.length,
        totalQuantity: invalidOrders.reduce((sum, order) => sum + (order.quantity || 0), 0),
        cancelledOrders: cancelledInvalid.length,
        cancelledQuantity: cancelledInvalid.reduce((sum, order) => sum + (order.quantity || 0), 0),
        activeOrders: invalidOrders.length - cancelledInvalid.length,
        activeQuantity: invalidOrders.reduce((sum, order) => sum + (order.quantity || 0), 0) - 
                       cancelledInvalid.reduce((sum, order) => sum + (order.quantity || 0), 0)
      },
      
      // 전체 통계
      total: {
        orders: orders?.length || 0,
        sales: salesOrders.length,
        samples: sampleOrders.length,
        invalid: invalidOrders.length,
        cancelled: cancelledSales.length + cancelledSamples.length + cancelledInvalid.length
      }
    }
    
    const response = NextResponse.json({ success: true, data: stats })
    
    // 캐시 방지 헤더 추가 (Vercel 강화)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Vary', '*')
    response.headers.set('X-Vercel-Cache', 'MISS')
    
    return response
    
  } catch (error: any) {
    console.error('GMV Sales Stats Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}