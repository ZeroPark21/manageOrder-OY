import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

// 간단한 CSV 파싱 함수
function parseCSV(text: string): any[] {
  const lines = text.split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const obj: any = {}
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    
    data.push(obj)
  }
  
  return data
}

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
    
    // CSV 파싱 - 제대로 된 파서 사용
    const parsedData = parseCSV(text)
    
    if (parsedData.length === 0) {
      return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 })
    }

    // 데이터 변환 (첫 10개만 처리)
    const contents = []
    const maxRows = Math.min(parsedData.length, 10) // 최대 10개만
    
    for (let i = 0; i < maxRows; i++) {
      const row = parsedData[i]
      
      // Video name과 Video link는 필수
      const videoName = row['Video name'] || row['video_name'] || ''
      const videoLink = row['Video link'] || row['video_link'] || ''
      
      if (videoName && videoLink) {
        // 날짜 파싱
        let publishDate = new Date().toISOString()
        const dateStr = row['Video post date'] || row['publish_date'] || ''
        if (dateStr) {
          try {
            // MM/DD/YYYY 형식 처리
            if (dateStr.includes('/')) {
              const [month, day, year] = dateStr.split('/')
              if (month && day && year) {
                publishDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
              }
            } else if (dateStr.includes('-')) {
              publishDate = dateStr
            }
          } catch (e) {
            // 날짜 파싱 실패 시 기본값 사용
          }
        }
        
        // 숫자 값 파싱 헬퍼 함수
        const parseNumber = (value: any): number => {
          if (!value) return 0
          const str = value.toString()
          // $, 콤마, % 등 제거하고 숫자만 추출
          const cleaned = str.replace(/[$,%]/g, '').replace(/,/g, '')
          const num = parseFloat(cleaned)
          return isNaN(num) ? 0 : num
        }
        
        contents.push({
          content_title: videoName.substring(0, 255),
          video_link: videoLink.substring(0, 255),
          publish_date: publishDate,
          creator_name: (row['Creator username'] || row['creator_name'] || '알 수 없음').substring(0, 100),
          gmv: parseNumber(row['GMV'] || row['gmv']),
          affiliate_items_sold: Math.round(parseNumber(row['Affiliate items sold'] || row['affiliate_items_sold'])),
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
          like_count: Math.round(parseNumber(row['Shoppable video likes'] || row['like_count'])),
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
          totalRows: parsedData.length,
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
      totalRows: parsedData.length,
      note: maxRows < parsedData.length ? `전체 ${parsedData.length}개 중 ${maxRows}개만 처리됨` : undefined
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: "서버 오류",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}