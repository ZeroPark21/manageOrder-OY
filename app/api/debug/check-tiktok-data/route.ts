import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId') || '1002'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 전체 orders 테이블 데이터 확인
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('id, company_id, product_name, created_time, order_amount')
      .limit(10)

    // 2. company_id로 필터링
    const { data: companyOrders, error: companyError } = await supabase
      .from('orders')
      .select('id, company_id, product_name, created_time, order_amount')
      .eq('company_id', parseInt(companyId))
      .limit(10)

    // 3. 전체 company_id 목록
    const { data: companyIds } = await supabase
      .from('orders')
      .select('company_id')

    const uniqueCompanyIds = [...new Set(companyIds?.map(o => o.company_id))]

    // 4. 모든 company 데이터 가져오기
    const { data: allCompanyOrders } = await supabase
      .from('orders')
      .select('id, company_id, created_time, order_amount, product_name')
      .eq('company_id', parseInt(companyId))

    // 날짜 파싱
    const parseOrderDate = (dateStr: string): Date | null => {
      if (!dateStr) return null
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (match) {
        const [, month, day, year] = match
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      }
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    }

    // 정렬 및 파싱
    const sortedOrders = (allCompanyOrders || [])
      .map(o => ({ ...o, parsedDate: parseOrderDate(o.created_time) }))
      .filter(o => o.parsedDate)
      .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime())

    // 9월 28일 데이터만
    const sept28Orders = sortedOrders.filter(o => {
      if (!o.parsedDate) return false
      return o.parsedDate.getFullYear() === 2025 &&
             o.parsedDate.getMonth() === 8 &&
             o.parsedDate.getDate() === 28
    })

    return NextResponse.json({
      companyId: parseInt(companyId),
      totalOrdersInDB: allCompanyOrders?.length || 0,
      sept28Data: {
        count: sept28Orders.length,
        samples: sept28Orders.slice(0, 5).map(o => ({
          date: o.created_time,
          parsed: o.parsedDate?.toISOString(),
          product: o.product_name,
          amount: o.order_amount
        }))
      },
      recentOrders: sortedOrders.slice(0, 10).map(o => ({
        date: o.created_time,
        parsed: o.parsedDate?.toISOString(),
        product: o.product_name?.substring(0, 50)
      })),
      uniqueCompanyIds,
      totalCompanyIdsCount: companyIds?.length || 0
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
