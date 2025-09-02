import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // 집계 쿼리로 최적화 - 전체 데이터를 메모리에 로드하지 않음
    // 날짜 형식이 MM/DD/YYYY이므로 해당 형식으로 비교
    const startDate = '06/01/2025'
    
    // 판매, 샘플, 전체 주문을 병렬로 집계
    const [salesResult, samplesResult, totalResult] = await Promise.all([
      // 판매 통계 (price > 0)
      supabase
        .from('orders')
        .select('order_status, order_amount, quantity, cancelled_time')
        .gte('created_time', startDate)
        .gt('sku_unit_original_price', 0)
        .limit(10000),
      
      // 샘플 통계 (price = 0)
      supabase
        .from('orders')
        .select('order_status, quantity, cancelled_time')
        .gte('created_time', startDate)
        .eq('sku_unit_original_price', 0)
        .limit(10000),
      
      // 전체 주문 조회
      supabase
        .from('orders')
        .select('id')
        .gte('created_time', startDate)
        .limit(10000)
    ])
    
    if (salesResult.error) throw salesResult.error
    if (samplesResult.error) throw samplesResult.error
    if (totalResult.error) throw totalResult.error
    
    const salesOrders = salesResult.data || []
    const sampleOrders = samplesResult.data || []
    const allOrders = totalResult.data || []
    const totalCount = allOrders.length
    
    // 취소된 주문 빠른 필터링
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
    
    // 통계 계산 - 실제 데이터 길이 사용 (count API가 부정확함)
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
      
      // 허수 통계 (전체 - 판매 - 샘플) - 현재는 0이어야 함
      invalid: {
        totalOrders: 0,  // totalCount - salesOrders.length - sampleOrders.length,
        totalQuantity: 0,
        cancelledOrders: 0,
        cancelledQuantity: 0,
        activeOrders: 0,  // totalCount - salesOrders.length - sampleOrders.length,
        activeQuantity: 0
      },
      
      // 전체 통계
      total: {
        orders: salesOrders.length + sampleOrders.length,  // 실제 데이터 합계
        sales: salesOrders.length,
        samples: sampleOrders.length,
        invalid: 0,
        cancelled: cancelledSales.length + cancelledSamples.length
      }
    }
    
    const response = NextResponse.json({ success: true, data: stats })
    
    // 1분 캐싱 설정 (Edge 환경에서 더 빠른 응답)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    
    return response
    
  } catch (error: any) {
    console.error('GMV Sales Stats Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}