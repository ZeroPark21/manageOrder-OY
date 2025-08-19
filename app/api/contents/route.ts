import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

interface ContentSimple {
  id: number
  content_title: string
  video_link: string
  publish_date: string
  creator_name: string
  gmv: number
  affiliate_items_sold: number
  affiliate_gmv: number
  shoppable_avg_order_value: number
  est_commission: number
  est_flat_fee: string
  affiliate_orders: number
  shoppable_impressions: number
  affiliate_ctr: number
  shoppable_gpm: number
  affiliate_items_refunded: number
  affiliate_refunded_gmv: number
  comment_count: number
  like_count: number
}

function groupByDate(contents: ContentSimple[]) {
  const grouped: { [key: string]: { 
    date: string; 
    totalCount: number; 
    totalGmv: number;
    totalAffiliateItemsSold: number;
    totalAffiliateOrders: number;
    totalShoppableImpressions: number;
    totalCommentCount: number;
    totalLikeCount: number;
    contents: ContentSimple[] 
  } } = {}

  contents.forEach((content) => {
    if (!content.publish_date) return

    const date = new Date(content.publish_date)
    const dateKey = date.toISOString().split("T")[0] // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        totalCount: 0,
        totalGmv: 0,
        totalAffiliateItemsSold: 0,
        totalAffiliateOrders: 0,
        totalShoppableImpressions: 0,
        totalCommentCount: 0,
        totalLikeCount: 0,
        contents: [],
      }
    }

    grouped[dateKey].totalCount += 1
    grouped[dateKey].totalGmv += content.gmv || 0
    grouped[dateKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
    grouped[dateKey].totalAffiliateOrders += content.affiliate_orders || 0
    grouped[dateKey].totalShoppableImpressions += content.shoppable_impressions || 0
    grouped[dateKey].totalCommentCount += content.comment_count || 0
    grouped[dateKey].totalLikeCount += content.like_count || 0
    grouped[dateKey].contents.push(content)
  })

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
}

function groupByWeek(contents: ContentSimple[]) {
  const grouped: { [key: string]: { 
    week: string; 
    totalCount: number; 
    totalGmv: number;
    totalAffiliateItemsSold: number;
    totalAffiliateOrders: number;
    totalShoppableImpressions: number;
    totalCommentCount: number;
    totalLikeCount: number;
    contents: ContentSimple[] 
  } } = {}

  contents.forEach((content) => {
    if (!content.publish_date) return

    const date = new Date(content.publish_date)
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay()) // 일요일로 설정
    const weekKey = startOfWeek.toISOString().split("T")[0]

    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        week: weekKey,
        totalCount: 0,
        totalGmv: 0,
        totalAffiliateItemsSold: 0,
        totalAffiliateOrders: 0,
        totalShoppableImpressions: 0,
        totalCommentCount: 0,
        totalLikeCount: 0,
        contents: [],
      }
    }

    grouped[weekKey].totalCount += 1
    grouped[weekKey].totalGmv += content.gmv || 0
    grouped[weekKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
    grouped[weekKey].totalAffiliateOrders += content.affiliate_orders || 0
    grouped[weekKey].totalShoppableImpressions += content.shoppable_impressions || 0
    grouped[weekKey].totalCommentCount += content.comment_count || 0
    grouped[weekKey].totalLikeCount += content.like_count || 0
    grouped[weekKey].contents.push(content)
  })

  return Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week))
}

function groupByMonth(contents: ContentSimple[]) {
  const grouped: { [key: string]: { 
    month: string; 
    totalCount: number; 
    totalGmv: number;
    totalAffiliateItemsSold: number;
    totalAffiliateOrders: number;
    totalShoppableImpressions: number;
    totalCommentCount: number;
    totalLikeCount: number;
    contents: ContentSimple[] 
  } } = {}

  contents.forEach((content) => {
    if (!content.publish_date) return

    const date = new Date(content.publish_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: monthKey,
        totalCount: 0,
        totalGmv: 0,
        totalAffiliateItemsSold: 0,
        totalAffiliateOrders: 0,
        totalShoppableImpressions: 0,
        totalCommentCount: 0,
        totalLikeCount: 0,
        contents: [],
      }
    }

    grouped[monthKey].totalCount += 1
    grouped[monthKey].totalGmv += content.gmv || 0
    grouped[monthKey].totalAffiliateItemsSold += content.affiliate_items_sold || 0
    grouped[monthKey].totalAffiliateOrders += content.affiliate_orders || 0
    grouped[monthKey].totalShoppableImpressions += content.shoppable_impressions || 0
    grouped[monthKey].totalCommentCount += content.comment_count || 0
    grouped[monthKey].totalLikeCount += content.like_count || 0
    grouped[monthKey].contents.push(content)
  })

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
}

function groupByCreator(contents: ContentSimple[]) {
  const grouped: { [key: string]: { creator: string; totalCount: number; contents: ContentSimple[] } } = {}

  // 이미 중복 제거된 콘텐츠를 사용하므로 추가 중복 제거 불필요
  contents.forEach((content) => {
    const creatorKey = content.creator_name

    if (!grouped[creatorKey]) {
      grouped[creatorKey] = {
        creator: creatorKey,
        totalCount: 0,
        contents: [],
      }
    }

    grouped[creatorKey].totalCount += 1
    grouped[creatorKey].contents.push(content)
  })

  return Object.values(grouped).sort((a, b) => b.totalCount - a.totalCount)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get("groupBy") || "daily"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = createServerClient()
    
    // 기본값: 2025년 6월 1일부터 2025년 12월 31일까지
    let defaultStartDate = "2025-06-01"
    let defaultEndDate = "2025-12-31"
    
    if (groupBy === "daily" && !startDate) {
      // daily의 경우에도 전체 기간 표시
      defaultStartDate = "2025-06-01"
    }

    // contents 테이블에서 데이터 조회
    let query = supabase
      .from("contents")
      .select(`
        id,
        content_title,
        video_link,
        publish_date,
        creator_name,
        gmv,
        affiliate_items_sold,
        affiliate_gmv,
        shoppable_avg_order_value,
        est_commission,
        est_flat_fee,
        affiliate_orders,
        shoppable_impressions,
        affiliate_ctr,
        shoppable_gpm,
        affiliate_items_refunded,
        affiliate_refunded_gmv,
        comment_count,
        like_count
      `)
      .gte("publish_date", startDate || defaultStartDate)
      .order("publish_date", { ascending: true })
      .limit(10000) // 충분히 큰 제한 설정
      
    if (endDate || defaultEndDate) {
      query = query.lte("publish_date", endDate || defaultEndDate)
    }

    // 모든 데이터를 동적으로 가져오기
    let allData: ContentSimple[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    let dbError: any = null
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from("contents")
        .select(`
          id,
          content_title,
          video_link,
          publish_date,
          creator_name,
          gmv,
          affiliate_items_sold,
          affiliate_gmv,
          shoppable_avg_order_value,
          est_commission,
          est_flat_fee,
          affiliate_orders,
          shoppable_impressions,
          affiliate_ctr,
          shoppable_gpm,
          affiliate_items_refunded,
          affiliate_refunded_gmv,
          comment_count,
          like_count
        `)
        .gte("publish_date", startDate || defaultStartDate)
        .lte("publish_date", endDate || defaultEndDate)
        .order("publish_date", { ascending: true })
        .range(offset, offset + batchSize - 1)
      
      if (batchError) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError)
        if (offset === 0) {
          // 첫 번째 배치에서 에러가 발생하면 전체 에러로 처리
          dbError = batchError
        }
        break
      }
      
      if (batch && batch.length > 0) {
        allData = [...allData, ...batch]
        console.log(`📦 Fetched batch ${Math.floor(offset / batchSize) + 1}: ${batch.length} items (Total: ${allData.length})`)
        offset += batchSize
        
        // 배치 크기보다 적게 반환되면 더 이상 데이터가 없음
        if (batch.length < batchSize) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    const data = allData.length > 0 ? allData : null
    
    // 디버깅을 위한 로그 추가
    console.log(`📊 Total contents fetched: ${data ? data.length : 0}`)

    if (dbError) {
      // 테이블이 없으면 빈 데이터로 응답
      if ((dbError as any).code === "42P01") {
        console.warn("contents 테이블이 없어 빈 결과를 반환합니다.")
        return NextResponse.json({
          data: [],
          totalContents: 0,
          totalCount: 0,
          uniqueCreators: 0,
        })
      }

      console.error("Supabase error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    const contents = (data || []) as ContentSimple[]

    const safeContents = contents.map((c) => ({
      ...c,
      like_count: Number(c.like_count) || 0,
      comment_count: Number(c.comment_count) || 0,
    }))

    // video_link 기반으로 중복 제거 (전체 URL 기준)
    const uniqueVideoMap = new Map<string, ContentSimple>()
    safeContents.forEach(content => {
      if (content.video_link && !uniqueVideoMap.has(content.video_link)) {
        uniqueVideoMap.set(content.video_link, content)
      }
    })
    const uniqueContents = Array.from(uniqueVideoMap.values())
    
    console.log(`중복 제거: ${safeContents.length}개 → ${uniqueContents.length}개`)

    // 고유 크리에이터 수 계산
    const uniqueCreators = new Set(uniqueContents.map((c) => c.creator_name)).size
    
    // 중복 제거된 데이터로 통계 계산
    const totalShoppableImpressions = uniqueContents.reduce(
      (sum, content) => sum + (content.shoppable_impressions || 0), 
      0
    )
    
    // 총 좋아요 수 계산
    const totalLikeCount = uniqueContents.reduce(
      (sum, content) => sum + (content.like_count || 0), 
      0
    )
    
    // 총 GMV 계산
    const totalGmv = uniqueContents.reduce(
      (sum, content) => sum + (content.gmv || 0),
      0
    )
    
    // 총 수수료 계산
    const totalCommission = uniqueContents.reduce(
      (sum, content) => sum + (content.est_commission || 0),
      0
    )
    
    // 총 주문 수 계산
    const totalOrders = uniqueContents.reduce(
      (sum, content) => sum + (content.affiliate_orders || 0),
      0
    )

    let groupedData

    switch (groupBy) {
      case "daily":
        groupedData = groupByDate(uniqueContents)
        break
      case "weekly":
        groupedData = groupByWeek(uniqueContents)
        break
      case "monthly":
        groupedData = groupByMonth(uniqueContents)
        break
      case "creator":
        groupedData = groupByCreator(uniqueContents)
        break
      default:
        groupedData = groupByDate(uniqueContents)
    }

    return NextResponse.json({
      data: groupedData,
      totalContents: uniqueContents.length,
      totalCount: uniqueContents.length,
      uniqueCreators: uniqueCreators,
      totalShoppableImpressions: totalShoppableImpressions,
      totalLikeCount: totalLikeCount,
      totalGmv: totalGmv,
      totalCommission: totalCommission,
      totalOrders: totalOrders,
    })
  } catch (err: any) {
    console.error("API /api/contents error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
} 