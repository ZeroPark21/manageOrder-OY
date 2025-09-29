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

      // 파일 타입에 따른 처리
      const buffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(buffer.slice(0, 8))

      // Excel 파일 시그니처 확인
      const isPkZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B
      const isOleCompound = uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF

      const isExcelFile = isPkZip || isOleCompound ||
                         file.name.endsWith('.xlsx') ||
                         file.name.endsWith('.xls') ||
                         file.type.includes('spreadsheet') ||
                         file.type.includes('excel')

      if (isExcelFile) {
        console.log("📊 Excel 파일로 감지, XLSX 라이브러리 사용")
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        rawData = XLSX.utils.sheet_to_json(worksheet)
        console.log(`📊 Excel 파일 처리 완료: ${rawData.length}개 데이터 행`)
      } else {
        console.log("📊 CSV 파일로 감지, 텍스트 파싱 사용")
        const text = await file.text()
        const lines = text.split(/\r?\n|\r/).map(line => line.trim())
        const headers = lines[0] ? lines[0].split(',').map(h => h.trim()) : []
        const dataLines = lines.slice(1).filter((line: string) => line.length > 0)

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

    } catch (parseError) {
      console.error("파일 파싱 오류:", parseError)
      return NextResponse.json({
        error: "파일을 파싱할 수 없습니다. CSV 또는 Excel 형식인지 확인해주세요.",
        details: parseError instanceof Error ? parseError.message : "Unknown error"
      }, { status: 400 })
    }

    // Supabase 클라이언트 생성
    const supabase = createServerClient()

    // 데이터 변환 및 검증
    const contents: ContentData[] = []
    let skippedCount = 0
    let errorCount = 0

    for (const row of rawData) {
      try {
        // 날짜 파싱 함수
        const parseDate = (value: any): string => {
          if (!value) return new Date().toISOString().split('T')[0]

          const dateStr = value.toString().trim()

          if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr.split('T')[0]
          }

          if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }

          const parts = dateStr.split('/')
          if (parts.length === 3) {
            const [month, day, year] = parts
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }

          return new Date().toISOString().split('T')[0]
        }

        // 데이터 매핑 (대소문자 및 공백 허용)
        const getFieldValue = (fieldNames: string[]): any => {
          for (const fieldName of fieldNames) {
            const value = row[fieldName]
            if (value !== undefined && value !== null) return value
          }
          return null
        }

        const content_title = getFieldValue(['Content title', 'content_title', 'Title', 'title'])
        const creator_name = getFieldValue(['Creator name', 'creator_name', 'Creator', 'creator'])
        const video_post_date = getFieldValue(['Video post date', 'video_post_date', 'Post date', 'post_date', 'Publish date', 'publish_date'])
        const video_link = getFieldValue(['Video link', 'video_link', 'Link', 'link', 'URL', 'url'])
        const gmv = getFieldValue(['Affiliate GMV', 'affiliate_gmv', 'GMV', 'gmv'])

        // 필수 필드 체크 개선 - video_post_date가 없는 경우 건너뛰기
        if (!video_post_date) {
          skippedCount++
          continue
        }

        const formattedDate = parseDate(video_post_date)

        const contentData: ContentData = {
          content_title: content_title || "제목 없음",
          creator_name: creator_name || "크리에이터 없음",
          publish_date: formattedDate,
          video_link: video_link || `generated-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          company_id: companyId,
          gmv: (() => {
            const cleanGmv = gmv.toString()
              .trim()
              .replace(/,/g, '')
              .replace(/₩/g, '')
              .replace(/\$/g, '')
              .replace(/[^\d.-]/g, '')

            const parsed = parseFloat(cleanGmv)
            return isNaN(parsed) ? 0 : parsed
          })(),
          affiliate_items_sold: parseInt(getFieldValue(['Affiliate items sold', 'affiliate_items_sold', 'Items sold', 'items_sold']) || '0') || 0,
          affiliate_gmv: parseFloat(getFieldValue(['Affiliate GMV', 'affiliate_gmv']) || '0') || 0,
          shoppable_avg_order_value: parseFloat(getFieldValue(['Shoppable video AOV', 'shoppable_avg_order_value', 'AOV', 'aov']) || '0') || 0,
          est_commission: parseFloat(getFieldValue(['Est. Commission', 'est_commission', 'Commission', 'commission']) || '0') || 0,
          est_flat_fee: getFieldValue(['Est. flat fee', 'est_flat_fee', 'Flat fee', 'flat_fee']) || '0',
          affiliate_orders: parseInt(getFieldValue(['Affiliate orders', 'affiliate_orders', 'Orders', 'orders']) || '0') || 0,
          shoppable_impressions: parseInt(getFieldValue(['Shoppable video impressions', 'shoppable_impressions', 'Impressions', 'impressions']) || '0') || 0,
          affiliate_ctr: parseFloat(getFieldValue(['Affiliate CTR', 'affiliate_ctr', 'CTR', 'ctr']) || '0') || 0,
          shoppable_gpm: parseFloat(getFieldValue(['Shoppable video GPM', 'shoppable_gpm', 'GPM', 'gpm']) || '0') || 0,
          affiliate_items_refunded: parseInt(getFieldValue(['Affiliate items refunded', 'affiliate_items_refunded', 'Items refunded', 'items_refunded']) || '0') || 0,
          affiliate_refunded_gmv: parseFloat(getFieldValue(['Affiliate refunded GMV', 'affiliate_refunded_gmv', 'Refunded GMV', 'refunded_gmv']) || '0') || 0,
          comment_count: parseInt(getFieldValue(['Shoppable video comments', 'comment_count', 'Comments', 'comments']) || '0') || 0,
          like_count: parseInt(getFieldValue(['Shoppable video likes', 'like_count', 'Likes', 'likes']) || '0') || 0
        }

        contents.push(contentData)
      } catch (rowError) {
        console.error(`행 처리 오류:`, rowError)
        errorCount++
      }
    }

    console.log(`📊 변환 완료: ${contents.length}개 유효, ${skippedCount}개 건너뜀, ${errorCount}개 오류`)

    if (contents.length === 0) {
      return NextResponse.json({
        error: "처리할 수 있는 유효한 데이터가 없습니다.",
        details: `전체 ${rawData.length}개 행 중 유효한 데이터 없음`
      }, { status: 400 })
    }

    // 최적화된 배치 처리
    const BATCH_SIZE = 500  // 배치 사이즈 500으로 증가
    let insertedCount = 0
    let updatedCount = 0

    try {
      // 모든 video_link를 한 번에 조회
      const videoLinks = contents.map(c => c.video_link)
      const { data: existingContents } = await supabase
        .from("contents")
        .select("id, video_link")
        .eq("company_id", companyId)
        .in("video_link", videoLinks)

      const existingMap = new Map()
      if (existingContents) {
        existingContents.forEach(item => {
          existingMap.set(item.video_link, item.id)
        })
      }

      // 신규와 업데이트 분리
      const toInsert: ContentData[] = []
      const toUpdate: { id: number; data: ContentData }[] = []

      for (const content of contents) {
        const existingId = existingMap.get(content.video_link)
        if (existingId) {
          toUpdate.push({ id: existingId, data: content })
        } else {
          toInsert.push(content)
        }
      }

      console.log(`📊 처리 계획: 삽입 ${toInsert.length}개, 업데이트 ${toUpdate.length}개`)

      // 병렬 배치 삽입
      if (toInsert.length > 0) {
        const insertBatches = []
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const batch = toInsert.slice(i, i + BATCH_SIZE)
          insertBatches.push(batch)
        }

        console.log(`📥 ${insertBatches.length}개 배치로 삽입 시작...`)

        // 배치를 순차적으로 처리 (동시 처리 시 rate limit 문제 방지)
        for (let i = 0; i < insertBatches.length; i++) {
          const batch = insertBatches[i]
          const { error } = await supabase
            .from("contents")
            .insert(batch)

          if (!error) {
            insertedCount += batch.length
            console.log(`✅ 배치 ${i + 1}/${insertBatches.length} 삽입 완료: ${batch.length}개`)
          } else {
            console.error(`❌ 배치 ${i + 1} 삽입 실패:`, error.message)
            // 실패한 배치는 개별 처리
            for (const item of batch) {
              const { error: singleError } = await supabase
                .from("contents")
                .insert(item)
              if (!singleError) insertedCount++
            }
          }
        }
      }

      // 병렬 배치 업데이트
      if (toUpdate.length > 0) {
        console.log(`🔄 ${toUpdate.length}개 업데이트 시작...`)

        // 동시에 10개씩 업데이트 처리
        const CONCURRENT_LIMIT = 10
        for (let i = 0; i < toUpdate.length; i += CONCURRENT_LIMIT) {
          const batch = toUpdate.slice(i, i + CONCURRENT_LIMIT)
          const updatePromises = batch.map(async ({ id, data }) => {
            const { error } = await supabase
              .from("contents")
              .update(data)
              .eq("id", id)

            return error ? 0 : 1
          })

          const results = await Promise.all(updatePromises)
          updatedCount += results.reduce((sum: number, val: number) => sum + val, 0)
        }
      }

      console.log(`✅ 처리 완료: 삽입 ${insertedCount}개, 업데이트 ${updatedCount}개`)

      return NextResponse.json({
        success: true,
        message: "업로드 완료!",
        processedCount: contents.length,
        insertedCount,
        updatedCount,
        skippedCount,
        errorCount
      })

    } catch (dbError) {
      console.error("데이터베이스 오류:", dbError)
      return NextResponse.json({
        error: "데이터베이스 오류가 발생했습니다.",
        details: dbError instanceof Error ? dbError.message : "Unknown error",
        processedCount: contents.length,
        insertedCount,
        updatedCount
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