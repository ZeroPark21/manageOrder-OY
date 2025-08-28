import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"
export const dynamic = 'force-dynamic'

interface ContentStats {
  totalContents: number
  uniqueCreators: number
  totalShoppableImpressions: number
  totalLikeCount: number
  totalCommentCount: number
  totalGmv: number
  dateRange: {
    start: string
    end: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || "2025-06-01"
    const endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0]
    
    const supabase = createServerClient()
    
    // 정확한 크리에이터 수를 위해 모든 데이터 가져오기 (pagination)
    let allCreatorNames: string[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from("contents")
        .select("creator_name")
        .gte("publish_date", startDate)
        .lte("publish_date", endDate)
        .not("creator_name", "is", null)
        .neq("creator_name", "")
        .range(offset, offset + batchSize - 1)
      
      if (batchError) {
        console.error(`Error fetching creator batch at offset ${offset}:`, batchError)
        if (offset === 0) throw batchError
        break
      }
      
      if (batch && batch.length > 0) {
        allCreatorNames = [...allCreatorNames, ...batch.map(b => b.creator_name)]
        if (batch.length < batchSize) {
          hasMore = false
        } else {
          offset += batchSize
        }
      } else {
        hasMore = false
      }
    }
    
    // 유니크한 크리에이터 수 계산
    const uniqueCreators = new Set(
      allCreatorNames.filter(name => name && name.trim() !== '')
    ).size
    
    console.log(`🔍 Fetched ${allCreatorNames.length} creator records, ${uniqueCreators} unique creators`)
    
    // 집계 데이터 가져오기 (pagination)
    let allStatsData: any[] = []
    let statsOffset = 0
    let hasMoreStats = true
    let totalCount = 0
    
    // 먼저 전체 카운트 가져오기
    const { count } = await supabase
      .from("contents")
      .select("*", { count: 'exact', head: true })
      .gte("publish_date", startDate)
      .lte("publish_date", endDate)
    
    totalCount = count || 0
    
    while (hasMoreStats) {
      const { data: statsBatch, error: statsBatchError } = await supabase
        .from("contents")
        .select(`
          shoppable_impressions,
          like_count,
          comment_count,
          gmv
        `)
        .gte("publish_date", startDate)
        .lte("publish_date", endDate)
        .range(statsOffset, statsOffset + batchSize - 1)
      
      if (statsBatchError) {
        console.error(`Error fetching stats batch at offset ${statsOffset}:`, statsBatchError)
        if (statsOffset === 0) throw statsBatchError
        break
      }
      
      if (statsBatch && statsBatch.length > 0) {
        allStatsData = [...allStatsData, ...statsBatch]
        if (statsBatch.length < batchSize) {
          hasMoreStats = false
        } else {
          statsOffset += batchSize
        }
      } else {
        hasMoreStats = false
      }
    }
    
    const statsData = allStatsData
    const statsError = null
    
    if (statsError) {
      console.error("Error fetching stats:", statsError)
      throw statsError
    }
    
    // 통계 집계
    const stats: ContentStats = {
      totalContents: totalCount,
      uniqueCreators: uniqueCreators,
      totalShoppableImpressions: statsData?.reduce((sum, row) => sum + (row.shoppable_impressions || 0), 0) || 0,
      totalLikeCount: statsData?.reduce((sum, row) => sum + (Number(row.like_count) || 0), 0) || 0,
      totalCommentCount: statsData?.reduce((sum, row) => sum + (Number(row.comment_count) || 0), 0) || 0,
      totalGmv: statsData?.reduce((sum, row) => sum + (row.gmv || 0), 0) || 0,
      dateRange: {
        start: startDate,
        end: endDate
      }
    }
    
    console.log(`📊 Content Stats API - Unique Creators: ${uniqueCreators}, Total Contents: ${count}`)
    
    const response = NextResponse.json({
      success: true,
      data: stats
    })
    
    // 캐시 헤더 설정 (1분)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    
    return response
    
  } catch (error: any) {
    console.error("Content Stats API Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    )
  }
}