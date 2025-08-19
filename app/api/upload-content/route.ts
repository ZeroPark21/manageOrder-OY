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
      console.log("📊 파일 텍스트 읽기 완료, 길이:", text.length)
      
      // 다양한 줄바꿈 처리 (Windows \r\n, Mac \r, Unix \n)
      const lines = text.split(/\r?\n|\r/).map(line => line.trim())
      
      console.log(`📊 전체 라인 수: ${lines.length}`)
      
      // 헤더 확인
      if (lines.length > 0) {
        console.log("📊 헤더 행 길이:", lines[0].length)
        console.log("📊 헤더 행 (처음 200자):", lines[0].substring(0, 200))
        
        // 간단한 split으로 컬럼 수 확인
        const simpleColumns = lines[0].split(",")
        console.log(`📊 단순 split 헤더 컬럼 수: ${simpleColumns.length}`)
        console.log("📊 헤더 컬럼 (처음 5개):", simpleColumns.slice(0, 5).map(h => `"${h.trim()}"`).join(", "))
      }
      
      // 빈 줄 제거 전후 비교
      const rawDataLines = lines.slice(1)
      dataLines = rawDataLines.filter((line: string) => line.length > 0)
      
      console.log(`📊 헤더 제외 원본 행 수: ${rawDataLines.length}`)
      console.log(`📊 빈 행 제거 후 데이터 행 수: ${dataLines.length}`)
      console.log(`📊 빈 행으로 제거된 수: ${rawDataLines.length - dataLines.length}`)
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
      console.log("📊 두 번째 데이터 행:", dataLines[1] || "없음")
    }

    const contents: ContentData[] = []
    let processedCount = 0
    let skippedCount = 0
    let invalidColumnCount = 0
    let missingFieldCount = 0
    
    for (const line of dataLines) {
      if (!line || line.trim() === '') {
        skippedCount++
        continue
      }
      
      // CSV 파싱 - 완전히 새로운 방법으로 교체
      let columns: string[] = []
      
      // 단순한 경우: 따옴표가 없는 경우
      if (!line.includes('"')) {
        columns = line.split(',').map(col => col.trim())
      } else {
        // 복잡한 경우: 따옴표가 있는 경우 - 문자 단위로 파싱
        let current = ''
        let inQuotes = false
        let i = 0
        
        while (i < line.length) {
          const char = line[i]
          
          if (char === '"') {
            // 다음 문자가 또 따옴표인지 확인 (이스케이프된 따옴표)
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"'
              i += 2 // 두 문자 건너뛰기
            } else {
              inQuotes = !inQuotes
              i++
            }
          } else if (char === ',' && !inQuotes) {
            columns.push(current.trim())
            current = ''
            i++
          } else {
            current += char
            i++
          }
        }
        
        // 마지막 컬럼 추가
        columns.push(current.trim())
      }
      
      processedCount++
      if (processedCount <= 5) {
        console.log(`🔍 행 ${processedCount} - 컬럼 수: ${columns.length}`)
        console.log(`🔍 컬럼 내용:`, columns.slice(0, 5).map((col, idx) => `[${idx}]: "${col}"`).join(", "))
      }
      
      // 컬럼 수 체크 완전 제거 - 모든 행을 처리 시도
      if (columns.length > 0) {
        // 컬럼이 부족한 경우를 대비한 기본값 설정
        const [
          content_title = "", // Video name
          video_link = "", // Video link
          publish_date = "", // Video post date
          creator_name = "", // Creator username
          gmv = "0",
          affiliate_items_sold = "0",
          affiliate_gmv = "0", // Affiliate shoppable video GMV
          shoppable_avg_order_value = "0",
          est_commission = "0",
          est_flat_fee = "--",
          affiliate_orders = "0",
          shoppable_impressions = "0",
          affiliate_ctr = "0",
          shoppable_gpm = "0",
          affiliate_items_refunded = "0",
          affiliate_refunded_gmv = "0",
          comment_count = "0", // Shoppable video comments
          like_count = "0" // Shoppable video likes
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
        
        // 필수 필드가 있는지 확인 - video_link 또는 content_title 중 하나라도 있으면 처리
        const hasValidTitle = content_title && content_title.trim() !== ''
        const hasValidLink = video_link && video_link.trim() !== ''
        
        if (hasValidTitle || hasValidLink) {
          contents.push({
            content_title: content_title || "제목 없음",
            creator_name: creator_name || "크리에이터 없음",
            publish_date: formattedDate,
            video_link: video_link || `generated-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
        } else {
          missingFieldCount++
          if (missingFieldCount <= 10) {
            console.log(`⚠️ 행 ${processedCount} 건너뜀 - title과 link 모두 없음`)
            console.log(`   title: "${content_title}", link: "${video_link}"`)
            console.log(`   전체 내용: ${line.substring(0, 200)}...`)
          }
        }
      } else {
        invalidColumnCount++
        if (invalidColumnCount <= 10) {
          console.log(`⚠️ 행 ${processedCount} 건너뜀 - 빈 행`)
          console.log(`   내용: "${line}"`)
        }
      }
    }

    console.log(`📊 처리 결과:`)
    console.log(`  - 전체 행: ${dataLines.length}`)
    console.log(`  - 처리된 행: ${processedCount}`)
    console.log(`  - 빈 행: ${skippedCount}`)
    console.log(`  - 컬럼 수 부족: ${invalidColumnCount}`)
    console.log(`  - 필수 필드 누락: ${missingFieldCount}`)
    console.log(`  - 유효한 콘텐츠: ${contents.length}`)
    console.log(`  - 누락된 콘텐츠: ${dataLines.length - contents.length}개`)
    
    if (contents.length > 0) {
      console.log("🔍 첫 번째 콘텐츠 데이터:", JSON.stringify(contents[0], null, 2))
    } else {
      console.log("❌ 유효한 콘텐츠가 없습니다. 컬럼 수가 4개 미만이거나 데이터 형식이 맞지 않습니다.")
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 })
    }

    const supabase = createServerClient()
    console.log("🔗 Supabase 클라이언트 생성 완료")

    // 스마트 업서트 처리 - 중복 체크 및 데이터 비교
    console.log("📤 스마트 데이터 업서트 시작...")
    
    try {
      let insertedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      let errorCount = 0
      
      for (const newContent of contents) {
        try {
          // 1. video_link 기준으로 기존 데이터 조회
          const { data: existingData, error: selectError } = await supabase
            .from("contents")
            .select("*")
            .eq("video_link", newContent.video_link)
            .single()

          if (selectError && selectError.code !== 'PGRST116') {
            // PGRST116은 "not found" 에러 코드
            console.error(`조회 오류 (${newContent.video_link}):`, selectError)
            errorCount++
            continue
          }

          if (!existingData) {
            // 2. 새로운 데이터 - 바로 삽입
            const { error: insertError } = await supabase
              .from("contents")
              .insert(newContent)

            if (insertError) {
              console.error(`삽입 오류 (${newContent.video_link}):`, insertError)
              errorCount++
            } else {
              insertedCount++
              console.log(`✅ 새 콘텐츠 삽입: ${newContent.content_title}`)
            }
          } else {
            // 3. 기존 데이터 존재 - video_link, content_title, creator_name 확인
            const isSameContent = (
              existingData.video_link === newContent.video_link &&
              existingData.content_title === newContent.content_title &&
              existingData.creator_name === newContent.creator_name
            )

            if (!isSameContent) {
              console.log(`⚠️ 다른 콘텐츠 (동일 video_link): ${newContent.video_link}`)
              skippedCount++
              continue
            }

            // 4. 동일한 콘텐츠 - gmv, shoppable_impressions 비교
            const hasDataChanged = (
              existingData.gmv !== newContent.gmv ||
              existingData.shoppable_impressions !== newContent.shoppable_impressions ||
              existingData.affiliate_items_sold !== newContent.affiliate_items_sold ||
              existingData.affiliate_orders !== newContent.affiliate_orders ||
              existingData.est_commission !== newContent.est_commission ||
              existingData.comment_count !== newContent.comment_count ||
              existingData.like_count !== newContent.like_count
            )

            if (hasDataChanged) {
              // 5. 데이터가 변경됨 - 최신 데이터로 업데이트
              const { error: updateError } = await supabase
                .from("contents")
                .update(newContent)
                .eq("video_link", newContent.video_link)

              if (updateError) {
                console.error(`업데이트 오류 (${newContent.video_link}):`, updateError)
                errorCount++
              } else {
                updatedCount++
                console.log(`🔄 콘텐츠 업데이트: ${newContent.content_title} (GMV: ${existingData.gmv} → ${newContent.gmv})`)
              }
            } else {
              // 6. 모든 값이 동일 - 무시
              skippedCount++
              console.log(`⏭️ 동일한 데이터로 스킵: ${newContent.content_title}`)
            }
          }
        } catch (itemError) {
          console.error(`항목 처리 오류 (${newContent.video_link}):`, itemError)
          errorCount++
        }
      }

      console.log("📊 처리 결과:")
      console.log(`  - 삽입: ${insertedCount}개`)
      console.log(`  - 업데이트: ${updatedCount}개`)
      console.log(`  - 스킵: ${skippedCount}개`)
      console.log(`  - 오류: ${errorCount}개`)

      // 업데이트 후 전체 레코드 수 확인
      const { count } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        message: `콘텐츠 처리 완료: 삽입 ${insertedCount}개, 업데이트 ${updatedCount}개, 스킵 ${skippedCount}개`,
        processedCount: contents.length,
        insertedCount: insertedCount,
        updatedCount: updatedCount,
        skippedCount: skippedCount,
        errorCount: errorCount,
        totalRecordsInDB: count
      })
      
    } catch (error) {
      console.error("스마트 업서트 처리 중 오류:", error)
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