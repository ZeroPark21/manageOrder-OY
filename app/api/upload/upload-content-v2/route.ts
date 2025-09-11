import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"
import * as XLSX from "xlsx"

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
function parseNumber(value: any, logDebug: boolean = false): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // "$4,788.00" -> "4788.00"
    // 콤마 제거, $ 제거, % 제거
    const cleaned = value
      .replace(/[$,]/g, '') // $ 와 콤마 제거
      .replace(/[%]/g, '') // % 제거
      .trim()
    const num = parseFloat(cleaned)
    if (logDebug) {
      console.log(`parseNumber: "${value}" -> "${cleaned}" -> ${num}`)
    }
    return isNaN(num) ? 0 : num
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
      
      // CSV 파싱 - 제대로 된 파서 사용 (콤마가 포함된 값 처리)
      data = parseCSV(text)
      if (data.length === 0) {
        return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 })
      }
    }

    console.log(`📊 파싱된 데이터 수: ${data.length}`)
    if (data.length > 0) {
      console.log("첫 번째 데이터:", data[0])
      console.log("컬럼명들:", Object.keys(data[0]))
    }

    // 데이터 변환
    const contents: ContentData[] = []
    
    for (const row of data) {
      // 컬럼명 매핑 (공백 제거)
      const publishDate = row['Video post date'] || row['publish_date'] || ''
      
      // Video post date가 없으면 기본값 사용 (건너뛰지 않음)
      if (!publishDate) {
        console.log(`⚠️ Video post date 없음 - 기본값 사용`)
      }
      
      const videoName = row['Video name'] || row['video_name'] || 'Untitled'
      const videoLink = row['Video link'] || row['video_link'] || ''
      const creatorName = row['Creator username'] || row['creator_name'] || ''
      
      // GMV 값 찾기 - 여러 가능한 컬럼명 확인
      let gmvValue = row['GMV'] || row['gmv'] || row['Total GMV'] || row['total_gmv'] || 
                     row['Revenue'] || row['revenue'] || row['Sales'] || row['sales'] || 0
      
      // 첫 몇 개 로그로 확인
      const shouldLog = contents.length < 3
      if (shouldLog) {
        console.log(`Row ${contents.length} - Creator: ${creatorName}`)
        console.log(`  GMV: ${gmvValue} -> ${parseNumber(gmvValue, false)}`)
        console.log(`  Likes: ${row['Shoppable video likes']} -> ${parseNumber(row['Shoppable video likes'] || 0)}`)
        console.log(`  Comments: ${row['Shoppable video comments']} -> ${parseNumber(row['Shoppable video comments'] || 0)}`)
      }
      
      contents.push({
        content_title: videoName.substring(0, 255),
        video_link: videoLink.substring(0, 255),
        publish_date: parseDate(publishDate || new Date().toISOString()),
        creator_name: (creatorName || '알 수 없음').substring(0, 100),
        gmv: parseNumber(gmvValue),
        affiliate_items_sold: Math.round(parseNumber(row['Affiliate items sold '] || row['Affiliate items sold'] || row['affiliate_items_sold'] || 0)),
        affiliate_gmv: parseNumber(row['Affiliate shoppable video GMV'] || row['affiliate_gmv'] || 0),
        shoppable_avg_order_value: parseNumber(row['Shoppable video avg. order value'] || row['shoppable_avg_order_value'] || 0),
        est_commission: parseNumber(row['Est. commission'] || row['est_commission'] || 0),
        est_flat_fee: (row['Est. flat fee'] || row['est_flat_fee'] || '--').toString().substring(0, 50),
        affiliate_orders: Math.round(parseNumber(row['Affiliate orders'] || row['affiliate_orders'] || 0)),
        shoppable_impressions: Math.round(parseNumber(row['Shoppable video impressions'] || row['shoppable_impressions'] || 0)),
        affiliate_ctr: parseNumber(row['Affiliate CTR'] || row['affiliate_ctr'] || 0),
        shoppable_gpm: parseNumber(row['Shoppable video GPM'] || row['shoppable_gpm'] || 0),
        affiliate_items_refunded: Math.round(parseNumber(row['Affiliate items refunded'] || row['affiliate_items_refunded'] || 0)),
        affiliate_refunded_gmv: parseNumber(row['Affiliate refunded GMV'] || row['affiliate_refunded_gmv'] || 0),
        comment_count: Math.round(parseNumber(row['Shoppable video comments'] || row['comment_count'] || 0)),
        like_count: Math.round(parseNumber(row['Shoppable video likes'] || row['like_count'] || 0))
      })
    }

    console.log(`✅ 변환된 콘텐츠 수: ${contents.length}`)

    // 같은 파일 내에서 video_link 기준 중복 제거
    const uniqueContentsMap = new Map<string, ContentData>()
    let duplicatesRemoved = 0
    
    for (const content of contents) {
      if (content.video_link) {
        if (!uniqueContentsMap.has(content.video_link)) {
          uniqueContentsMap.set(content.video_link, content)
        } else {
          // 중복인 경우, 더 최신 데이터로 업데이트 (GMV가 더 큰 것을 선택)
          const existing = uniqueContentsMap.get(content.video_link)!
          if (content.gmv > existing.gmv || content.like_count > existing.like_count) {
            uniqueContentsMap.set(content.video_link, content)
            console.log(`🔄 중복 데이터 업데이트: ${content.creator_name} - ${content.content_title.substring(0, 30)}`)
          }
          duplicatesRemoved++
        }
      }
    }
    
    const finalContents = Array.from(uniqueContentsMap.values())
    console.log(`🔄 파일 내 중복 제거: ${contents.length}개 → ${finalContents.length}개 (${duplicatesRemoved}개 중복 제거)`)

    if (finalContents.length === 0) {
      return NextResponse.json({ 
        error: "유효한 데이터가 없습니다. Video name과 Video link가 있는지 확인해주세요." 
      }, { status: 400 })
    }

    // Supabase에 저장
    const supabase = createServerClient()
    
    // 배치로 나누어 처리
    const BATCH_SIZE = 20 // 배치 크기 줄임
    let totalSaved = 0
    let totalUpdated = 0
    let totalInserted = 0
    let errors: string[] = []
    
    // 기존 데이터 조회 - video_link 기준
    const { data: existingData } = await supabase
      .from("contents")
      .select("*")
      .in("video_link", finalContents.map(c => c.video_link).filter(link => link))
    
    // video_link를 키로 하는 맵 생성
    const existingMap = new Map<string, any>()
    existingData?.forEach((d: any) => {
      existingMap.set(d.video_link, d)
    })
    
    console.log(`📊 기존 데이터: ${existingMap.size}개 발견`)
    
    // 업데이트할 데이터와 삽입할 데이터 분리
    const toUpdate: Array<{id: number, data: ContentData}> = []
    const toInsert: ContentData[] = []
    let skippedCount = 0
    
    for (const content of finalContents) {
      if (!content.video_link) {
        toInsert.push(content)
        continue
      }
      
      const existing = existingMap.get(content.video_link)
      
      if (existing) {
        // 기존 데이터가 있는 경우 - 모든 필드를 업데이트
        // 데이터가 실제로 변경되었는지 확인
        const hasChanges = 
          existing.content_title !== content.content_title ||
          existing.creator_name !== content.creator_name ||
          existing.publish_date !== content.publish_date ||
          Math.abs(existing.gmv - content.gmv) > 0.01 ||
          existing.affiliate_items_sold !== content.affiliate_items_sold ||
          Math.abs(existing.affiliate_gmv - content.affiliate_gmv) > 0.01 ||
          Math.abs(existing.shoppable_avg_order_value - content.shoppable_avg_order_value) > 0.01 ||
          Math.abs(existing.est_commission - content.est_commission) > 0.01 ||
          existing.est_flat_fee !== content.est_flat_fee ||
          existing.affiliate_orders !== content.affiliate_orders ||
          existing.shoppable_impressions !== content.shoppable_impressions ||
          Math.abs(existing.affiliate_ctr - content.affiliate_ctr) > 0.01 ||
          Math.abs(existing.shoppable_gpm - content.shoppable_gpm) > 0.01 ||
          existing.affiliate_items_refunded !== content.affiliate_items_refunded ||
          Math.abs(existing.affiliate_refunded_gmv - content.affiliate_refunded_gmv) > 0.01 ||
          existing.comment_count !== content.comment_count ||
          existing.like_count !== content.like_count
        
        if (hasChanges) {
          toUpdate.push({ id: existing.id, data: content })
          console.log(`🔄 업데이트 예정: ${content.creator_name} - ${content.content_title.substring(0, 30)}`)
          console.log(`   기존: Likes=${existing.like_count}, Comments=${existing.comment_count}`)
          console.log(`   신규: Likes=${content.like_count}, Comments=${content.comment_count}`)
        } else {
          skippedCount++
        }
      } else {
        // 새로운 데이터
        toInsert.push(content)
        console.log(`✨ 새로 추가 예정: ${content.creator_name} - ${content.content_title.substring(0, 30)}`)
      }
    }
    
    console.log(`📊 처리 계획: 업데이트=${toUpdate.length}, 신규=${toInsert.length}, 건너뜀=${skippedCount}`)
    
    // 업데이트 처리 - 모든 필드를 업데이트
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE)
      
      for (const { id, data } of batch) {
        const { error } = await supabase
          .from("contents")
          .update({
            content_title: data.content_title,
            publish_date: data.publish_date,
            creator_name: data.creator_name,
            gmv: data.gmv,
            affiliate_items_sold: data.affiliate_items_sold,
            affiliate_gmv: data.affiliate_gmv,
            shoppable_avg_order_value: data.shoppable_avg_order_value,
            est_commission: data.est_commission,
            est_flat_fee: data.est_flat_fee,
            affiliate_orders: data.affiliate_orders,
            shoppable_impressions: data.shoppable_impressions,
            affiliate_ctr: data.affiliate_ctr,
            shoppable_gpm: data.shoppable_gpm,
            affiliate_items_refunded: data.affiliate_items_refunded,
            affiliate_refunded_gmv: data.affiliate_refunded_gmv,
            comment_count: data.comment_count,
            like_count: data.like_count,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
        
        if (error) {
          console.error(`❌ 업데이트 실패 (ID: ${id}):`, error)
          errors.push(`업데이트 실패: ${data.content_title.substring(0, 50)}`)
        } else {
          totalUpdated++
          totalSaved++
        }
      }
      
      console.log(`📊 업데이트 진행: ${Math.min(i + BATCH_SIZE, toUpdate.length)}/${toUpdate.length}`)
    }
    
    // 삽입 처리
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      
      const { data, error } = await supabase
        .from("contents")
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`❌ 배치 삽입 실패:`, error)
        errors.push(`배치 삽입 실패: ${error.message}`)
      } else {
        const insertedCount = data?.length || 0
        totalInserted += insertedCount
        totalSaved += insertedCount
      }
      
      console.log(`📊 삽입 진행: ${Math.min(i + BATCH_SIZE, toInsert.length)}/${toInsert.length}`)
    }
    
    // 데이터 검증
    console.log("\n🔍 데이터 검증 시작...")
    const sampleCreators = ['annekoii', 'frodo.gaggins', 'imperfectlyanjie']
    
    for (const creator of sampleCreators) {
      const { data: verifyData, count } = await supabase
        .from("contents")
        .select("like_count, comment_count, gmv, est_commission", { count: 'exact' })
        .ilike("creator_name", `%${creator}%`)
      
      if (verifyData) {
        const totalLikes = verifyData.reduce((sum, r) => sum + (r.like_count || 0), 0)
        const totalComments = verifyData.reduce((sum, r) => sum + (r.comment_count || 0), 0)
        const totalGmv = verifyData.reduce((sum, r) => sum + (r.gmv || 0), 0)
        
        console.log(`✅ ${creator}: ${count}개 레코드`)
        console.log(`   Likes: ${totalLikes}, Comments: ${totalComments}, GMV: $${totalGmv.toFixed(2)}`)
      }
    }

    const successMessage = errors.length > 0 
      ? `업로드 완료 (일부 오류 발생)`
      : "콘텐츠 데이터가 성공적으로 업로드되었습니다."
    
    console.log(`\n✅ ${successMessage}`)
    console.log(`📊 최종 결과: 처리=${finalContents.length}, 저장=${totalSaved}, 업데이트=${totalUpdated}, 신규=${totalInserted}, 건너뜀=${skippedCount}`)

    return NextResponse.json({
      message: successMessage,
      processedCount: finalContents.length,
      originalCount: contents.length,
      duplicatesRemoved: duplicatesRemoved,
      uploadedCount: totalSaved,
      updatedCount: totalUpdated,
      insertedCount: totalInserted,
      skippedCount: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
}