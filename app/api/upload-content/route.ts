import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// Node.js Runtime 사용 (더 긴 실행 시간 허용)
export const runtime = "nodejs"
export const maxDuration = 10 // 10초로 제한

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
  console.log("🚀 콘텐츠 업로드 API 시작")
  
  try {
    // Content-Type 확인
    const contentType = request.headers.get("content-type")
    console.log("📝 Content-Type:", contentType)
    
    let formData
    try {
      formData = await request.formData()
    } catch (formError) {
      console.error("FormData 파싱 오류:", formError)
      return NextResponse.json({ 
        error: "요청 데이터를 파싱할 수 없습니다.",
        details: formError instanceof Error ? formError.message : "Unknown error"
      }, { status: 400 })
    }
    
    const file = formData.get("file") as File

    console.log("📁 파일 정보:", {
      name: file?.name,
      size: file?.size,
      type: file?.type
    })

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }
    
    // 파일 크기 제한 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기가 10MB를 초과합니다." }, { status: 400 })
    }

    // 파일 처리 - CSV만 지원 (Edge Runtime 호환)
    let dataLines: string[] = []
    
    try {
      const text = await file.text()
      console.log("📊 파일 텍스트 읽기 완료")
      
      const lines = text.split("\n")
      dataLines = lines.slice(1).filter((line: string) => line.trim())
      
      console.log(`📊 데이터 행 수: ${dataLines.length}`)
    } catch (readError) {
      console.error("파일 읽기 오류:", readError)
      return NextResponse.json({ 
        error: "파일을 읽을 수 없습니다. CSV 파일인지 확인해주세요.",
        details: readError instanceof Error ? readError.message : "Unknown error"
      }, { status: 400 })
    }
    
    console.log(`📊 파일 처리 완료: ${file.name}, 데이터 행 수: ${dataLines.length}`)
    if (dataLines.length > 0) {
      console.log("📊 첫 번째 데이터 행:", dataLines[0])
    }

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
      
      console.log(`🔍 컬럼 수: ${columns.length}, 첫 번째 컬럼: ${columns[0]}`)
      
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
        
        // 날짜 형식 처리
        let formattedDate = publish_date
        try {
          // YYYY-MM-DD 형식 확인
          if (publish_date.includes("-") && publish_date.split("-").length === 3) {
            formattedDate = publish_date
          }
          // MM/DD/YYYY 형식
          else if (publish_date.includes("/")) {
            const parts = publish_date.split("/")
            if (parts.length === 3) {
              const [month, day, year] = parts
              formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
            }
          }
          // 다른 형식이면 그대로 사용
        } catch (e) {
          console.log(`⚠️ 날짜 형식 변환 실패: ${publish_date}`)
        }
        
        contents.push({
          content_title: content_title || "제목 없음",
          creator_name: creator_name || "크리에이터 없음",
          publish_date: formattedDate,
          video_link: video_link || "",
          gmv: parseFloat(gmv.toString().replace(/[^0-9.-]/g, '')) || 0,
          affiliate_items_sold: parseInt(affiliate_items_sold.toString().replace(/[^0-9-]/g, '')) || 0,
          affiliate_gmv: parseFloat(affiliate_gmv.toString().replace(/[^0-9.-]/g, '')) || 0,
          shoppable_avg_order_value: parseFloat(shoppable_avg_order_value.toString().replace(/[^0-9.-]/g, '')) || 0,
          est_commission: parseFloat(est_commission.toString().replace(/[^0-9.-]/g, '')) || 0,
          est_flat_fee: est_flat_fee || "--",
          affiliate_orders: parseInt(affiliate_orders.toString().replace(/[^0-9-]/g, '')) || 0,
          shoppable_impressions: parseInt(shoppable_impressions.toString().replace(/[^0-9-]/g, '')) || 0,
          affiliate_ctr: parseFloat(affiliate_ctr.toString().replace(/[^0-9.-]/g, '').replace('%', '')) || 0,
          shoppable_gpm: parseFloat(shoppable_gpm.toString().replace(/[^0-9.-]/g, '')) || 0,
          affiliate_items_refunded: parseInt(affiliate_items_refunded.toString().replace(/[^0-9-]/g, '')) || 0,
          affiliate_refunded_gmv: parseFloat(affiliate_refunded_gmv.toString().replace(/[^0-9.-]/g, '')) || 0,
          comment_count: parseInt(comment_count.toString().replace(/[^0-9-]/g, '')) || 0,
          like_count: parseInt(like_count.toString().replace(/[^0-9-]/g, '')) || 0,
        })
      }
    }

    console.log(`📊 처리된 콘텐츠 수: ${contents.length}`)
    if (contents.length > 0) {
      console.log("🔍 첫 번째 콘텐츠 데이터:", JSON.stringify(contents[0], null, 2))
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 })
    }

    const supabase = createServerClient()
    console.log("🔗 Supabase 클라이언트 생성 완료")

    // 간단한 upsert 처리 (배치 없이 전체 한번에)
    console.log("📤 데이터 업서트 시작...")
    
    try {
      // 모든 데이터를 한 번에 upsert
      const { data, error: insertError } = await supabase
        .from("contents")
        .upsert(contents, {
          onConflict: 'video_link',
          ignoreDuplicates: false
        })
        .select()

      if (insertError) {
        console.error("데이터 삽입 실패:", insertError)
        
        // ON CONFLICT 오류인 경우
        if (insertError.message.includes('ON CONFLICT') || insertError.message.includes('unique constraint')) {
          // 개별 처리 시도
          console.log("🔄 개별 처리 모드로 전환...")
          let successCount = 0
          
          for (const content of contents) {
            try {
              const { error: singleError } = await supabase
                .from("contents")
                .upsert(content, {
                  onConflict: 'video_link',
                  ignoreDuplicates: true
                })
              
              if (!singleError) {
                successCount++
              }
            } catch (e) {
              // 개별 오류는 무시
            }
          }
          
          return NextResponse.json({
            message: `${successCount}개의 콘텐츠가 업로드되었습니다.`,
            processedCount: successCount,
            uploadedCount: successCount,
            totalCount: contents.length
          })
        }
        
        return NextResponse.json({ 
          error: insertError.message,
          processedCount: 0
        }, { status: 500 })
      }

      console.log("✅ 콘텐츠 업서트 완료")

      // 업서트 후 전체 레코드 수 확인
      const { count } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        message: "콘텐츠 데이터가 성공적으로 업서트되었습니다.",
        processedCount: contents.length,
        uploadedCount: contents.length,
        totalRecordsInDB: count
      })
      
    } catch (error) {
      console.error("업서트 처리 중 오류:", error)
      return NextResponse.json({ 
        error: "데이터 처리 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    console.error("오류 스택:", err.stack)
    
    // 더 자세한 오류 메시지 반환
    const errorMessage = err.message || "Internal server error"
    
    // Supabase 관련 오류 처리
    if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
      return NextResponse.json({ 
        error: "중복된 비디오 링크가 있습니다. 데이터를 확인해주세요.",
        details: errorMessage
      }, { status: 400 })
    }
    
    if (errorMessage.includes("invalid input syntax")) {
      return NextResponse.json({ 
        error: "잘못된 데이터 형식입니다. CSV/Excel 파일 형식을 확인해주세요.",
        details: errorMessage
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      type: err.name || "UnknownError"
    }, { status: 500 })
  }
} 