import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 실제 판매 데이터 샘플 (price > 0)
    const { data: validSamples, error: validError } = await supabase
      .from("orders")
      .select("order_id, delivered_time, product_name, sku_unit_original_price, sku_quantity")
      .gt("sku_unit_original_price", 0)
      .order("delivered_time", { ascending: false })
      .limit(10)
    
    // 날짜 형식 확인
    let dateFormats = new Set()
    if (validSamples) {
      validSamples.forEach(order => {
        if (order.delivered_time) {
          dateFormats.add(order.delivered_time.substring(0, 10))
        }
      })
    }
    
    // 2025년 7월 이후 데이터 확인
    const { data: july2025Data, count: july2025Count } = await supabase
      .from("orders")
      .select("*", { count: 'exact' })
      .gt("sku_unit_original_price", 0)
      .gte("delivered_time", "07/01/2025")
      .limit(10)
    
    // 전체 통계
    const { data: allValidOrders } = await supabase
      .from("orders")
      .select("quantity, sku_unit_original_price")
      .gt("sku_unit_original_price", 0)
      .gte("delivered_time", "07/01/2025")
    
    let totalQuantity = 0
    let totalRevenue = 0
    if (allValidOrders) {
      allValidOrders.forEach(order => {
        totalQuantity += order.quantity || 0
        totalRevenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
      })
    }
    
    return NextResponse.json({
      validSampleCount: validSamples?.length || 0,
      validSamples: validSamples?.slice(0, 5),
      dateFormats: Array.from(dateFormats),
      july2025Count,
      july2025SampleData: july2025Data?.slice(0, 3),
      totalStats: {
        totalQuantity,
        totalRevenue,
        orderCount: allValidOrders?.length || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}