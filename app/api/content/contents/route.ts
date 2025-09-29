import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

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
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // 기본값: 2025년 5월 1일부터 2025년 12월 31일까지 (모든 데이터 포함)
    let defaultStartDate = "2025-05-01"
    let defaultEndDate = "2025-12-31"
    
    if (groupBy === "daily" && !startDate) {
      // daily의 경우에도 전체 기간 표시
      defaultStartDate = "2025-05-01"
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
      // 페이지네이션으로 모든 데이터 조회
      
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
        .eq("company_id", companyId)
        .order("publish_date", { ascending: true })
        .range(offset, offset + batchSize - 1)
      
      if (batchError) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError)
        if (offset === 0) {
          // 첫 번째 배치에서 에러가 발생하면 전체 에러로 처리
          dbError = batchError
          break
        }
        // 이후 배치에서 에러가 발생하면 지금까지 가져온 데이터로 진행
        hasMore = false
        break
      }
      
      if (!batch || batch.length === 0) {
        hasMore = false
        break
      }
      
      allData = [...allData, ...batch]
      
      // 배치 크기보다 적게 반환되면 더 이상 데이터가 없음
      if (batch.length < batchSize) {
        hasMore = false
      } else {
        offset += batchSize
      }
    }
    
    if (dbError && allData.length === 0) {
      console.error("Error fetching contents:", dbError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    
    console.log(`Fetched ${allData.length} records from database`)

    // 타입 변환
    const contents: ContentSimple[] = allData.map((item) => ({
      id: item.id,
      content_title: item.content_title,
      video_link: item.video_link,
      publish_date: item.publish_date,
      creator_name: item.creator_name,
      gmv: item.gmv || 0,
      affiliate_items_sold: item.affiliate_items_sold || 0,
      affiliate_gmv: item.affiliate_gmv || 0,
      shoppable_avg_order_value: item.shoppable_avg_order_value || 0,
      est_commission: item.est_commission || 0,
      est_flat_fee: item.est_flat_fee,
      affiliate_orders: item.affiliate_orders || 0,
      shoppable_impressions: item.shoppable_impressions || 0,
      affiliate_ctr: item.affiliate_ctr || 0,
      shoppable_gpm: item.shoppable_gpm || 0,
      affiliate_items_refunded: item.affiliate_items_refunded || 0,
      affiliate_refunded_gmv: item.affiliate_refunded_gmv || 0,
      comment_count: item.comment_count || 0,
      like_count: item.like_count || 0,
    }))

    // video_link 기준으로 중복 제거
    const uniqueContentsMap = new Map<string, ContentSimple>()
    contents.forEach((content) => {
      if (content.video_link && !uniqueContentsMap.has(content.video_link)) {
        uniqueContentsMap.set(content.video_link, content)
      } else if (!content.video_link) {
        // video_link가 없는 경우도 포함 (ID 기준)
        uniqueContentsMap.set(`no_link_${content.id}`, content)
      }
    })
    
    const uniqueContents = Array.from(uniqueContentsMap.values())
    console.log(`After removing duplicates: ${uniqueContents.length} unique contents`)

    // 고유 크리에이터 수 계산
    const uniqueCreators = new Set(uniqueContents.map((content) => content.creator_name)).size

    // 총 노출 수 계산
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