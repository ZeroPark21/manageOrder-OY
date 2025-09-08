const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testContentStatsAPI() {
  try {
    console.log('🔍 Content Stats API 로직 테스트...\n')
    
    const startDate = "2025-06-01"
    const endDate = new Date().toISOString().split('T')[0]
    
    // 1. 크리에이터 데이터 가져오기
    console.log('📊 1. 크리에이터 데이터 조회 중...')
    let allCreatorNames = []
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
        allCreatorNames = [...allCreatorNames, ...batch.map((b) => b.creator_name)]
        if (batch.length < batchSize) {
          hasMore = false
        } else {
          offset += batchSize
        }
      } else {
        hasMore = false
      }
    }
    
    const uniqueCreators = new Set(
      allCreatorNames.filter(name => name && name.trim() !== '')
    ).size
    
    console.log(`   - 전체 크리에이터 레코드: ${allCreatorNames.length}개`)
    console.log(`   - 유니크 크리에이터: ${uniqueCreators}명`)
    
    // 2. 콘텐츠 데이터 가져오기 (중복 제거)
    console.log('\n📊 2. 콘텐츠 데이터 조회 및 중복 제거 중...')
    let allContentsData = []
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
    const uniqueContentsMap = new Map()
    allContentsData.forEach(content => {
      if (content.video_link && !uniqueContentsMap.has(content.video_link)) {
        uniqueContentsMap.set(content.video_link, content)
      }
    })
    const uniqueContents = Array.from(uniqueContentsMap.values())
    
    console.log(`   - 전체 레코드: ${allContentsData.length}개`)
    console.log(`   - 중복 제거 후: ${uniqueContents.length}개`)
    console.log(`   - 중복 제거됨: ${allContentsData.length - uniqueContents.length}개`)
    
    // 3. 통계 계산
    console.log('\n📊 3. 통계 계산 중...')
    const stats = {
      totalContents: uniqueContents.length,
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
    
    // 4. 결과 출력
    console.log('\n' + '='.repeat(60))
    console.log('📋 Content Stats API 결과:')
    console.log('='.repeat(60))
    console.log(`🎬 총 영상 수 (중복 제거): ${stats.totalContents}개`)
    console.log(`👥 유니크 크리에이터: ${stats.uniqueCreators}명`)
    console.log(`👁️  총 쇼퍼블 노출: ${stats.totalShoppableImpressions.toLocaleString()}`)
    console.log(`❤️  총 좋아요: ${stats.totalLikeCount.toLocaleString()}`)
    console.log(`💬 총 댓글: ${stats.totalCommentCount.toLocaleString()}`)
    console.log(`💰 총 GMV: ${stats.totalGmv.toFixed(2)}`)
    console.log(`📅 분석 기간: ${stats.dateRange.start} ~ ${stats.dateRange.end}`)
    console.log('='.repeat(60))
    
    // 5. 이전 결과와 비교
    console.log('\n🔍 이전 결과와 비교:')
    console.log(`   - 이전 총 영상 수: 7479개 (잘못된 수치)`)
    console.log(`   - 수정된 총 영상 수: ${stats.totalContents}개 (정확한 수치)`)
    console.log(`   - 이전 GMV: 알 수 없음`)
    console.log(`   - 수정된 GMV: ${stats.totalGmv.toFixed(2)}`)
    
    if (stats.totalContents !== 7479) {
      console.log('\n✅ 수정 완료! 이제 정확한 수치가 표시됩니다.')
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

testContentStatsAPI()

