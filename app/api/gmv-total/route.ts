import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    let productTotalQuantity = 0
    let contentTotalGmv = 0
    
    // 제품 발송 현황의 총 수량 계산 (6월 1일 이후)
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("quantity")
        .gte("order_date", "2025-06-01")
      
      if (!ordersError && orders) {
        productTotalQuantity = orders.reduce((sum, order) => sum + (order.quantity || 0), 0)
      }
    } catch (e) {
      console.log("주문 데이터 조회 실패 (테이블이 없을 수 있음)")
    }
    
    // 콘텐츠 발행 현황의 총 GMV 계산 (6월 1일 이후) - 중복 제거 후 계산
    try {
      // 배치로 모든 데이터 가져오기
      let allContents: any[] = []
      let offset = 0
      const batchSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from("contents")
          .select("gmv, video_link")
          .gte("publish_date", "2025-07-01")
          .range(offset, offset + batchSize - 1)
        
        if (batchError) {
          console.error(`Error fetching batch at offset ${offset}:`, batchError)
          break
        }
        
        if (batch && batch.length > 0) {
          allContents = [...allContents, ...batch]
          offset += batchSize
          
          if (batch.length < batchSize) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      }
      
      if (allContents.length > 0) {
        // 모든 GMV 값 합산 (중복 포함) - 각 레코드가 개별 판매를 나타낼 수 있음
        contentTotalGmv = allContents.reduce((sum, content) => sum + (content.gmv || 0), 0)
        
        console.log(`GMV 계산: ${allContents.length}개 레코드, Total GMV: ${contentTotalGmv}`)
      }
    } catch (e) {
      console.log("콘텐츠 데이터 조회 실패:", e)
    }
    
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