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

    // CSV 텍스트 읽기
    const text = await file.text()
    const lines = text.split(/\r?\n|\r/)
    
    // 헤더 제거
    const dataLines = lines.slice(1).filter(line => line.trim())
    
    if (dataLines.length === 0) {
      return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 })
    }

    // 간단한 CSV 파싱 (첫 10개만 처리)
    const contents = []
    const maxRows = Math.min(dataLines.length, 10) // 최대 10개만
    
    for (let i = 0; i < maxRows; i++) {
      const line = dataLines[i]
      const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''))
      
      if (columns.length >= 4) {
        contents.push({
          content_title: columns[0] || `콘텐츠 ${i + 1}`,
          video_link: columns[1] || '',
          publish_date: columns[2] || new Date().toISOString(),
          creator_name: columns[3] || '알 수 없음',
          gmv: parseFloat(columns[4] || '0') || 0,
          affiliate_items_sold: parseInt(columns[5] || '0') || 0,
          affiliate_gmv: parseFloat(columns[6] || '0') || 0,
          shoppable_avg_order_value: parseFloat(columns[7] || '0') || 0,
          est_commission: parseFloat(columns[8] || '0') || 0,
          est_flat_fee: columns[9] || '--',
          affiliate_orders: parseInt(columns[10] || '0') || 0,
          shoppable_impressions: parseInt(columns[11] || '0') || 0,
          affiliate_ctr: parseFloat(columns[12] || '0') || 0,
          shoppable_gpm: parseFloat(columns[13] || '0') || 0,
          affiliate_items_refunded: parseInt(columns[14] || '0') || 0,
          affiliate_refunded_gmv: parseFloat(columns[15] || '0') || 0,
          comment_count: parseInt(columns[16] || '0') || 0,
          like_count: parseInt(columns[17] || '0') || 0,
        })
      }
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 })
    }

    // Supabase에 저장
    const supabase = createServerClient()
    const { error } = await supabase
      .from("contents")
      .upsert(contents, { onConflict: 'video_link' })

    if (error) {
      return NextResponse.json({ 
        error: "데이터 저장 실패", 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: "업로드 완료",
      processedCount: contents.length,
      uploadedCount: contents.length,
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