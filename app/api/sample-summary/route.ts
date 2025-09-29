import { createServerClient } from "@/lib/database/supabase"
import { NextResponse } from "next/server"

interface OrderData {
  id: number
  product_name: string
  quantity: number
  created_time: string
  order_status?: string
  order_substatus?: string
  shipped_time?: string
  cancelled_time?: string
  sku_unit_original_price: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

    console.log(`📊 /api/sample-summary 호출됨 - Company ID: ${companyId}`)
    const supabase = createServerClient()
    
    // 전체 샘플 데이터 카운트
    const { count: totalCount, error: countError } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .eq("sku_unit_original_price", 0)
      .eq("company_id", companyId)
    
    if (countError) {
      console.error("Database count error:", countError)
      return NextResponse.json({ error: `Database error: ${countError.message}` }, { status: 500 })
    }
    
    console.log(`📊 Total sample orders in database: ${totalCount || 0}`)

    // 상세 상태별 집계를 위해 실제 데이터 조회 (배치로)
    let allOrders: OrderData[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select(`
          id, 
          product_name, 
          quantity, 
          created_time, 
          order_status, 
          order_substatus,
          shipped_time,
          cancelled_time,
          sku_unit_original_price
        `)
        .eq("sku_unit_original_price", 0)
        .eq("company_id", companyId)
        .order("created_time", { ascending: true })
        .range(offset, offset + batchSize - 1)
      
      if (dbError) {
        console.error(`Error fetching batch at offset ${offset}:`, dbError)
        if (offset === 0) {
          return NextResponse.json({ error: dbError.message }, { status: 500 })
        }
        break
      }
      
      if (data && data.length > 0) {
        allOrders = [...allOrders, ...data]
        console.log(`📦 Batch ${Math.floor(offset / batchSize) + 1}: ${data.length}개 (총 ${allOrders.length}개)`)
        offset += batchSize
        
        if (data.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    console.log(`📦 총 조회된 주문 수: ${allOrders.length}`)

    if (allOrders.length === 0) {
      return NextResponse.json({
        totalCount: 0,
        cancelledCount: 0,
        shippedCount: 0,
        pendingCount: 0,
        cancelledOrders: [],
        shippedOrders: []
      })
    }

    // 상태별 집계
    let cancelledCount = 0
    let shippedCount = 0
    let pendingCount = 0
    const cancelledOrders: OrderData[] = []
    const shippedOrders: OrderData[] = []

    allOrders.forEach((order) => {
      // 취소된 주문 판별 (여러 조건으로)
      const isCancelled = 
        order.cancelled_time || 
        order.order_status?.toLowerCase().includes('cancel') ||
        order.order_substatus?.toLowerCase().includes('cancel') ||
        order.order_status?.toLowerCase() === 'cancelled'

      // 발송된 주문 판별
      const isShipped = 
        order.shipped_time ||
        order.order_status?.toLowerCase().includes('ship') ||
        order.order_status?.toLowerCase() === 'shipped' ||
        order.order_substatus?.toLowerCase().includes('ship')

      if (isCancelled) {
        cancelledCount++
        cancelledOrders.push(order)
      } else if (isShipped) {
        shippedCount++
        shippedOrders.push(order)
      } else {
        pendingCount++
      }
    })

    console.log(`📊 상태별 집계:`)
    console.log(`  - 총 주문: ${allOrders.length}개`)
    console.log(`  - 취소: ${cancelledCount}개 (${(cancelledCount/allOrders.length*100).toFixed(2)}%)`)
    console.log(`  - 발송: ${shippedCount}개 (${(shippedCount/allOrders.length*100).toFixed(2)}%)`)
    console.log(`  - 대기: ${pendingCount}개 (${(pendingCount/allOrders.length*100).toFixed(2)}%)`)

    // 실제 발송된 수량 계산 (취소되지 않은 주문들)
    const actualShippedCount = allOrders.length - cancelledCount

    const response = NextResponse.json({
      totalCount: allOrders.length,
      cancelledCount,
      shippedCount: actualShippedCount, // 실제 발송 = 전체 - 취소
      pendingCount,
      actualShippedStatus: shippedCount, // 실제 shipped 상태
      
      // 디버그 정보
      stats: {
        totalOrders: allOrders.length,
        cancelledRate: (cancelledCount / allOrders.length * 100).toFixed(2) + '%',
        shippedRate: (actualShippedCount / allOrders.length * 100).toFixed(2) + '%'
      },
      
      // 샘플 데이터 (처음 3개씩)
      samples: {
        cancelled: cancelledOrders.slice(0, 3).map(o => ({
          id: o.id,
          product_name: o.product_name,
          order_status: o.order_status,
          order_substatus: o.order_substatus,
          cancelled_time: o.cancelled_time,
          created_time: o.created_time
        })),
        shipped: shippedOrders.slice(0, 3).map(o => ({
          id: o.id,
          product_name: o.product_name,
          order_status: o.order_status,
          order_substatus: o.order_substatus,
          shipped_time: o.shipped_time,
          created_time: o.created_time
        }))
      }
    })
    
    // 캐시 방지 헤더
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error("❌ Sample summary API error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}