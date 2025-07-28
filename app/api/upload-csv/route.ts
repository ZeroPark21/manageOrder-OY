import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

function parseCSVDate(dateString: string): string | null {
  if (!dateString || dateString.trim() === "" || dateString === "\t") {
    return null
  }

  try {
    // TikTok 날짜 형식: "07/03/2025 1:18:49 AM"
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date.toISOString()
  } catch {
    return null
  }
}

function parseNumber(value: string): number {
  if (!value || value.trim() === "" || value === "\t") {
    return 0
  }
  const num = Number.parseFloat(value.toString().replace(/[,$]/g, ""))
  return isNaN(num) ? 0 : num
}

function parseInteger(value: string): number {
  if (!value || value.trim() === "" || value === "\t") {
    return 0
  }
  const num = Number.parseInt(value.toString().replace(/[,$]/g, ""))
  return isNaN(num) ? 0 : num
}

function parseCSVLine(line: string): string[] {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result.map((cell) => cell.replace(/^"|"$/g, ""))
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== TikTok CSV Upload Started ===")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "서버 설정 오류: Supabase 환경 변수가 설정되지 않았습니다." }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "파일이 업로드되지 않았습니다." }, { status: 400 })
    }

    console.log("📁 File info:", { name: file.name, size: file.size, type: file.type })

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기가 너무 큽니다 (최대 50MB)" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())

    console.log("📊 Total lines:", lines.length)

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV 파일에 데이터가 없습니다." }, { status: 400 })
    }

    // Parse headers
    const headers = parseCSVLine(lines[0])
    console.log("📋 Headers found:", headers.length)

    const supabase = createServerClient()

    const orders = []
    let processedRows = 0
    let skippedRows = 0

    // Process all data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = parseCSVLine(line)
        const rowData: any = {}

        headers.forEach((header, index) => {
          rowData[header] = values[index] || ""
        })

        const orderId = rowData["Order ID"]?.toString().trim()
        const productName = rowData["Product Name"]?.toString().trim()
        const quantity = parseInteger(rowData["Quantity"])

        if (!orderId || !productName || quantity <= 0) {
          skippedRows++
          continue
        }

        // 완전한 주문 데이터 매핑
        orders.push({
          // 기본 정보
          order_id: orderId,
          order_status: rowData["Order Status"] || null,
          order_substatus: rowData["Order Substatus"] || null,
          cancelation_return_type: rowData["Cancelation/Return Type"] || null,
          normal_or_preorder: rowData["Normal or Pre-order"] || null,

          // 상품 정보
          sku_id: rowData["SKU ID"] ? parseInteger(rowData["SKU ID"]) : null,
          seller_sku: rowData["Seller SKU"] || null,
          product_name: productName,
          variation: rowData["Variation"] || null,
          quantity: quantity,
          sku_quantity_of_return: parseInteger(rowData["Sku Quantity of return"]),

          // 가격 정보
          sku_unit_original_price: parseNumber(rowData["SKU Unit Original Price"]),
          sku_subtotal_before_discount: parseNumber(rowData["SKU Subtotal Before Discount"]),
          sku_platform_discount: parseNumber(rowData["SKU Platform Discount"]),
          sku_seller_discount: parseNumber(rowData["SKU Seller Discount"]),
          sku_subtotal_after_discount: parseNumber(rowData["SKU Subtotal After Discount"]),

          // 배송비 정보
          shipping_fee_after_discount: parseNumber(rowData["Shipping Fee After Discount"]),
          original_shipping_fee: parseNumber(rowData["Original Shipping Fee"]),
          shipping_fee_seller_discount: parseNumber(rowData["Shipping Fee Seller Discount"]),
          co_funded_shipping_fee_discount: parseNumber(rowData["Co-Funded Shipping Fee Discount"]),
          shipping_fee_platform_discount: parseNumber(rowData["Shipping Fee Platform Discount"]),
          payment_platform_discount: parseNumber(rowData["Payment platform discount"]),
          retail_delivery_fee: parseNumber(rowData["Retail Delivery Fee"]),
          taxes: parseNumber(rowData["Taxes"]),

          // 주문 금액
          order_amount: parseNumber(rowData["Order Amount"]),
          order_refund_amount: parseNumber(rowData["Order Refund Amount"]),

          // 날짜 정보
          created_time: parseCSVDate(rowData["Created Time"]),
          paid_time: parseCSVDate(rowData["Paid Time"]),
          rts_time: parseCSVDate(rowData["RTS Time"]),
          shipped_time: parseCSVDate(rowData["Shipped Time"]),
          delivered_time: parseCSVDate(rowData["Delivered Time"]),
          cancelled_time: parseCSVDate(rowData["Cancelled Time"]),

          // 취소 정보
          cancel_by: rowData["Cancel By"] || null,
          cancel_reason: rowData["Cancel Reason"] || null,

          // 배송 정보
          fulfillment_type: rowData["Fulfillment Type"] || null,
          warehouse_name: rowData["Warehouse Name"] || null,
          tracking_id: rowData["Tracking ID"] || null,
          delivery_option_type: rowData["Delivery Option Type"] || null,
          delivery_option: rowData["Delivery Option"] || null,
          shipping_provider_name: rowData["Shipping Provider Name"] || null,

          // 구매자 정보
          buyer_message: rowData["Buyer Message"] || null,
          buyer_username: rowData["Buyer Username"] || null,
          recipient: rowData["Recipient"] || null,
          phone_number: rowData["Phone #"] || null,
          country: rowData["Country"] || null,
          state: rowData["State"] || null,
          city: rowData["City"] || null,
          zipcode: rowData["Zipcode"] || null,
          address_line_1: rowData["Address Line 1"] || null,
          address_line_2: rowData["Address Line 2"] || null,
          delivery_instruction: rowData["Delivery Instruction"] || null,
          payment_method: rowData["Payment Method"] || null,

          // 기타 정보
          weight_kg: parseNumber(rowData["Weight(kg)"]),
          product_category: rowData["Product Category"] || null,
          package_id: rowData["Package ID"] ? parseInteger(rowData["Package ID"]) : null,
          seller_note: rowData["Seller Note"] || null,
          shipping_information: rowData["Shipping Information"] || null,
          combined_listing: rowData["Combined Listing"] || null,
        })

        processedRows++
      } catch (rowError) {
        console.error(`❌ Error parsing row ${i}:`, rowError)
        skippedRows++
        continue
      }
    }

    console.log("📈 Processing summary:", { processedRows, skippedRows, validOrders: orders.length })

    if (orders.length === 0) {
      return NextResponse.json({ error: `유효한 주문 데이터를 찾을 수 없습니다.` }, { status: 400 })
    }

    // 배치 업서트
    console.log("💾 Upserting orders into database...")
    const batchSize = 50
    let upsertedCount = 0

    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      try {
        const { data: upsertData, error: upsertError } = await supabase
          .from("orders")
          .upsert(batch, {
            onConflict: 'order_id', // order_id를 기준으로 중복 체크
            ignoreDuplicates: false // 중복 시 업데이트
          })
          .select("id")

        if (upsertError) {
          console.error(`❌ Batch ${batchNumber} error:`, upsertError)
          if (i === 0) {
            return NextResponse.json({ error: `데이터 업서트 실패: ${upsertError.message}` }, { status: 500 })
          }
          continue
        }

        upsertedCount += upsertData ? upsertData.length : batch.length
        console.log(`✅ Batch ${batchNumber} success: ${upsertData?.length || batch.length} records`)

        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (batchError) {
        console.error(`💥 Batch ${batchNumber} exception:`, batchError)
        if (i === 0) {
          return NextResponse.json({ error: `배치 처리 오류: ${batchError}` }, { status: 500 })
        }
      }
    }

    // 최종 검증
    const { count: finalCount } = await supabase.from("orders").select("*", { count: "exact", head: true })

    console.log("🎉 Upload completed!")
    console.log(`📊 Final count: ${finalCount}`)

    return NextResponse.json({
      success: true,
      message: `TikTok 주문 데이터 업서트 완료!`,
      count: finalCount || upsertedCount,
      processed: processedRows,
      skipped: skippedRows,
      totalRecords: finalCount || upsertedCount,
    })
  } catch (error) {
    console.error("💥 Upload error:", error)
    return NextResponse.json(
      { error: `업로드 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}` },
      { status: 500 },
    )
  }
}
