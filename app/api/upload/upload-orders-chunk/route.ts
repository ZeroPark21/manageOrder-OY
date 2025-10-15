import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const ordersWithCompany = orders.map(order => ({
      ...order,
      company_id: companyId
    }))

    const { data, error } = await supabase
      .from('amazon_orders')
      .upsert(ordersWithCompany, {
        onConflict: 'company_id,order_id,sku',
        ignoreDuplicates: false
      })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      saved: orders.length,
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