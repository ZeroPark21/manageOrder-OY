import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// Edge Runtime 사용 - 스트리밍 응답
export const runtime = "edge"

// 숫자 파싱 헬퍼 함수
function parseNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
  }
  return 0
}

// 날짜 파싱 헬퍼 함수
function parseDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0]
  
  const dateStr = value.toString()
  
  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0]
  }
  
  // MM/DD/YYYY 형식
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
    const [month, day, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  return new Date().toISOString().split('T')[0]
}

// CSV 라인 파싱
function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 })
    }

    // 헤더 파싱
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
    
    const supabase = createServerClient()
    let totalProcessed = 0
    let totalSaved = 0
    const BATCH_SIZE = 5 // 매우 작은 배치 사이즈
    const batch: any[] = []

    // 각 라인을 처리하면서 배치로 저장
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      const videoName = row['Video name'] || row['video_name'] || ''
      const videoLink = row['Video link'] || row['video_link'] || ''
      
      if (!videoName || !videoLink) continue
      
      const content = {
        content_title: videoName.substring(0, 255),
        video_link: videoLink.substring(0, 255),
        publish_date: parseDate(row['Video post date'] || row['publish_date']),
        creator_name: (row['Creator username'] || row['creator_name'] || '알 수 없음').substring(0, 100),
        gmv: parseNumber(row['GMV'] || row['gmv']),
        affiliate_items_sold: Math.round(parseNumber(row['Affiliate items sold '] || row['Affiliate items sold'] || row['affiliate_items_sold'])),
        affiliate_gmv: parseNumber(row['Affiliate shoppable video GMV'] || row['affiliate_gmv']),
        shoppable_avg_order_value: parseNumber(row['Shoppable video avg. order value'] || row['shoppable_avg_order_value']),
        est_commission: parseNumber(row['Est. commission'] || row['est_commission']),
        est_flat_fee: (row['Est. flat fee'] || row['est_flat_fee'] || '--').toString().substring(0, 50),
        affiliate_orders: Math.round(parseNumber(row['Affiliate orders'] || row['affiliate_orders'])),
        shoppable_impressions: Math.round(parseNumber(row['Shoppable video impressions'] || row['shoppable_impressions'])),
        affiliate_ctr: parseNumber(row['Affiliate CTR'] || row['affiliate_ctr']),
        shoppable_gpm: parseNumber(row['Shoppable video GPM'] || row['shoppable_gpm']),
        affiliate_items_refunded: Math.round(parseNumber(row['Affiliate items refunded'] || row['affiliate_items_refunded'])),
        affiliate_refunded_gmv: parseNumber(row['Affiliate refunded GMV'] || row['affiliate_refunded_gmv']),
        comment_count: Math.round(parseNumber(row['Shoppable video comments'] || row['comment_count'])),
        like_count: Math.round(parseNumber(row['Shoppable video likes'] || row['like_count']))
      }
      
      batch.push(content)
      totalProcessed++
      
      // 배치가 가득 차면 저장
      if (batch.length >= BATCH_SIZE) {
        try {
          // 기존 데이터 확인
          const videoLinks = batch.map(b => b.video_link)
          const { data: existing } = await supabase
            .from("contents")
            .select("video_link")
            .in("video_link", videoLinks)
          
          const existingLinks = new Set(existing?.map(e => e.video_link) || [])
          
          // 새 데이터만 삽입
          const toInsert = batch.filter(b => !existingLinks.has(b.video_link))
          if (toInsert.length > 0) {
            const { error } = await supabase
              .from("contents")
              .insert(toInsert)
            
            if (!error) {
              totalSaved += toInsert.length
            }
          }
          
          // 기존 데이터 업데이트
          const toUpdate = batch.filter(b => existingLinks.has(b.video_link))
          for (const item of toUpdate) {
            const { error } = await supabase
              .from("contents")
              .update(item)
              .eq("video_link", item.video_link)
            
            if (!error) {
              totalSaved++
            }
          }
        } catch (e) {
          // 오류 무시하고 계속
        }
        
        batch.length = 0 // 배치 비우기
      }
    }
    
    // 마지막 배치 처리
    if (batch.length > 0) {
      try {
        const { error } = await supabase
          .from("contents")
          .insert(batch)
        
        if (!error) {
          totalSaved += batch.length
        }
      } catch (e) {
        // 오류 무시
      }
    }

    return NextResponse.json({
      message: "콘텐츠 데이터가 성공적으로 업로드되었습니다.",
      processedCount: totalProcessed,
      uploadedCount: totalSaved
    })

  } catch (err: any) {
    console.error("업로드 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
}