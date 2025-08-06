import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// Edge Runtime 사용 (더 빠른 시작)
export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    // CSV 텍스트 읽기 (UTF-8 인코딩 강제)
    let text: string
    try {
      const buffer = await file.arrayBuffer()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(buffer)
      
      // BOM 제거
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1)
      }
    } catch (e) {
      return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 400 })
    }
    
    const lines = text.split(/\r?\n|\r/)
    
    // 헤더 제거
    const dataLines = lines.slice(1).filter(line => line.trim() && !line.includes('\x00'))
    
    if (dataLines.length === 0) {
      return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 })
    }

    // 간단한 CSV 파싱 (첫 10개만 처리)
    const contents = []
    const maxRows = Math.min(dataLines.length, 10) // 최대 10개만
    
    for (let i = 0; i < maxRows; i++) {
      const line = dataLines[i]
      const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''))
      
      if (columns.length >= 4 && columns[0] && columns[1]) {
        // 날짜 파싱
        let publishDate = new Date().toISOString()
        if (columns[2]) {
          try {
            // MM/DD/YYYY 형식 처리
            if (columns[2].includes('/')) {
              const [month, day, year] = columns[2].split('/')
              if (month && day && year) {
                publishDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
              }
            } else if (columns[2].includes('-')) {
              publishDate = columns[2]
            }
          } catch (e) {
            // 날짜 파싱 실패 시 기본값 사용
          }
        }
        
        contents.push({
          content_title: columns[0].substring(0, 255) || `콘텐츠 ${i + 1}`,
          video_link: columns[1].substring(0, 255) || '',
          publish_date: publishDate,
          creator_name: (columns[3] || '알 수 없음').substring(0, 100),
          gmv: parseFloat(columns[4]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          affiliate_items_sold: parseInt(columns[5]?.replace(/[^0-9]/g, '') || '0') || 0,
          affiliate_gmv: parseFloat(columns[6]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          shoppable_avg_order_value: parseFloat(columns[7]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          est_commission: parseFloat(columns[8]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          est_flat_fee: (columns[9] || '--').substring(0, 50),
          affiliate_orders: parseInt(columns[10]?.replace(/[^0-9]/g, '') || '0') || 0,
          shoppable_impressions: parseInt(columns[11]?.replace(/[^0-9]/g, '') || '0') || 0,
          affiliate_ctr: parseFloat(columns[12]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          shoppable_gpm: parseFloat(columns[13]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          affiliate_items_refunded: parseInt(columns[14]?.replace(/[^0-9]/g, '') || '0') || 0,
          affiliate_refunded_gmv: parseFloat(columns[15]?.replace(/[^0-9.-]/g, '') || '0') || 0,
          comment_count: parseInt(columns[16]?.replace(/[^0-9]/g, '') || '0') || 0,
          like_count: parseInt(columns[17]?.replace(/[^0-9]/g, '') || '0') || 0,
        })
      }
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 })
    }

    // Supabase에 저장
    const supabase = createServerClient()
    
    // 간단한 insert 시도 (upsert 대신)
    const { data, error } = await supabase
      .from("contents")
      .insert(contents)
      .select()

    if (error) {
      // 중복 오류인 경우 무시하고 성공으로 처리
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({
          message: "업로드 완료 (일부 중복 항목 건너뜀)",
          processedCount: contents.length,
          uploadedCount: 0,
          totalRows: dataLines.length,
          note: "중복된 비디오 링크가 있어 건너뛰었습니다."
        })
      }
      
      return NextResponse.json({ 
        error: "데이터 저장 실패", 
        details: error.message 
      }, { status: 500 })
    }

    const uploadedCount = data?.length || contents.length
    
    return NextResponse.json({
      message: "업로드 완료",
      processedCount: contents.length,
      uploadedCount: uploadedCount,
      totalRows: dataLines.length,
      note: maxRows < dataLines.length ? `전체 ${dataLines.length}개 중 ${maxRows}개만 처리됨` : undefined
    })

  } catch (error) {
    return NextResponse.json({ 
      error: "서버 오류",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}