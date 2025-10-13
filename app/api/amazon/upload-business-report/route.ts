import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

// CSV 헤더 매핑 (한글 → DB 필드명)
const CSV_HEADER_MAPPING: Record<string, string> = {
  '날짜': 'report_date',
  '주문 상품 판매량': 'ordered_product_sales',
  '주문 상품 판매 - B2B': 'ordered_product_sales_b2b',
  '주문 수량': 'units_ordered',
  '주문 수량 - B2B': 'units_ordered_b2b',
  '총 주문 아이템': 'total_order_items',
  '총 주문 아이템 - B2B': 'total_order_items_b2b',
  '주문 아이템당 평균 판매량': 'avg_sales_per_order_item',
  '주문 아이템당 평균 판매량 - B2B': 'avg_sales_per_order_item_b2b',
  '주문 아이템당 평균 수량': 'avg_units_per_order_item',
  '주문 아이템당 평균 수량 - B2B': 'avg_units_per_order_item_b2b',
  '평균 판매 가격': 'avg_selling_price',
  '평균 판매 가격 - B2B': 'avg_selling_price_b2b',
  '페이지 조회수 - 모바일 앱': 'page_views_mobile',
  '페이지 조회수 - 모바일 앱 - B2B': 'page_views_mobile_b2b',
  '페이지 조회수 - 브라우저': 'page_views_browser',
  '페이지 조회수 - 브라우저 - B2B': 'page_views_browser_b2b',
  '페이지 조회수 - 합계': 'page_views_total',
  '페이지 조회수 - 총계 - B2B': 'page_views_total_b2b',
  '세션 - 모바일 앱': 'sessions_mobile',
  '세션 - 모바일 앱 - B2B': 'sessions_mobile_b2b',
  '세션 - 브라우저': 'sessions_browser',
  '세션 - 브라우저 - B2B': 'sessions_browser_b2b',
  '세션 - 합계': 'sessions_total',
  '세션 - 총계 - B2B': 'sessions_total_b2b',
  '추천 오퍼(바이 박스) 비율': 'buy_box_percentage',
  '추천 오퍼(바이 박스) 비율 - B2B': 'buy_box_percentage_b2b',
  '주문 아이템 세션 비율': 'order_item_session_percentage',
  '주문 아이템 세션 비율 - B2B': 'order_item_session_percentage_b2b',
  '상품 세션 비율': 'unit_session_percentage',
  '단위 세션 비율 - B2B': 'unit_session_percentage_b2b',
  '평균 오퍼 개수': 'avg_offer_count',
  '평균 상위 아이템': 'avg_parent_items',
  '환불된 수량': 'units_refunded',
  '환불된 수량 - B2B': 'units_refunded_b2b',
  '환불률': 'refund_rate',
  '환불률 - B2B': 'refund_rate_b2b',
  '피드백 받음': 'feedback_received',
  '받은 피드백 - B2B': 'feedback_received_b2b',
  '접수된 부정적인 피드백': 'negative_feedback_received',
  '받은 부정적인 피드백 - B2B': 'negative_feedback_received_b2b',
  '받은 부정적인 피드백 비율': 'negative_feedback_rate',
  '받은 부정적인 피드백 비율 - B2B': 'negative_feedback_rate_b2b',
  '승인된 A-to-z 클레임': 'claims_granted',
  '클레임 금액': 'claims_amount',
  '배송 상품 판매량': 'shipped_product_sales',
  '배송 수량': 'units_shipped',
  '배송 주문': 'orders_shipped',
}

// 날짜 파싱 함수 (25. 8. 30. → 2025-08-30)
function parseDate(dateStr: string): string | null {
  try {
    // BOM 제거
    dateStr = dateStr.replace(/^\uFEFF/, '').trim()

    // "25. 8. 30." 형식 파싱
    const match = dateStr.match(/(\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})/)
    if (match) {
      const [, year, month, day] = match
      const fullYear = `20${year}` // 25 → 2025
      const paddedMonth = month.padStart(2, '0')
      const paddedDay = day.padStart(2, '0')
      return `${fullYear}-${paddedMonth}-${paddedDay}`
    }

    return null
  } catch (error) {
    console.error("Date parsing error:", error, dateStr)
    return null
  }
}

// 통화 값 파싱 (US$603.89 → 603.89)
function parseCurrency(value: string): number {
  if (!value || value === '' || value === '-') return 0
  const cleaned = value.replace(/[US$,]/g, '').trim()
  return parseFloat(cleaned) || 0
}

// 퍼센트 값 파싱 (99.09% → 99.09)
function parsePercent(value: string): number {
  if (!value || value === '' || value === '-') return 0
  const cleaned = value.replace(/%/g, '').trim()
  return parseFloat(cleaned) || 0
}

// 숫자 값 파싱 (1,000 → 1000)
function parseNumber(value: string): number {
  if (!value || value === '' || value === '-') return 0
  const cleaned = value.replace(/,/g, '').trim()
  return parseFloat(cleaned) || 0
}

// CSV 파싱 함수
function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV 파일이 비어있거나 헤더가 없습니다.')
  }

  // 헤더 파싱
  const headerLine = lines[0].replace(/^\uFEFF/, '') // BOM 제거
  const headers = headerLine.split(',').map(h => h.trim())

  // 필드명 매핑
  const fieldNames = headers.map(h => CSV_HEADER_MAPPING[h] || h)

  // 데이터 파싱
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // CSV 값 파싱 (쉼표로 구분, 따옴표 처리)
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    // 필드별 값 매핑
    const row: any = {}

    for (let j = 0; j < headers.length && j < values.length; j++) {
      const fieldName = fieldNames[j]
      const value = values[j]

      // 날짜 필드
      if (fieldName === 'report_date') {
        row[fieldName] = parseDate(value)
      }
      // 통화 필드
      else if (fieldName.includes('sales') || fieldName.includes('price') || fieldName.includes('amount')) {
        row[fieldName] = parseCurrency(value)
      }
      // 퍼센트 필드
      else if (fieldName.includes('percentage') || fieldName.includes('rate')) {
        row[fieldName] = parsePercent(value)
      }
      // 숫자 필드
      else {
        row[fieldName] = parseNumber(value)
      }
    }

    // 날짜가 유효한 경우에만 추가
    if (row.report_date) {
      rows.push(row)
    }
  }

  return rows
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "회사 ID가 필요합니다." }, { status: 400 })
    }

    // CSV 파일 읽기
    const content = await file.text()
    const rows = parseCSV(content)

    if (rows.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 })
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // UPSERT 처리 (중복 날짜는 업데이트, 신규는 추가)
    let insertedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        const data = {
          company_id: parseInt(companyId),
          ...row
        }

        const { data: existing } = await supabase
          .from('amazon_business_reports')
          .select('id')
          .eq('company_id', companyId)
          .eq('report_date', row.report_date)
          .single()

        if (existing) {
          // 업데이트
          const { error } = await supabase
            .from('amazon_business_reports')
            .update(data)
            .eq('id', existing.id)

          if (error) {
            errors.push(`${row.report_date}: ${error.message}`)
          } else {
            updatedCount++
          }
        } else {
          // 신규 추가
          const { error } = await supabase
            .from('amazon_business_reports')
            .insert(data)

          if (error) {
            errors.push(`${row.report_date}: ${error.message}`)
          } else {
            insertedCount++
          }
        }
      } catch (error) {
        console.error("Row processing error:", error, row)
        errors.push(`${row.report_date}: 처리 실패`)
      }
    }

    // 회사 설정 업데이트 (마지막 업로드 시간)
    await supabase
      .from('companies')
      .update({
        channel_settings: {
          amazon: {
            last_upload: new Date().toISOString()
          }
        }
      })
      .eq('id', companyId)

    return NextResponse.json({
      success: true,
      insertedCount,
      updatedCount,
      totalRows: rows.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `✅ 업로드 완료!\n📊 신규: ${insertedCount}개 | 업데이트: ${updatedCount}개`
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다."
      },
      { status: 500 }
    )
  }
}
