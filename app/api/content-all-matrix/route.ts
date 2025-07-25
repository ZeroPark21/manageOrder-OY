import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

interface ContentData {
  publish_date: string
  totalCount: number
  totalGmv: number
  totalAffiliateItemsSold: number
  totalAffiliateOrders: number
  totalShoppableImpressions: number
  totalCommentCount: number
  totalLikeCount: number
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const startDate = "2025-06-01"
    const endDate = new Date().toISOString().split("T")[0]

    // 콘텐츠 데이터 조회
    const { data, error } = await supabase
      .from("contents")
      .select(`
        publish_date,
        gmv,
        affiliate_items_sold,
        affiliate_orders,
        shoppable_impressions,
        comment_count,
        like_count
      `)
      .gte("publish_date", startDate)
      .lte("publish_date", endDate)
      .order("publish_date", { ascending: true })

    if (error) {
      console.error("콘텐츠 조회 에러:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const contents = data || []

    // 일별 그룹핑
    const dailyMap: { [key: string]: ContentData } = {}
    contents.forEach((content) => {
      const date = content.publish_date.split("T")[0]
      if (!dailyMap[date]) {
        dailyMap[date] = {
          publish_date: date,
          totalCount: 0,
          totalGmv: 0,
          totalAffiliateItemsSold: 0,
          totalAffiliateOrders: 0,
          totalShoppableImpressions: 0,
          totalCommentCount: 0,
          totalLikeCount: 0,
        }
      }
      dailyMap[date].totalCount += 1
      dailyMap[date].totalGmv += content.gmv || 0
      dailyMap[date].totalAffiliateItemsSold += content.affiliate_items_sold || 0
      dailyMap[date].totalAffiliateOrders += content.affiliate_orders || 0
      dailyMap[date].totalShoppableImpressions += content.shoppable_impressions || 0
      dailyMap[date].totalCommentCount += content.comment_count || 0
      dailyMap[date].totalLikeCount += content.like_count || 0
    })

    // 주별 그룹핑
    const weeklyMap: { [key: string]: ContentData } = {}
    contents.forEach((content) => {
      const date = new Date(content.publish_date)
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      const weekKey = startOfWeek.toISOString().split("T")[0]
      
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = {
          publish_date: weekKey,
          totalCount: 0,
          totalGmv: 0,
          totalAffiliateItemsSold: 0,
          totalAffiliateOrders: 0,
          totalShoppableImpressions: 0,
          totalCommentCount: 0,
          totalLikeCount: 0,
        }
      }
      weeklyMap[weekKey].totalCount += 1
      weeklyMap[weekKey].totalGmv += content.gmv || 0
      weeklyMap[weekKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
      weeklyMap[weekKey].totalAffiliateOrders += content.affiliate_orders || 0
      weeklyMap[weekKey].totalShoppableImpressions += content.shoppable_impressions || 0
      weeklyMap[weekKey].totalCommentCount += content.comment_count || 0
      weeklyMap[weekKey].totalLikeCount += content.like_count || 0
    })

    // 월별 그룹핑
    const monthlyMap: { [key: string]: ContentData } = {}
    contents.forEach((content) => {
      const date = new Date(content.publish_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          publish_date: monthKey,
          totalCount: 0,
          totalGmv: 0,
          totalAffiliateItemsSold: 0,
          totalAffiliateOrders: 0,
          totalShoppableImpressions: 0,
          totalCommentCount: 0,
          totalLikeCount: 0,
        }
      }
      monthlyMap[monthKey].totalCount += 1
      monthlyMap[monthKey].totalGmv += content.gmv || 0
      monthlyMap[monthKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
      monthlyMap[monthKey].totalAffiliateOrders += content.affiliate_orders || 0
      monthlyMap[monthKey].totalShoppableImpressions += content.shoppable_impressions || 0
      monthlyMap[monthKey].totalCommentCount += content.comment_count || 0
      monthlyMap[monthKey].totalLikeCount += content.like_count || 0
    })

    // 정렬된 날짜 배열 생성
    const dates = Object.keys(dailyMap).sort()
    const weeks = Object.keys(weeklyMap).sort()
    const months = Object.keys(monthlyMap).sort()

    // 매트릭스 형태로 변환
    const dailyMatrix = {
      dates,
      dailyStats: dailyMap
    }

    const weeklyMatrix = {
      weeks,
      weeklyStats: weeklyMap
    }

    const monthlyMatrix = {
      months,
      monthlyStats: monthlyMap
    }

    return NextResponse.json({
      daily: dailyMatrix,
      weekly: weeklyMatrix,
      monthly: monthlyMatrix,
    })
  } catch (error: any) {
    console.error("Content all matrix API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}