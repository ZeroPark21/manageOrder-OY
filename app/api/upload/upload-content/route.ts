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
  company_id?: string
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
    const companyId = formData.get("companyId") as string

    console.log("📁 파일 정보:", {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      companyId: companyId
    })

    if (!companyId) {
      console.error("❌ companyId가 없습니다!")
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

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
          length: gmv.length,
          cleaned: gmv.replace(/,/g, '').replace(/[^0-9.-]/g, ''),
          parsed: parseFloat(gmv.replace(/,/g, '').replace(/[^0-9.-]/g, ''))
        })
      }

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
        console.error(`날짜 포맷 오류 (행 ${processedCount}):`, e)
        formattedDate = publish_date
      }

      // 필수 필드 확인 - 더 상세한 로깅
      if (!content_title && !video_link) {
        console.log(`⚠️ 스킵 (행 ${processedCount}): 콘텐츠 제목과 비디오 링크가 모두 없음`)
        skippedCount++
        invalidColumnCount++
        continue
      }

      // GMV를 문자열에서 숫자로 변환 (콤마 제거)
      let numericGmv = 0
      try {
        // 콤마와 통화 기호 제거 후 숫자로 변환
        const cleanedGmv = gmv.replace(/,/g, '').replace(/[^0-9.-]/g, '')
        numericGmv = parseFloat(cleanedGmv) || 0

        if (processedCount <= 10) {
          console.log(`💰 GMV 변환 (행 ${processedCount}):`, {
            original: gmv,
            cleaned: cleanedGmv,
            numeric: numericGmv
          })
        }
      } catch (e) {
        console.error(`GMV 파싱 오류 (행 ${processedCount}):`, e)
        numericGmv = 0
      }

      const parseNumberField = (value: string): number => {
        if (!value || value === "" || value === "--" || value === "N/A") return 0
        try {
          const cleaned = value.toString().replace(/,/g, '').replace(/[^0-9.-]/g, '')
          return parseFloat(cleaned) || 0
        } catch (e) {
          return 0
        }
      }

      const parseIntegerField = (value: string): number => {
        if (!value || value === "" || value === "--" || value === "N/A") return 0
        try {
          const cleaned = value.toString().replace(/,/g, '').replace(/[^0-9-]/g, '')
          return parseInt(cleaned) || 0
        } catch (e) {
          return 0
        }
      }

      // 데이터 생성
      const newContent: ContentData = {
        content_title: content_title || "제목 없음",
        creator_name: creator_name || "크리에이터 없음",
        publish_date: formattedDate || new Date().toISOString().split('T')[0],
        video_link: video_link || `generated-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        company_id: companyId,  // companyId 추가
        gmv: numericGmv,
        affiliate_items_sold: parseIntegerField(getFieldValue(row, ['Affiliate items sold', 'affiliate items sold', 'items sold', 'affiliate_items_sold'])),
        affiliate_gmv: parseNumberField(getFieldValue(row, ['Affiliate shoppable video GMV', 'affiliate shoppable video gmv', 'affiliate gmv', 'affiliate_gmv'])),
        shoppable_avg_order_value: parseNumberField(getFieldValue(row, ['Shoppable video avg. order value', 'shoppable video avg order value', 'avg order value', 'shoppable_avg_order_value'])),
        est_commission: parseNumberField(getFieldValue(row, ['Est. commission', 'est commission', 'commission', 'est_commission'])),
        est_flat_fee: getFieldValue(row, ['Est. flat fee', 'est flat fee', 'flat fee', 'est_flat_fee']) || "--",
        affiliate_orders: parseIntegerField(getFieldValue(row, ['Affiliate orders', 'affiliate orders', 'orders', 'affiliate_orders'])),
        shoppable_impressions: parseIntegerField(getFieldValue(row, ['Shoppable video impressions', 'shoppable video impressions', 'impressions', 'shoppable_impressions'])),
        affiliate_ctr: parseNumberField(getFieldValue(row, ['Affiliate CTR', 'affiliate ctr', 'ctr', 'affiliate_ctr'])),
        shoppable_gpm: parseNumberField(getFieldValue(row, ['Shoppable video GPM', 'shoppable video gpm', 'gpm', 'shoppable_gpm'])),
        affiliate_items_refunded: parseIntegerField(getFieldValue(row, ['Affiliate items refunded', 'affiliate items refunded', 'items refunded', 'affiliate_items_refunded'])),
        affiliate_refunded_gmv: parseNumberField(getFieldValue(row, ['Affiliate refunded GMV', 'affiliate refunded gmv', 'refunded gmv', 'affiliate_refunded_gmv'])),
        comment_count: parseIntegerField(getFieldValue(row, ['Shoppable video comments', 'shoppable video comments', 'comments', 'comment_count'])),
        like_count: parseIntegerField(getFieldValue(row, ['Shoppable video likes', 'shoppable video likes', 'likes', 'like_count']))
      }

      contents.push(newContent)
    }

    console.log(`📊 데이터 변환 완료: ${contents.length}개 콘텐츠 준비`)
    console.log(`  - 처리: ${processedCount}개`)
    console.log(`  - 스킵: ${skippedCount}개`)
    console.log(`  - 유효하지 않은 컬럼: ${invalidColumnCount}개`)

    if (contents.length === 0) {
      return NextResponse.json({
        error: "처리할 유효한 데이터가 없습니다.",
        details: `전체 ${rawData.length}개 행 중 유효한 데이터 없음`
      }, { status: 400 })
    }

    try {
      // Supabase 클라이언트 생성
      const supabase = createServerClient()

      // 배치 크기 설정
      const BATCH_SIZE = 100
      let insertedCount = 0
      let updatedCount = 0
      let errorCount = 0

      // 1. 먼저 기존 데이터 조회 (비디오 링크로)
      const videoLinks = contents.map(c => c.video_link)

      console.log(`📊 기존 데이터 체크 시작 (비디오 링크 ${videoLinks.length}개)`)

      // 배치로 기존 데이터 조회
      const existingContents: any[] = []

      for (let i = 0; i < videoLinks.length; i += BATCH_SIZE) {
        const batch = videoLinks.slice(i, i + BATCH_SIZE)
        const { data, error } = await supabase
          .from("contents")
          .select("video_link, gmv, publish_date, content_title, creator_name")
          .eq("company_id", companyId)  // company_id로 필터링
          .in("video_link", batch)

        if (error) {
          console.error(`기존 데이터 조회 오류 (배치 ${Math.floor(i / BATCH_SIZE) + 1}):`, error)
        } else if (data) {
          existingContents.push(...data)
        }
      }

      console.log(`📊 기존 데이터 ${existingContents.length}개 발견`)

      // 기존 데이터의 날짜 범위 확인
      if (existingContents.length > 0) {
        const existingDates = existingContents.map(c => c.publish_date).filter(d => d).sort()
        console.log(`📅 기존 데이터 날짜 범위:`)
        console.log(`   - 최소: ${existingDates[0]}`)
        console.log(`   - 최대: ${existingDates[existingDates.length - 1]}`)
      }

      // 2. 기존 데이터 맵 생성
      const existingMap = new Map(
        existingContents.map(item => [item.video_link, item])
      )

      // 3. 신규 및 업데이트 데이터 분리
      const toInsert: ContentData[] = []
      const toUpdate: ContentData[] = []

      for (const newContent of contents) {
        const existing = existingMap.get(newContent.video_link)

        if (!existing) {
          toInsert.push(newContent)
        } else {
          toUpdate.push(newContent)
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

      // 5. 기존 데이터 개별 업데이트
      if (toUpdate.length > 0) {
        console.log(`🔄 기존 데이터 ${toUpdate.length}개 업데이트 시작...`)
        console.log(`📅 업데이트할 데이터의 날짜 범위 확인:`)
        const updateDates = toUpdate.map(c => c.publish_date).sort()
        console.log(`   - 최소: ${updateDates[0]}`)
        console.log(`   - 최대: ${updateDates[updateDates.length - 1]}`)

        for (const newContent of toUpdate) {
          try {
            const existing = existingMap.get(newContent.video_link)
            console.log(`🔄 업데이트: ${newContent.video_link}`)
            console.log(`   - 날짜: ${existing?.publish_date} → ${newContent.publish_date}`)
            console.log(`   - GMV: ${existing?.gmv} → ${newContent.gmv}`)

            const { error: updateError } = await supabase
              .from("contents")
              .update(newContent)
              .eq("video_link", newContent.video_link)
              .eq("company_id", companyId)  // company_id 조건 추가

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
        .eq('company_id', companyId)

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
        processedCount: contents.length,
        skippedCount: skippedCount
      }, { status: 500 })
    }

  } catch (error) {
    console.error("서버 오류:", error)
    return NextResponse.json({
      error: "서버 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}