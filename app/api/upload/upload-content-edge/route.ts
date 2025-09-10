import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

// Edge Runtime 사용 - 더 빠르고 안정적
export const runtime = "edge"

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

// CSV 파싱 함수
function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const data: any[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  return data
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 콘텐츠 업로드 Edge API 시작")
    
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    console.log("📁 파일 정보:", {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Edge Runtime에서는 Excel 파싱이 어려우므로 CSV만 지원
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      return NextResponse.json({ 
        error: "Excel 파일은 /api/upload-content-v2를 사용해주세요. Edge Runtime은 CSV만 지원합니다." 
      }, { status: 400 })
    }

    const text = await file.text()
    const data = parseCSV(text)

    console.log(`📊 파싱된 데이터 수: ${data.length}`)

    // 데이터 변환
    const contents: ContentData[] = []
    
    for (const row of data) {
      const videoName = row['Video name'] || row['video_name'] || ''
      const videoLink = row['Video link'] || row['video_link'] || ''
      const publishDate = row['Video post date'] || row['publish_date'] || ''
      const creatorName = row['Creator username'] || row['creator_name'] || ''
      
      // 필수 필드 체크
      if (!videoName || !videoLink) {
        continue
      }
      
      contents.push({
        content_title: videoName.substring(0, 255),
        video_link: videoLink.substring(0, 255),
        publish_date: parseDate(publishDate),
        creator_name: (creatorName || '알 수 없음').substring(0, 100),
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
      })
    }

    console.log(`✅ 유효한 콘텐츠 수: ${contents.length}`)

    if (contents.length === 0) {
      return NextResponse.json({ 
        error: "유효한 데이터가 없습니다. Video name과 Video link가 있는지 확인해주세요." 
      }, { status: 400 })
    }

    // Supabase에 저장 - 더 작은 배치로
    const supabase = createServerClient()
    const BATCH_SIZE = 10 // Edge Runtime에서는 더 작은 배치 사용
    let totalSaved = 0
    
    for (let i = 0; i < contents.length; i += BATCH_SIZE) {
      const batch = contents.slice(i, i + BATCH_SIZE)
      
      // 간단한 upsert 시도
      const { data, error } = await supabase
        .from("contents")
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`배치 ${Math.floor(i/BATCH_SIZE) + 1} 오류:`, error.message)
        // 오류 무시하고 계속 진행
      } else {
        totalSaved += data?.length || batch.length
      }
    }

    return NextResponse.json({
      message: "콘텐츠 데이터가 성공적으로 업로드되었습니다.",
      processedCount: contents.length,
      uploadedCount: totalSaved
    })

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
}