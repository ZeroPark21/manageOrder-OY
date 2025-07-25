import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // 제품 발송 현황의 총 수량 계산 (7월 1일 이후)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("quantity")
      .gte("order_date", "2025-07-01")
    
    if (ordersError) {
      console.error("주문 데이터 조회 실패:", ordersError)
      throw ordersError
    }
    
    const productTotalQuantity = orders?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0
    
    // 콘텐츠 발행 현황의 총 GMV 계산 (7월 1일 이후)
    const { data: contents, error: contentsError } = await supabase
      .from("contents")
      .select("gmv")
      .gte("publish_date", "2025-07-01")
    
    if (contentsError) {
      console.error("콘텐츠 데이터 조회 실패:", contentsError)
      throw contentsError
    }
    
    const contentTotalGmv = contents?.reduce((sum, content) => sum + (content.gmv || 0), 0) || 0
    
    return NextResponse.json({
      productTotalQuantity,
      contentTotalGmv,
      message: "GMV 데이터 조회 성공"
    })
    
  } catch (err: any) {
    console.error("GMV 조회 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
}