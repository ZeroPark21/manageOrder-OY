import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import * as XLSX from "xlsx"

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

    // 파일 처리 - Excel 또는 CSV
    let dataLines: string[] = []
    
    // 파일 내용을 확인하여 실제 형식 판단
    const buffer = await file.arrayBuffer()
    let isExcel = false
    
    // Excel 파일 시그니처 확인 (PK\x03\x04 또는 \xd0\xcf)
    const uint8Array = new Uint8Array(buffer)
    if ((uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) || // XLSX
        (uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF)) { // XLS
      isExcel = true
    }
    
    if (isExcel || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Excel 파일 처리
      console.log("📊 Excel 파일 처리 시작 (실제 Excel 형식)")
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Excel을 CSV 문자열로 변환
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      const lines = csv.split("\n")
      dataLines = lines.slice(1).filter((line: string) => line.trim())
    } else {
      // CSV 파일 처리
      console.log("📊 CSV 파일 처리 시작")
      const text = new TextDecoder().decode(buffer)
      const lines = text.split("\n")
      dataLines = lines.slice(1).filter((line: string) => line.trim())
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

    // upsert를 사용하여 기존 데이터는 업데이트하고 새 데이터는 추가
    const { data, error: insertError } = await supabase
      .from("contents")
      .upsert(contents, {
        onConflict: 'video_link', // video_link를 기준으로 중복 체크
        ignoreDuplicates: false // 중복 시 업데이트
      })
      .select()

    if (insertError) {
      console.error("데이터 삽입 실패:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log("✅ 콘텐츠 업서트 완료")

    // 업서트 후 전체 레코드 수 확인
    const { count } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      message: "콘텐츠 데이터가 성공적으로 업서트되었습니다.",
      processedCount: contents.length,
      totalRecordsInDB: count,
      data: data
    })

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
} 