import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"
import * as XLSX from 'xlsx'

// Node.js Runtime 사용 (더 긴 실행 시간 허용)
export const runtime = "nodejs"
export const maxDuration = 60 // 60초로 확장

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

    // 파일 처리 - CSV와 Excel 모두 지원
    let rawData: any[] = []
    
    try {
      console.log("📊 파일 처리 시작:", {
        name: file.name,
        type: file.type,
        size: file.size
      })
      
      // 파일 타입에 따른 처리 - 파일 내용을 먼저 확인하여 Excel인지 판단
      const buffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(buffer.slice(0, 8))
      
      // Excel 파일 시그니처 확인 (PK 또는 D0CF로 시작)
      const isPkZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B // PK (ZIP based Excel)
      const isOleCompound = uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF // Old Excel format
      
      const isExcelFile = isPkZip || isOleCompound || 
                         file.name.endsWith('.xlsx') || 
                         file.name.endsWith('.xls') || 
                         file.type.includes('spreadsheet') ||
                         file.type.includes('excel')
      
      console.log("📊 파일 시그니처 분석:", {
        first8bytes: Array.from(uint8Array).map(b => b.toString(16)).join(' '),
        isPkZip,
        isOleCompound,
        isExcelFile
      })
      
      if (isExcelFile) {
        console.log("📊 Excel 파일로 감지, XLSX 라이브러리 사용")
        
        // Excel 파일 처리 (이미 buffer가 있으므로 재사용)
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        rawData = XLSX.utils.sheet_to_json(worksheet)
        
        console.log(`📊 Excel 파일 처리 완료: ${rawData.length}개 데이터 행`)
        
      } else {
        console.log("📊 CSV 파일로 감지, 텍스트 파싱 사용")
        
        // CSV 파일 처리
        const text = await file.text()
        console.log("📊 파일 텍스트 읽기 완료, 길이:", text.length)
        
        // 다양한 줄바꿈 처리 (Windows \r\n, Mac \r, Unix \n)
        const lines = text.split(/\r?\n|\r/).map(line => line.trim())
        
        console.log(`📊 전체 라인 수: ${lines.length}`)
        
        // 헤더 확인
        if (lines.length > 0) {
          console.log("📊 헤더 행 길이:", lines[0].length)
          console.log("📊 헤더 행 (처음 200자):", lines[0].substring(0, 200))
        }
        
        // CSV를 JSON으로 변환
        const headers = lines[0] ? lines[0].split(',').map(h => h.trim()) : []
        const dataLines = lines.slice(1).filter((line: string) => line.length > 0)
        
        console.log(`📊 헤더: ${headers.length}개, 데이터 행: ${dataLines.length}개`)
        
        // CSV 행을 객체로 변환
        rawData = dataLines.map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = values[index] || ''
          })
          return obj
        })
      }
      
      console.log(`📊 파싱 완료: ${rawData.length}개 원본 데이터`)
      if (rawData.length > 0) {
        console.log("📊 첫 번째 데이터 샘플:", Object.keys(rawData[0]))
      }
      
    } catch (readError) {
      console.error("파일 읽기 오류:", readError)
      return NextResponse.json({ 
        error: "파일을 읽을 수 없습니다. CSV 또는 Excel 파일인지 확인해주세요.",
        details: readError instanceof Error ? readError.message : "Unknown error"
      }, { status: 400 })
    }
    
    console.log(`📊 파일 처리 완료: ${file.name}, 데이터 행 수: ${rawData.length}`)
    if (rawData.length > 0) {
      console.log("📊 첫 번째 데이터 행 키:", Object.keys(rawData[0]))
      console.log("📊 첫 번째 데이터 행 값:", rawData[0])
    }

    const contents: ContentData[] = []
    let processedCount = 0
    let skippedCount = 0
    let invalidColumnCount = 0
    let missingFieldCount = 0
    
    for (const row of rawData) {
      if (!row || typeof row !== 'object') {
        skippedCount++
        continue
      }
      
      processedCount++
      if (processedCount <= 5) {
        console.log(`🔍 행 ${processedCount} - 키 수: ${Object.keys(row).length}`)
        console.log(`🔍 행 내용:`, Object.entries(row).slice(0, 5).map(([key, val], idx) => `[${idx}]: "${key}": "${val}"`).join(", "))
      }
      
      // 객체에서 필요한 필드들 추출 (다양한 가능한 키 이름들을 지원)
      const getFieldValue = (row: any, possibleKeys: string[]): string => {
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null) {
            return String(row[key]).trim()
          }
        }
        return ""
      }
      
      const content_title = getFieldValue(row, ['Video name', 'video name', 'title', 'content_title'])
      const video_link = getFieldValue(row, ['Video link', 'video link', 'link', 'video_link', 'url'])
      const publish_date = getFieldValue(row, ['Video post date', 'video post date', 'date', 'publish_date'])
      const creator_name = getFieldValue(row, ['Creator username', 'creator username', 'creator', 'creator_name'])
      const gmv = getFieldValue(row, ['GMV', 'gmv'])
      
      // GMV 디버깅 로그 추가 - 더 자세한 정보
      if (processedCount <= 10) {
        console.log(`🔍 GMV 원본 데이터 (행 ${processedCount}):`, {
          raw: gmv,
          type: typeof gmv,
          length: gmv?.length,
          charCodes: gmv?.split('').map(c => c.charCodeAt(0)),
          allRowData: row // 전체 행 데이터 확인
        })
        
        // 'GMV' 컬럼이 정확히 있는지 확인
        console.log(`🔍 행 ${processedCount} 컬럼 확인:`, {
          hasGMV: 'GMV' in row,
          hasLowerGMV: 'gmv' in row,
          allKeys: Object.keys(row),
          gmvDirect: row['GMV'],
          gmvLower: row['gmv']
        })
      }
      const affiliate_items_sold = getFieldValue(row, ['Affiliate items sold', 'affiliate items sold', 'items sold', 'affiliate_items_sold'])
      const affiliate_gmv = getFieldValue(row, ['Affiliate shoppable video GMV', 'affiliate gmv', 'affiliate_gmv'])
      const shoppable_avg_order_value = getFieldValue(row, ['Shoppable video avg. order value', 'avg order value', 'shoppable_avg_order_value'])
      const est_commission = getFieldValue(row, ['Est. commission', 'commission', 'est_commission'])
      const est_flat_fee = getFieldValue(row, ['Est. flat fee', 'flat fee', 'est_flat_fee'])
      const affiliate_orders = getFieldValue(row, ['Affiliate orders', 'orders', 'affiliate_orders'])
      const shoppable_impressions = getFieldValue(row, ['Shoppable video impressions', 'impressions', 'shoppable_impressions'])
      const affiliate_ctr = getFieldValue(row, ['Affiliate CTR', 'ctr', 'affiliate_ctr'])
      const shoppable_gpm = getFieldValue(row, ['Shoppable video GPM', 'gpm', 'shoppable_gpm'])
      const affiliate_items_refunded = getFieldValue(row, ['Affiliate items refunded', 'refunded items', 'affiliate_items_refunded'])
      const affiliate_refunded_gmv = getFieldValue(row, ['Affiliate refunded GMV', 'refunded gmv', 'affiliate_refunded_gmv'])
      const comment_count = getFieldValue(row, ['Shoppable video comments', 'comments', 'comment_count'])
      const like_count = getFieldValue(row, ['Shoppable video likes', 'likes', 'like_count'])
        
      
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
          gmv: (() => {
            // GMV 파싱 개선
            const cleanGmv = gmv.toString()
              .trim()                           // 앞뒤 공백 제거
              .replace(/[$,\s]/g, '')          // 달러 기호, 쉼표, 모든 공백 제거
              .replace(/[^0-9.-]/g, '')        // 숫자, 점, 마이너스만 남김
            
            const parsed = parseFloat(cleanGmv)
            const result = isNaN(parsed) ? 0 : parsed
            
            if (processedCount <= 5) {
              console.log(`🔍 GMV 파싱 (행 ${processedCount}):`, {
                original: gmv,
                cleaned: cleanGmv,
                parsed: parsed,
                final: result
              })
            }
            
            return result
          })(),
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
          console.log(`   전체 내용:`, Object.keys(row).join(', '))
        }
      }
    }

    console.log(`📊 처리 결과:`)
    console.log(`  - 전체 행: ${rawData.length}`)
    console.log(`  - 처리된 행: ${processedCount}`)
    console.log(`  - 빈 행: ${skippedCount}`)
    console.log(`  - 컬럼 수 부족: ${invalidColumnCount}`)
    console.log(`  - 필수 필드 누락: ${missingFieldCount}`)
    console.log(`  - 유효한 콘텐츠: ${contents.length}`)
    console.log(`  - 누락된 콘텐츠: ${rawData.length - contents.length}개`)
    
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

    // 스마트 업서트 처리 - 배치 조회 후 개별 처리
    console.log("📤 스마트 데이터 업서트 시작...")
    
    try {
      let insertedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      let errorCount = 0
      
      // 1. 모든 video_link를 한 번에 조회하여 기존 데이터 확인
      const videoLinks = contents.map(c => c.video_link)
      const { data: existingContents, error: batchSelectError } = await supabase
        .from("contents")
        .select("video_link, content_title, gmv")
        .in("video_link", videoLinks)
      
      if (batchSelectError) {
        console.error("배치 조회 오류:", batchSelectError)
        throw batchSelectError
      }
      
      console.log(`📊 기존 데이터 조회 완료: ${existingContents?.length || 0}개 발견`)
      
      // 2. 기존 데이터를 Map으로 변환하여 빠른 조회
      const existingMap = new Map()
      if (existingContents) {
        existingContents.forEach(item => {
          existingMap.set(item.video_link, item)
        })
      }
      
      // 3. 데이터 분류: 신규 삽입 vs 업데이트
      const toInsert: ContentData[] = []
      const toUpdate: ContentData[] = []
      
      for (const newContent of contents) {
        if (existingMap.has(newContent.video_link)) {
          toUpdate.push(newContent)
        } else {
          toInsert.push(newContent)
        }
      }
      
      console.log(`📊 처리 계획: 삽입 ${toInsert.length}개, 업데이트 ${toUpdate.length}개`)
      
      // 4. 신규 데이터 배치 삽입
      if (toInsert.length > 0) {
        console.log(`📥 신규 데이터 ${toInsert.length}개 배치 삽입 시작...`)
        const { error: batchInsertError } = await supabase
          .from("contents")
          .insert(toInsert)
        
        if (batchInsertError) {
          console.error("배치 삽입 오류:", batchInsertError)
          // 배치 삽입 실패 시 개별 삽입으로 재시도
          for (const content of toInsert) {
            try {
              const { error: singleInsertError } = await supabase
                .from("contents")
                .insert(content)
              
              if (singleInsertError) {
                console.error(`개별 삽입 오류 (${content.video_link}):`, singleInsertError)
                errorCount++
              } else {
                insertedCount++
              }
            } catch (e) {
              console.error(`개별 삽입 예외 (${content.video_link}):`, e)
              errorCount++
            }
          }
        } else {
          insertedCount = toInsert.length
          console.log(`✅ 배치 삽입 완료: ${insertedCount}개`)
        }
      }
      
      // 5. 기존 데이터 개별 업데이트 (배치 업데이트는 복잡하므로 개별 처리)
      if (toUpdate.length > 0) {
        console.log(`🔄 기존 데이터 ${toUpdate.length}개 업데이트 시작...`)
        for (const newContent of toUpdate) {
          try {
            const existing = existingMap.get(newContent.video_link)
            console.log(`🔄 업데이트: ${newContent.video_link}`)
            console.log(`   - GMV: ${existing?.gmv} → ${newContent.gmv}`)
            
            const { error: updateError } = await supabase
              .from("contents")
              .update(newContent)
              .eq("video_link", newContent.video_link)

            if (updateError) {
              console.error(`업데이트 오류 (${newContent.video_link}):`, updateError)
              errorCount++
            } else {
              updatedCount++
            }
          } catch (itemError) {
            console.error(`업데이트 예외 (${newContent.video_link}):`, itemError)
            errorCount++
          }
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
      console.error("오류 타입:", typeof error)
      console.error("오류 스택:", error instanceof Error ? error.stack : 'No stack trace')
      
      // 더 자세한 오류 정보 수집
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : JSON.stringify(error)
      
      return NextResponse.json({ 
        error: "데이터 처리 중 오류가 발생했습니다.",
        details: errorMessage,
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown'
      }, { status: 500 })
    }

  } catch (err: any) {
    console.error("콘텐츠 업로드 API 오류:", err)
    console.error("오류 타입:", typeof err)
    console.error("오류 스택:", err?.stack || 'No stack trace')
    console.error("전체 오류 객체:", JSON.stringify(err, null, 2))
    
    // 더 자세한 오류 메시지 수집
    const errorMessage = err?.message || 
                        (typeof err === 'string' ? err : '') ||
                        "Internal server error"
    
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
    
    // 환경 변수 관련 오류 처리
    if (errorMessage.includes("env vars are missing") || errorMessage.includes("SUPABASE")) {
      return NextResponse.json({ 
        error: "서버 설정 오류입니다. 관리자에게 문의하세요.",
        details: "Database configuration error"
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: errorMessage || "서버에서 알 수 없는 오류가 발생했습니다.",
      details: JSON.stringify(err),
      type: err?.name || "UnknownError"
    }, { status: 500 })
  }
} 