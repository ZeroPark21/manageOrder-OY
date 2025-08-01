import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

function parseCSVDate(dateString: string): string | null {
  if (!dateString || dateString.trim() === "" || dateString === "\t") {
    return null
  }
  // 날짜를 그대로 문자열로 저장 (데이터베이스에서 TEXT 타입으로 저장)
  return dateString.trim()
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
    const orderIdSet = new Set<string>() // 중복 체크용
    const duplicateOrderIds = new Set<string>()
    let processedRows = 0
    let skippedRows = 0
    let duplicateRows = 0

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

        const orderIdRaw = rowData["Order ID"]?.toString().trim()
        const productName = rowData["Product Name"]?.toString().trim()
        const quantity = parseInteger(rowData["Quantity"])

        if (!orderIdRaw || !productName || quantity <= 0) {
          skippedRows++
          continue
        }
        
        // order_id를 문자열로 변환하여 정밀도 문제 해결
        const orderId = String(orderIdRaw)
        
        // CSV 내에서 중복 체크
        if (orderIdSet.has(orderId)) {
          duplicateOrderIds.add(orderId)
          duplicateRows++
          console.log(`⚠️ Duplicate order_id in CSV: ${orderId} at row ${i + 1}`)
          continue // 중복된 경우 건너뛰기
        }
        orderIdSet.add(orderId)

        // CSV 컴럼명을 데이터베이스 컴럼명으로 매핑
        const orderData: any = {
          order_id: orderId,
          order_status: rowData["Order Status"] || null,
          order_substatus: rowData["Order Substatus"] || null,
          cancelation_return_type: rowData["Cancelation/Return Type"] || null,
          normal_or_preorder: rowData["Normal or Pre-order"] || null,
          sku_id: rowData["SKU ID"] || null,
          seller_sku: rowData["Seller SKU"] || null,
          product_name: productName,
          variation: rowData["Variation"] || null,
          quantity: quantity,
          sku_quantity_of_return: parseInteger(rowData["Sku Quantity of return"]),
          sku_unit_original_price: parseNumber(rowData["SKU Unit Original Price"]),
          sku_subtotal_before_discount: parseNumber(rowData["SKU Subtotal Before Discount"]),
          sku_platform_discount: parseNumber(rowData["SKU Platform Discount"]),
          sku_seller_discount: parseNumber(rowData["SKU Seller Discount"]),
          sku_subtotal_after_discount: parseNumber(rowData["SKU Subtotal After Discount"]),
          shipping_fee_after_discount: parseNumber(rowData["Shipping Fee After Discount"]),
          original_shipping_fee: parseNumber(rowData["Original Shipping Fee"]),
          shipping_fee_seller_discount: parseNumber(rowData["Shipping Fee Seller Discount"]),
          co_funded_shipping_fee_discount: parseNumber(rowData["Co-Funded Shipping Fee Discount"]),
          shipping_fee_platform_discount: parseNumber(rowData["Shipping Fee Platform Discount"]),
          payment_platform_discount: parseNumber(rowData["Payment platform discount"]),
          retail_delivery_fee: parseNumber(rowData["Retail Delivery Fee"]),
          taxes: parseNumber(rowData["Taxes"]),
          order_amount: parseNumber(rowData["Order Amount"]),
          order_refund_amount: parseNumber(rowData["Order Refund Amount"]),
          created_time: rowData["Created Time"] || null,
          paid_time: rowData["Paid Time"] || null,
          rts_time: rowData["RTS Time"] || null,
          shipped_time: rowData["Shipped Time"] || null,
          delivered_time: rowData["Delivered Time"] || null,
          cancelled_time: rowData["Cancelled Time"] || null,
          cancel_by: rowData["Cancel By"] || null,
          cancel_reason: rowData["Cancel Reason"] || null,
          fulfillment_type: rowData["Fulfillment Type"] || null,
          warehouse_name: rowData["Warehouse Name"] || null,
          tracking_id: rowData["Tracking ID"] || null,
          delivery_option_type: rowData["Delivery Option Type"] || null,
          delivery_option: rowData["Delivery Option"] || null,
          shipping_provider_name: rowData["Shipping Provider Name"] || null,
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
          weight_kg: parseNumber(rowData["Weight(kg)"]),
          product_category: rowData["Product Category"] || null,
          package_id: rowData["Package ID"] || null,
          seller_note: rowData["Seller Note"] || null,
          shipping_information: rowData["Shipping Information"] || null,
          combined_listing: rowData["Combined Listing"] || null,
        }
        
        orders.push(orderData)

        processedRows++
      } catch (rowError) {
        console.error(`❌ Error parsing row ${i}:`, rowError)
        skippedRows++
        continue
      }
    }

    console.log("📈 Processing summary:", { 
      processedRows, 
      skippedRows, 
      duplicateRows,
      validOrders: orders.length,
      duplicateOrderIds: Array.from(duplicateOrderIds).slice(0, 5) // 처음 5개만 로그
    })

    if (orders.length === 0) {
      return NextResponse.json({ 
        error: `유효한 주문 데이터를 찾을 수 없습니다.`,
        details: {
          totalRows: lines.length - 1,
          skippedRows,
          duplicateRows
        }
      }, { status: 400 })
    }
    
    if (duplicateRows > 0) {
      console.warn(`⚠️ Found ${duplicateRows} duplicate order_ids in CSV file`)
    }

    // 배치 업서트
    console.log("💾 Upserting orders into database...")
    const batchSize = 50
    let upsertedCount = 0

    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      try {
        // 먼저 기존 order_id들을 조회
        const orderIds = batch.map(order => String(order.order_id))
        console.log(`🔍 Checking existing orders for batch ${batchNumber}:`, orderIds.slice(0, 3), '...')
        
        const { data: existingOrders, error: selectError } = await supabase
          .from("orders")
          .select("id, order_id")
          .in("order_id", orderIds)
        
        if (selectError) {
          console.error(`❌ Select error in batch ${batchNumber}:`, selectError)
          throw selectError
        }
        
        const existingOrderMap = new Map(
          existingOrders?.map(order => [String(order.order_id), order.id]) || []
        )
        
        console.log(`📊 Batch ${batchNumber}: Found ${existingOrders?.length || 0} existing orders out of ${batch.length} total`)
        
        // 업데이트할 주문과 새로 추가할 주문 분리
        const ordersToUpdate = []
        const ordersToInsert = []
        
        batch.forEach(order => {
          const orderIdStr = String(order.order_id)
          const existingId = existingOrderMap.get(orderIdStr)
          if (existingId) {
            ordersToUpdate.push({ ...order, id: existingId })
          } else {
            ordersToInsert.push(order)
          }
        })
        
        console.log(`📦 Batch ${batchNumber}: ${ordersToUpdate.length} to update, ${ordersToInsert.length} to insert`)
        
        let upsertData = []
        
        // 업데이트 실행
        if (ordersToUpdate.length > 0) {
          const { data: updateData, error: updateError } = await supabase
            .from("orders")
            .upsert(ordersToUpdate)
            .select("id")
          
          if (updateError) {
            console.error(`❌ Update error in batch ${batchNumber}:`, updateError)
            throw updateError
          }
          upsertData.push(...(updateData || []))
        }
        
        // 삽입 실행
        if (ordersToInsert.length > 0) {
          const { data: insertData, error: insertError } = await supabase
            .from("orders")
            .insert(ordersToInsert)
            .select("id")
          
          if (insertError) {
            console.error(`❌ Insert error in batch ${batchNumber}:`, insertError)
            throw insertError
          }
          upsertData.push(...(insertData || []))
        }


        const actualUpserted = ordersToUpdate.length + ordersToInsert.length
        upsertedCount += actualUpserted
        console.log(`✅ Batch ${batchNumber} success: ${actualUpserted} records (${ordersToUpdate.length} updated, ${ordersToInsert.length} inserted)`)

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
      duplicatesInFile: duplicateRows,
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
