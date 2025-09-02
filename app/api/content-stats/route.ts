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
    
    // 모든 콘텐츠 데이터 가져오기 (video_link 기준 중복 제거를 위해)
    let allContentsData: any[] = []
    let contentsOffset = 0
    let hasMoreContents = true
    
    while (hasMoreContents) {
      const { data: contentsBatch, error: contentsBatchError } = await supabase
        .from("contents")
        .select(`
          video_link,
          shoppable_impressions,
          like_count,
          comment_count,
          gmv
        `)
        .gte("publish_date", startDate)
        .lte("publish_date", endDate)
        .range(contentsOffset, contentsOffset + batchSize - 1)
      
      if (contentsBatchError) {
        console.error(`Error fetching contents batch at offset ${contentsOffset}:`, contentsBatchError)
        if (contentsOffset === 0) throw contentsBatchError
        break
      }
      
      if (contentsBatch && contentsBatch.length > 0) {
        allContentsData = [...allContentsData, ...contentsBatch]
        if (contentsBatch.length < batchSize) {
          hasMoreContents = false
        } else {
          contentsOffset += batchSize
        }
      } else {
        hasMoreContents = false
      }
    }
    
    // video_link 기준으로 중복 제거
    const uniqueContentsMap = new Map<string, any>()
    allContentsData.forEach(content => {
      if (content.video_link && !uniqueContentsMap.has(content.video_link)) {
        uniqueContentsMap.set(content.video_link, content)
      }
    })
    const uniqueContents = Array.from(uniqueContentsMap.values())
    
    console.log(`🔄 중복 제거: ${allContentsData.length}개 → ${uniqueContents.length}개`)
    
    // 통계 집계 (중복 제거된 데이터 기준)
    const stats: ContentStats = {
      totalContents: uniqueContents.length, // video_link 기준 중복 제거된 수
      uniqueCreators: uniqueCreators,
      totalShoppableImpressions: uniqueContents.reduce((sum, row) => sum + (row.shoppable_impressions || 0), 0),
      totalLikeCount: uniqueContents.reduce((sum, row) => sum + (Number(row.like_count) || 0), 0),
      totalCommentCount: uniqueContents.reduce((sum, row) => sum + (Number(row.comment_count) || 0), 0),
      totalGmv: uniqueContents.reduce((sum, row) => sum + (Number(row.gmv) || 0), 0),
      dateRange: {
        start: startDate,
        end: endDate
      }
    }
    
    console.log(`📊 Content Stats API - Unique Creators: ${uniqueCreators}, Total Contents: ${uniqueContents.length} (중복 제거 후)`)
    
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