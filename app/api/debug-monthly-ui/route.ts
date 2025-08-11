import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 직접 content-all-matrix API 호출
    const response = await fetch("http://localhost:3000/api/content-all-matrix")
    const data = await response.json()
    
    const monthlyData = data.monthly || {}
    const months = monthlyData.months || []
    const monthlyStats = monthlyData.monthlyStats || {}
    
    // UI에서 표시되는 Total 계산
    const uiTotal = months.reduce((sum: number, month: string) => {
      return sum + (monthlyStats[month]?.totalCount || 0)
    }, 0)
    
    return NextResponse.json({
      apiResponse: {
        totalMonths: months.length,
        months,
        monthlyBreakdown: months.map(month => ({
          month,
          count: monthlyStats[month]?.totalCount || 0
        })),
        uiCalculatedTotal: uiTotal
      },
      debugInfo: {
        hasAugustData: months.includes("2025-08"),
        augustCount: monthlyStats["2025-08"]?.totalCount || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}