import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 실제 판매 데이터 개수 확인
    const { data: salesCount, error: countError } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .gt("sku_unit_original_price", 0)
    
    // 몇 개의 샘플 데이터 가져오기
    const { data: sampleData, error: sampleError } = await supabase
      .from("orders")
      .select("*")
      .gt("sku_unit_original_price", 0)
      .limit(5)
    
    // 날짜 범위 확인
    const { data: dateRange, error: dateError } = await supabase
      .from("orders")
      .select("delivered_time")
      .gt("sku_unit_original_price", 0)
      .order("delivered_time", { ascending: true })
      .limit(1)
    
    const { data: lastDate, error: lastError } = await supabase
      .from("orders")
      .select("delivered_time")
      .gt("sku_unit_original_price", 0)
      .order("delivered_time", { ascending: false })
      .limit(1)
    
    // 7월 이후 데이터 개수
    const { data: julyCount, error: julyError } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .gt("sku_unit_original_price", 0)
      .gte("delivered_time", "2024-07-01")
      .not("delivered_time", "is", null)
    
    return NextResponse.json({
      totalSalesOrders: salesCount,
      sampleData: sampleData?.map(d => ({
        order_id: d.order_id,
        delivered_time: d.delivered_time,
        product_name: d.product_name,
        sku_unit_original_price: d.sku_unit_original_price,
        sku_quantity: d.sku_quantity
      })),
      dateRange: {
        first: dateRange?.[0]?.delivered_time,
        last: lastDate?.[0]?.delivered_time
      },
      ordersAfterJuly: julyCount,
      errors: {
        count: countError?.message,
        sample: sampleError?.message,
        date: dateError?.message,
        july: julyError?.message
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}