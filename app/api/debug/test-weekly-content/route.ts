import { NextResponse } from "next/server"

export async function GET() {
  try {
    // content-all-matrix API 호출
    const response = await fetch("http://localhost:3000/api/content-all-matrix")
    const data = await response.json()
    
    const weeklyData = data.weekly || {}
    const weeks = weeklyData.weeks || []
    const weeklyStats = weeklyData.weeklyStats || {}
    
    // 각 주의 데이터 확인
    const weekDetails = weeks.map((week: string) => ({
      week,
      stats: weeklyStats[week] || null,
      hasData: !!weeklyStats[week]
    }))
    
    return NextResponse.json({
      totalWeeks: weeks.length,
      weeks,
      weekDetails,
      last3Weeks: weekDetails.slice(-3),
      hasAugustData: weeks.some((w: string) => w.startsWith("2025-08"))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}