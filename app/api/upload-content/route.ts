import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

interface ContentData {
  content_title: string
  creator_name: string
  publish_date: string
  video_link: string
  gmv: number
  affiliate_items_sold: number
  affiliate_gmv: number
  shoppable_avg_order_value: number
  est_commission: number
  est_flat_fee: string
  affiliate_orders: number
  shoppable_impressions: number
  affiliate_ctr: number
  shoppable_gpm: number
  affiliate_items_refunded: number
  affiliate_refunded_gmv: number
  comment_count: number
  like_count: number
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 콘텐츠 업로드 API 시작")
    
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("📁 파일 정보:", {
      name: file?.name,
      size: file?.size,
      type: file?.type
    })

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    // 파일 내용 읽기
    const text = await file.text()
    const lines = text.split("\n")
    const dataLines = lines.slice(1).filter((line: string) => line.trim())
    
    console.log(`📊 파일 처리 완료: ${file.name}, 데이터 행 수: ${dataLines.length}`)
    console.log("📊 첫 번째 데이터 행:", dataLines[0])

    const contents: ContentData[] = []
    
    for (const line of dataLines) {
      // CSV 파싱 (쉼표가 포함된 텍스트 처리)
      const columns: string[] = []
      let current = ""
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      columns.push(current.trim()) // 마지막 컬럼
      
      if (columns.length >= 18) {
        const [
          content_title, // Video name
          video_link, // Video link
          publish_date, // Video post date
          creator_name, // Creator username
          gmv,
          affiliate_items_sold,
          affiliate_gmv, // Affiliate shoppable video GMV
          shoppable_avg_order_value,
          est_commission,
          est_flat_fee,
          affiliate_orders,
          shoppable_impressions,
          affiliate_ctr,
          shoppable_gpm,
          affiliate_items_refunded,
          affiliate_refunded_gmv,
          comment_count, // Shoppable video comments
          like_count // Shoppable video likes
        ] = columns
        
        // 날짜 형식 변환 (예: 2025-07-01 형식으로)
        let formattedDate = publish_date
        if (publish_date.includes("/")) {
          const [month, day, year] = publish_date.split("/")
          formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        }
        
        contents.push({
          content_title: content_title || "제목 없음",
          creator_name: creator_name || "크리에이터 없음",
          publish_date: formattedDate,
          video_link: video_link || "",
          gmv: parseFloat(gmv) || 0,
          affiliate_items_sold: parseInt(affiliate_items_sold) || 0,
          affiliate_gmv: parseFloat(affiliate_gmv) || 0,
          shoppable_avg_order_value: parseFloat(shoppable_avg_order_value) || 0,
          est_commission: parseFloat(est_commission) || 0,
          est_flat_fee: est_flat_fee || "--",
          affiliate_orders: parseInt(affiliate_orders) || 0,
          shoppable_impressions: parseInt(shoppable_impressions) || 0,
          affiliate_ctr: parseFloat(affiliate_ctr) || 0,
          shoppable_gpm: parseFloat(shoppable_gpm) || 0,
          affiliate_items_refunded: parseInt(affiliate_items_refunded) || 0,
          affiliate_refunded_gmv: parseFloat(affiliate_refunded_gmv) || 0,
          comment_count: parseInt(comment_count) || 0,
          like_count: parseInt(like_count) || 0,
        })
      }
    }

    console.log(`📊 처리된 콘텐츠 수: ${contents.length}`)

    if (contents.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 })
    }

    const supabase = createServerClient()
    console.log("🔗 Supabase 클라이언트 생성 완료")

    // 기존 데이터 삭제 (선택사항)
    const { error: deleteError } = await supabase
      .from("contents")
      .delete()
      .gte("publish_date", "2025-07-01")

    if (deleteError) {
      console.warn("기존 데이터 삭제 실패:", deleteError)
    }

    // 새 데이터 삽입
    const { data, error: insertError } = await supabase
      .from("contents")
      .insert(contents)
      .select()

    if (insertError) {
      console.error("데이터 삽입 실패:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("✅ 콘텐츠 업로드 완료")

    return NextResponse.json({
      message: "콘텐츠 데이터가 성공적으로 업로드되었습니다.",
      uploadedCount: contents.length,
      data: data
    })

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
} 