import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const days = searchParams.get('days')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const dateRange = searchParams.get('dateRange')

    if (!companyId) {
      return NextResponse.json({ error: "회사 ID가 필요합니다" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let fromDateStr: string
    let toDateStr: string

    if (dateFrom && dateTo) {
      fromDateStr = dateFrom
      toDateStr = dateTo
    } else if (days === 'all') {
      fromDateStr = '2020-01-01'
      toDateStr = new Date().toISOString().split('T')[0]
    } else {
      const daysAgo = parseInt(dateRange || days || '30')
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - daysAgo)
      fromDateStr = fromDate.toISOString().split('T')[0]
      toDateStr = new Date().toISOString().split('T')[0]
    }

    // 데이터 가져오기
    const { data: reports, error } = await supabase
      .from('amazon_business_reports')
      .select('*')
      .eq('company_id', companyId)
      .gte('report_date', fromDateStr)
      .lte('report_date', toDateStr)
      .order('report_date', { ascending: true })

    if (error) {
      console.error("Error fetching reports:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 환불율 데이터 계산
    const refundData = (reports || []).map(report => {
      const unitsOrdered = parseInt(report.units_ordered) || 0
      const unitsRefunded = parseInt(report.units_refunded) || 0
      const refundRate = parseFloat(report.refund_rate) || 0

      // 환불률 재계산 (검증용)
      const calculatedRefundRate = unitsOrdered > 0
        ? Math.round((unitsRefunded / unitsOrdered * 100) * 100) / 100
        : 0

      return {
        date: report.report_date,
        // 환불률 (이미 계산된 값)
        refundRate,
        refundRateB2B: parseFloat(report.refund_rate_b2b) || 0,
        // 환불 수량
        unitsRefunded,
        unitsRefundedB2B: parseInt(report.units_refunded_b2b) || 0,
        // 전체 주문 수량
        unitsOrdered,
        unitsOrderedB2B: parseInt(report.units_ordered_b2b) || 0,
        // 재계산된 환불률 (검증용)
        calculatedRefundRate,
        // 부정적 피드백 (품질 지표)
        negativeFeedback: parseInt(report.negative_feedback_received) || 0,
        negativeFeedbackRate: parseFloat(report.negative_feedback_rate) || 0,
        // A-to-Z 클레임
        claimsGranted: parseInt(report.claims_granted) || 0,
        claimsAmount: parseFloat(report.claims_amount) || 0
      }
    })

    // 전체 평균 계산
    const totals = refundData.reduce((acc, item) => {
      acc.totalUnitsOrdered += item.unitsOrdered
      acc.totalUnitsRefunded += item.unitsRefunded
      acc.totalNegativeFeedback += item.negativeFeedback
      acc.totalClaims += item.claimsGranted
      acc.totalClaimsAmount += item.claimsAmount
      return acc
    }, {
      totalUnitsOrdered: 0,
      totalUnitsRefunded: 0,
      totalNegativeFeedback: 0,
      totalClaims: 0,
      totalClaimsAmount: 0
    })

    const summary = {
      avgRefundRate: totals.totalUnitsOrdered > 0
        ? Math.round((totals.totalUnitsRefunded / totals.totalUnitsOrdered * 100) * 100) / 100
        : 0,
      totalUnitsOrdered: totals.totalUnitsOrdered,
      totalUnitsRefunded: totals.totalUnitsRefunded,
      totalNegativeFeedback: totals.totalNegativeFeedback,
      totalClaims: totals.totalClaims,
      totalClaimsAmount: Math.round(totals.totalClaimsAmount * 100) / 100
    }

    return NextResponse.json({
      refundData,
      summary
    })

  } catch (error) {
    console.error("Refund API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다"
      },
      { status: 500 }
    )
  }
}
