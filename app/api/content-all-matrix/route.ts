import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = 'force-dynamic'

interface ContentData {
  publish_date: string
  totalCount: number
  totalGmv: number
  totalAffiliateItemsSold: number
  totalAffiliateOrders: number
  totalShoppableImpressions: number
  totalCommentCount: number
  totalLikeCount: number
  uniqueCreators?: number
}

export async function GET() {
  try {
    const supabase = createServerClient()
    // Supabase는 기본적으로 1000개 제한이 있으므로, 범위를 나누어 조회
    const allContents = []
    let hasMore = true
    let offset = 0
    const limit = 1000
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from("contents")
        .select(`
          publish_date,
          creator_name,
          gmv,
          affiliate_items_sold,
          affiliate_orders,
          shoppable_impressions,
          comment_count,
          like_count
        `)
        .order("publish_date", { ascending: true })
        .range(offset, offset + limit - 1)
      
      if (batchError) {
        console.error(`배치 조회 에러 (offset: ${offset}):`, batchError)
        break
      }
      
      if (batch && batch.length > 0) {
        allContents.push(...batch)
        offset += limit
        hasMore = batch.length === limit
      } else {
        hasMore = false
      }
    }
    
    const data = allContents

    const contents = data || []
    
    console.log(`Total contents loaded: ${contents.length}`)
    
    // 필터링 적용 - 2025년 6월 이후 데이터만 사용
    const filteredContents = contents.filter(content => {
      const date = new Date(content.publish_date)
      return date >= new Date(2025, 5, 1) // 2025년 6월 1일 이후
    })
    
    console.log(`Filtered contents (from June 2025): ${filteredContents.length}`)
    
    // 주별 데이터 확인을 위한 로그
    const weeklyCheck = filteredContents.filter(c => {
      const d = new Date(c.publish_date)
      return d >= new Date(2025, 6, 21) // 7월 21일 이후
    })
    console.log(`Contents after July 21: ${weeklyCheck.length}`)

    // 전체 기간의 고유 크리에이터 수 계산
    const allCreators = new Set<string>()
    filteredContents.forEach(content => {
      if (content.creator_name && content.creator_name.trim()) {
        allCreators.add(content.creator_name)
      }
    })

    // 일별 그룹핑 with creators
    const dailyMap: { [key: string]: ContentData & { uniqueCreators?: number } } = {}
    const dailyCreatorsMap: { [key: string]: Set<string> } = {}
    
    filteredContents.forEach((content) => {
      const date = new Date(content.publish_date).toISOString().split("T")[0]
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
          uniqueCreators: 0,
        }
        dailyCreatorsMap[date] = new Set()
      }
      dailyMap[date].totalCount += 1
      dailyMap[date].totalGmv += content.gmv || 0
      dailyMap[date].totalAffiliateItemsSold += content.affiliate_items_sold || 0
      dailyMap[date].totalAffiliateOrders += content.affiliate_orders || 0
      dailyMap[date].totalShoppableImpressions += content.shoppable_impressions || 0
      dailyMap[date].totalCommentCount += content.comment_count || 0
      dailyMap[date].totalLikeCount += content.like_count || 0
      
      // 크리에이터 추가 (null이나 빈 문자열이 아닌 경우만)
      if (content.creator_name && content.creator_name.trim()) {
        dailyCreatorsMap[date].add(content.creator_name)
      }
    })
    
    // 일별 unique creators 수 설정
    Object.keys(dailyMap).forEach(date => {
      dailyMap[date].uniqueCreators = dailyCreatorsMap[date].size
    })

    // 주별 그룹핑 with creators
    const weeklyMap: { [key: string]: ContentData & { uniqueCreators?: number } } = {}
    const weeklyCreatorsMap: { [key: string]: Set<string> } = {}
    
    filteredContents.forEach((content) => {
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
          uniqueCreators: 0,
        }
        weeklyCreatorsMap[weekKey] = new Set()
      }
      weeklyMap[weekKey].totalCount += 1
      weeklyMap[weekKey].totalGmv += content.gmv || 0
      weeklyMap[weekKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
      weeklyMap[weekKey].totalAffiliateOrders += content.affiliate_orders || 0
      weeklyMap[weekKey].totalShoppableImpressions += content.shoppable_impressions || 0
      weeklyMap[weekKey].totalCommentCount += content.comment_count || 0
      weeklyMap[weekKey].totalLikeCount += content.like_count || 0
      
      // 크리에이터 추가 (null이나 빈 문자열이 아닌 경우만)
      if (content.creator_name && content.creator_name.trim()) {
        weeklyCreatorsMap[weekKey].add(content.creator_name)
      }
    })
    
    // 주별 unique creators 수 설정
    Object.keys(weeklyMap).forEach(week => {
      weeklyMap[week].uniqueCreators = weeklyCreatorsMap[week].size
    })

    // 월별 그룹핑 with creators
    const monthlyMap: { [key: string]: ContentData & { uniqueCreators?: number } } = {}
    const monthlyCreatorsMap: { [key: string]: Set<string> } = {}
    
    filteredContents.forEach((content) => {
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
          uniqueCreators: 0,
        }
        monthlyCreatorsMap[monthKey] = new Set()
      }
      monthlyMap[monthKey].totalCount += 1
      monthlyMap[monthKey].totalGmv += content.gmv || 0
      monthlyMap[monthKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
      monthlyMap[monthKey].totalAffiliateOrders += content.affiliate_orders || 0
      monthlyMap[monthKey].totalShoppableImpressions += content.shoppable_impressions || 0
      monthlyMap[monthKey].totalCommentCount += content.comment_count || 0
      monthlyMap[monthKey].totalLikeCount += content.like_count || 0
      
      // 크리에이터 추가 (null이나 빈 문자열이 아닌 경우만)
      if (content.creator_name && content.creator_name.trim()) {
        monthlyCreatorsMap[monthKey].add(content.creator_name)
      }
    })
    
    // 월별 unique creators 수 설정
    Object.keys(monthlyMap).forEach(month => {
      monthlyMap[month].uniqueCreators = monthlyCreatorsMap[month].size
    })

    // 정렬된 날짜 배열 생성
    const dates = Object.keys(dailyMap).sort()
    const weeks = Object.keys(weeklyMap).sort()
    const months = Object.keys(monthlyMap).sort()
    

    // 매트릭스 형태로 변환
    const dailyMatrix = {
      dates,
      dailyStats: dailyMap,
      totalUniqueCreators: allCreators.size // 전체 기간의 고유 크리에이터 수
    }

    const weeklyMatrix = {
      weeks,
      weeklyStats: weeklyMap,
      totalUniqueCreators: allCreators.size // 전체 기간의 고유 크리에이터 수
    }

    const monthlyMatrix = {
      months,
      monthlyStats: monthlyMap,
      totalUniqueCreators: allCreators.size // 전체 기간의 고유 크리에이터 수
    }

    return NextResponse.json({
      daily: dailyMatrix,
      weekly: weeklyMatrix,
      monthly: monthlyMatrix,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error: any) {
    console.error("Content all matrix API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}