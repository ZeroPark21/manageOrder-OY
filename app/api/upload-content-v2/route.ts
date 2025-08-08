import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import * as XLSX from "xlsx"

// Node.js Runtime 사용
export const runtime = "nodejs"
export const maxDuration = 60 // 60초로 증가

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
  
  // Excel 날짜 (숫자로 저장된 경우)
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  
  // 문자열 날짜
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

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 콘텐츠 업로드 V2 API 시작")
    
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

    const buffer = await file.arrayBuffer()
    let data: any[] = []

    // Excel 파일 처리 (.csv 확장자라도 실제로는 Excel일 수 있음)
    try {
      console.log("📊 Excel 파일 시도")
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      console.log("Sheet name:", sheetName)
      const worksheet = workbook.Sheets[sheetName]
      data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // 배열로 가져오기
        raw: false // 문자열로 변환
      })
      
      // 첫 번째 행을 헤더로 사용
      if (data.length > 0 && Array.isArray(data[0])) {
        const headers = data[0] as string[]
        console.log("Excel 헤더:", headers)
        data = data.slice(1).map((row: any) => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        })
      }
      
      console.log("Excel 파싱 성공, 데이터 수:", data.length)
    } catch (excelError) {
      // Excel 파싱 실패시 CSV로 시도
      console.log("Excel 파싱 실패, CSV로 시도")
      // CSV 파일 처리
      console.log("📊 CSV 파일 처리")
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(buffer)
      
      // CSV 파싱
      const lines = text.split(/\r?\n/).filter(line => line.trim())
      if (lines.length < 2) {
        return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 })
      }
      
      // 헤더 파싱
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      
      // 데이터 파싱
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }
    }

    console.log(`📊 파싱된 데이터 수: ${data.length}`)
    if (data.length > 0) {
      console.log("첫 번째 데이터:", data[0])
    }

    // 데이터 변환
    const contents: ContentData[] = []
    
    for (const row of data) {
      // 컬럼명 매핑 (공백 제거)
      const publishDate = row['Video post date'] || row['publish_date'] || ''
      
      // Video post date가 없으면 건너뛰기
      if (!publishDate) {
        console.log(`⚠️ 건너뜀 - Video post date 없음`)
        continue
      }
      
      const videoName = row['Video name'] || row['video_name'] || 'Untitled'
      const videoLink = row['Video link'] || row['video_link'] || ''
      const creatorName = row['Creator username'] || row['creator_name'] || ''
      
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

    // Supabase에 저장
    const supabase = createServerClient()
    
    // 배치로 나누어 처리
    const BATCH_SIZE = 20 // 배치 크기 줄임
    let totalSaved = 0
    let errors: string[] = []
    
    // 모든 video_link를 먼저 수집
    const videoLinks = contents.map(c => c.video_link)
    
    // 기존 데이터 한번에 조회
    const { data: existingData } = await supabase
      .from("contents")
      .select("id, video_link")
      .in("video_link", videoLinks)
    
    const existingMap = new Map(existingData?.map(d => [d.video_link, d.id]) || [])
    
    // 업데이트할 데이터와 삽입할 데이터 분리
    const toUpdate: Array<{id: number, data: ContentData}> = []
    const toInsert: ContentData[] = []
    
    for (const content of contents) {
      const existingId = existingMap.get(content.video_link)
      if (existingId) {
        toUpdate.push({ id: existingId, data: content })
      } else {
        toInsert.push(content)
      }
    }
    
    console.log(`📊 업데이트: ${toUpdate.length}개, 새로 추가: ${toInsert.length}개`)
    
    // 업데이트 처리
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE)
      
      for (const { id, data } of batch) {
        const { error } = await supabase
          .from("contents")
          .update(data)
          .eq("id", id)
        
        if (error) {
          errors.push(`업데이트 실패: ${data.content_title}`)
        } else {
          totalSaved++
        }
      }
    }
    
    // 삽입 처리
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      
      const { data, error } = await supabase
        .from("contents")
        .insert(batch)
        .select()
      
      if (error) {
        errors.push(`배치 삽입 실패: ${error.message}`)
      } else {
        totalSaved += data?.length || 0
      }
    }

    return NextResponse.json({
      message: errors.length > 0 
        ? `업로드 완료 (일부 오류 발생)`
        : "콘텐츠 데이터가 성공적으로 업로드되었습니다.",
      processedCount: contents.length,
      uploadedCount: totalSaved,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
}