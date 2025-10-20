import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { orders, isLastChunk, companyId } = await req.json()

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: "유효한 주문 데이터가 없습니다" }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "회사 ID가 없습니다" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // company_id를 모든 주문에 추가
    const ordersWithCompany = orders.map(order => ({
      ...order,
      company_id: companyId
    }))

    console.log(`📦 Processing chunk: ${ordersWithCompany.length} orders`)

    // 기존 order들을 조회 (order_id + sku_id 조합으로)
    const orderIds = ordersWithCompany.map(order => String(order.order_id))

    const { data: existingOrders, error: selectError } = await supabase
      .from("orders")
      .select("id, order_id, sku_id, product_name")
      .eq("company_id", companyId)
      .in("order_id", orderIds)

    if (selectError) {
      console.error(`❌ Select error:`, selectError)
      throw selectError
    }

    // order_id + sku_id 조합으로 매핑
    const existingOrderMap = new Map(
      existingOrders?.map(order => {
        const key = `${String(order.order_id)}_${order.sku_id || order.product_name}`
        return [key, order.id]
      }) || []
    )

    // 업데이트할 주문과 새로 추가할 주문 분리
    const ordersToUpdate: any[] = []
    const ordersToInsert: any[] = []

    ordersWithCompany.forEach(order => {
      const orderKey = `${String(order.order_id)}_${order.sku_id || order.product_name}`
      const existingId = existingOrderMap.get(orderKey)
      if (existingId) {
        ordersToUpdate.push({ ...order, id: existingId })
      } else {
        ordersToInsert.push(order)
      }
    })

    console.log(`📊 ${ordersToUpdate.length} to update, ${ordersToInsert.length} to insert`)

    let totalProcessed = 0

    // 업데이트 실행
    if (ordersToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from("orders")
        .upsert(ordersToUpdate)

      if (updateError) {
        console.error(`❌ Update error:`, updateError)
        throw updateError
      }
      totalProcessed += ordersToUpdate.length
    }

    // 삽입 실행
    if (ordersToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("orders")
        .insert(ordersToInsert)

      if (insertError) {
        console.error(`❌ Insert error:`, insertError)
        throw insertError
      }
      totalProcessed += ordersToInsert.length
    }

    console.log(`✅ Chunk success: ${totalProcessed} records processed`)

    return NextResponse.json({
      saved: totalProcessed,
      updated: ordersToUpdate.length,
      inserted: ordersToInsert.length,
      isLastChunk
    })
  } catch (error) {
    console.error("Upload chunk error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "청크 업로드 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
