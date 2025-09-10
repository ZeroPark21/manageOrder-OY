import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // 전체 주문 수 확인
    const { count: totalCount } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })
    
    // sku_unit_original_price > 0인 주문 수
    const { count: validCount } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .gt("sku_unit_original_price", 0)
    
    // 샘플 데이터 가져오기
    const { data: sampleData } = await supabase
      .from("orders")
      .select("order_id, delivered_time, product_name, sku_unit_original_price, sku_quantity")
      .limit(10)
    
    // sku_unit_original_price > 0인 샘플
    const { data: validSample } = await supabase
      .from("orders")
      .select("order_id, delivered_time, product_name, sku_unit_original_price, sku_quantity")
      .gt("sku_unit_original_price", 0)
      .limit(5)
    
    // 2025년 7월 이후 + price > 0인 주문 수
    const { count: july2025Count } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })
      .gt("sku_unit_original_price", 0)
      .gte("delivered_time", "07/01/2025")
    
    return NextResponse.json({
      totalOrders: totalCount,
      validOrders: validCount,
      july2025ValidOrders: july2025Count,
      sampleOrders: sampleData,
      validSampleOrders: validSample
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}