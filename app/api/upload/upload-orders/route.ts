import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  console.log("📥 Upload orders API called")

  try {
    let formData;
    try {
      formData = await req.formData()
    } catch (formError) {
      console.error("❌ Failed to parse form data:", formError)
      return NextResponse.json({ error: "요청 데이터 파싱 실패" }, { status: 400 })
    }

    const file = formData.get("file") as File
    const companyId = formData.get("companyId") as string

    console.log("📄 File info:", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      companyId
    })

    if (!file) {
      console.error("❌ No file provided")
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 })
    }

    if (!companyId) {
      console.error("❌ No company ID provided")
      return NextResponse.json({ error: "회사 ID가 없습니다" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase credentials")
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let text;
    try {
      text = await file.text()
    } catch (textError) {
      console.error("❌ Failed to read file text:", textError)
      return NextResponse.json({ error: "파일 읽기 실패" }, { status: 400 })
    }

    console.log("📝 File content length:", text.length)
    console.log("📝 First 200 chars:", text.substring(0, 200))

    const lines = text.split(/\r?\n/).filter(line => line.trim())
    console.log("📝 Total lines:", lines.length)

    if (lines.length < 2) {
      console.error("❌ Not enough lines in file")
      return NextResponse.json({ error: "유효한 데이터가 없습니다" }, { status: 400 })
    }

    const parseCSVLine = (line: string): string[] => {
      const result = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0])
    console.log("📊 Headers found:", headers.length, headers.slice(0, 10))
    console.log("📊 All headers:", headers)

    const orders = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length !== headers.length) {
        console.log(`⚠️ Line ${i + 1} skipped: ${values.length} values vs ${headers.length} headers`)
        continue
      }

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      const orderDate = row['purchase-date'] || row['Purchase Date']
      if (!orderDate) {
        console.log(`⚠️ Row ${i} skipped: no purchase date`)
        continue
      }

      const parseDate = (value: any): string | null => {
        if (!value) return null
        const dateStr = value.toString().trim()

        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          return dateStr.split('T')[0]
        }

        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
          const [month, day, year] = dateStr.split('/')
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }

        // 새로운 형식 추가: YYYY/MM/DD
        if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(dateStr)) {
          const [year, month, day] = dateStr.split('/')
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }

        console.log(`⚠️ Could not parse date: ${dateStr}`)
        return null
      }

      // order_item_id가 없는 경우 order_id + sku 조합으로 생성
      const orderId = row['amazon-order-id'] || ''
      const sku = row['sku'] || ''
      const orderItemId = row['amazon-order-item-id'] || row['order-item-id'] || `${orderId}_${sku}`

      const order = {
        company_id: companyId,
        order_id: orderId,
        order_item_id: orderItemId,
        purchase_date: parseDate(orderDate),
        payments_date: parseDate(row['payments-date']),
        ship_date: parseDate(row['ship-date']),
        buyer_email: row['buyer-email'] || '',
        buyer_name: row['buyer-name'] || '',
        buyer_phone_number: row['buyer-phone-number'] || '',
        sku: sku,
        product_name: row['product-name'] || '',
        asin: row['asin'] || '',
        quantity_purchased: parseInt(row['quantity-purchased'] || '0') || 0,
        currency: row['currency'] || 'USD',
        item_price: parseFloat(row['item-price'] || '0') || 0,
        item_tax: parseFloat(row['item-tax'] || '0') || 0,
        shipping_price: parseFloat(row['shipping-price'] || '0') || 0,
        shipping_tax: parseFloat(row['shipping-tax'] || '0') || 0,
        gift_wrap_price: parseFloat(row['gift-wrap-price'] || '0') || 0,
        gift_wrap_tax: parseFloat(row['gift-wrap-tax'] || '0') || 0,
        ship_service_level: row['ship-service-level'] || '',
        recipient_name: row['recipient-name'] || '',
        ship_address_1: row['ship-address-1'] || '',
        ship_address_2: row['ship-address-2'] || '',
        ship_address_3: row['ship-address-3'] || '',
        ship_city: row['ship-city'] || '',
        ship_state: row['ship-state'] || '',
        ship_postal_code: row['ship-postal-code'] || '',
        ship_country: row['ship-country'] || '',
        item_promotion_discount: parseFloat(row['item-promotion-discount'] || '0') || 0,
        ship_promotion_discount: parseFloat(row['ship-promotion-discount'] || '0') || 0,
        item_status: row['item-status'] || '',
        fulfillment_channel: row['fulfillment-channel'] || '',
        sales_channel: row['sales-channel'] || '',
        order_channel: row['order-channel'] || '',
        is_business_order: row['is-business-order'] === 'true' || row['is-business-order'] === 'TRUE',
        is_prime: row['is-prime'] === 'true' || row['is-prime'] === 'TRUE',
        is_premium_order: row['is-premium-order'] === 'true' || row['is-premium-order'] === 'TRUE',
        price_designation: row['price-designation'] || ''
      }

      orders.push(order)
    }

    console.log(`📊 Processed ${orders.length} orders`)

    // 중복 체크를 위한 로그
    const orderItemIds = orders.map(o => o.order_item_id)
    const uniqueOrderItemIds = new Set(orderItemIds)
    console.log(`📊 Order Item IDs: Total ${orderItemIds.length}, Unique ${uniqueOrderItemIds.size}`)

    // 중복된 order_item_id 찾기
    const duplicates = orderItemIds.filter((item, index) => orderItemIds.indexOf(item) !== index)
    if (duplicates.length > 0) {
      console.log("⚠️ Duplicate order_item_ids found:", duplicates)
    }

    // 각 주문의 order_item_id 출력
    orders.forEach((order, index) => {
      console.log(`Order ${index + 1}: order_id=${order.order_id}, order_item_id=${order.order_item_id}`)
    })

    if (orders.length === 0) {
      console.error("❌ No valid order data found")
      return NextResponse.json({ error: "유효한 주문 데이터가 없습니다" }, { status: 400 })
    }

    console.log("🚀 Upserting orders to Supabase...")

    const { data, error } = await supabase
      .from('amazon_orders')
      .upsert(orders, {
        onConflict: 'company_id,order_id,sku',
        ignoreDuplicates: false
      })

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ Successfully uploaded orders")

    // Update channel_settings for Amazon
    console.log("🔄 Updating channel_settings...")

    // Fetch current settings
    const { data: company } = await supabase
      .from('companies')
      .select('channel_settings')
      .eq('id', companyId)
      .single()

    const currentSettings = (company as any)?.channel_settings || {}
    const updatedSettings = {
      ...currentSettings,
      amazon: {
        ...currentSettings.amazon,
        sync_type: 'manual',
        last_upload: new Date().toISOString(),
        file_name: file.name
      }
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update({ channel_settings: updatedSettings })
      .eq('id', companyId)

    if (updateError) {
      console.error("⚠️ Failed to update channel_settings:", updateError)
      // Don't fail the entire request, just log the error
    } else {
      console.log("✅ Channel settings updated")
    }

    return NextResponse.json({
      processedCount: orders.length,
      insertedCount: orders.length,
      updatedCount: 0
    })
  } catch (error) {
    console.error("❌ Upload error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다",
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}