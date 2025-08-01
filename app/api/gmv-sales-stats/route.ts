import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // 전체 통계 쿼리
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
    
    if (error) throw error
    
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
    
    return NextResponse.json({ success: true, data: stats })
    
  } catch (error: any) {
    console.error('GMV Sales Stats Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}