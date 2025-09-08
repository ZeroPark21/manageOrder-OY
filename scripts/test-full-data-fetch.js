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

async function testFullDataFetch() {
  try {
    console.log('🔍 전체 데이터 페치 테스트...\n')
    
    const startDate = "2025-06-01"
    const endDate = new Date().toISOString().split('T')[0]
    
    // 1. 전체 카운트 확인
    console.log('📊 1. 전체 카운트 확인:')
    const { count: totalCount, error: countError } = await supabase
      .from("contents")
      .select('*', { count: 'exact', head: true })
      .gte("publish_date", startDate)
      .lte("publish_date", endDate)
    
    if (countError) {
      console.error('❌ 카운트 오류:', countError.message)
      return
    }
    
    console.log(`   - 6월 이후 전체 레코드 수: ${totalCount || 0}개`)
    
    // 2. 배치로 모든 데이터 가져오기
    console.log('\n📊 2. 배치로 모든 데이터 가져오기:')
    let allContentsData = []
    let contentsOffset = 0
    let hasMoreContents = true
    const batchSize = 1000
    let batchCount = 0
    
    while (hasMoreContents) {
      batchCount++
      console.log(`   배치 ${batchCount} 처리 중... (offset: ${contentsOffset})`)
      
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
        console.log(`   - 배치 ${batchCount}: ${contentsBatch.length}개 레코드`)
        
        if (contentsBatch.length < batchSize) {
          hasMoreContents = false
          console.log(`   - 마지막 배치 (${contentsBatch.length}개)`)
        } else {
          contentsOffset += batchSize
        }
      } else {
        hasMoreContents = false
        console.log(`   - 더 이상 데이터 없음`)
      }
    }
    
    console.log(`\n📊 총 ${batchCount}개 배치로 ${allContentsData.length}개 레코드 조회 완료`)
    
    // 3. video_link 기준 중복 제거
    console.log('\n🔄 3. video_link 기준 중복 제거:')
    const uniqueContentsMap = new Map()
    let duplicatesRemoved = 0
    
    allContentsData.forEach(content => {
      if (content.video_link) {
        if (uniqueContentsMap.has(content.video_link)) {
          duplicatesRemoved++
        } else {
          uniqueContentsMap.set(content.video_link, content)
        }
      } else {
        // video_link가 없는 경우도 포함 (id 기준으로)
        uniqueContentsMap.set(`no_link_${Math.random()}`, content)
      }
    })
    
    const uniqueContents = Array.from(uniqueContentsMap.values())
    
    console.log(`   - 원본 레코드: ${allContentsData.length}개`)
    console.log(`   - 중복 제거됨: ${duplicatesRemoved}개`)
    console.log(`   - 유니크 레코드: ${uniqueContents.length}개`)
    
    // 4. GMV 계산
    console.log('\n💰 4. GMV 계산:')
    const totalGmv = uniqueContents.reduce((sum, content) => {
      const gmv = parseFloat(content.gmv) || 0
      return sum + gmv
    }, 0)
    
    console.log(`💵 총 GMV: ${totalGmv.toFixed(2)}`)
    
    // 5. Raw Data와 비교
    console.log('\n' + '='.repeat(60))
    console.log('📊 Raw Data와 비교:')
    console.log('='.repeat(60))
    console.log(`🎬 Raw Data 영상 수: 1911개`)
    console.log(`🎬 현재 DB 유니크 영상 수: ${uniqueContents.length}개`)
    console.log(`📊 차이: ${1911 - uniqueContents.length}개`)
    console.log('─'.repeat(60))
    console.log(`💰 Raw Data GMV: 10403.53`)
    console.log(`💰 현재 DB GMV: ${totalGmv.toFixed(2)}`)
    console.log(`📊 차이: ${(10403.53 - totalGmv).toFixed(2)}`)
    console.log('='.repeat(60))
    
    // 6. 결과 분석
    if (uniqueContents.length === 1911 && Math.abs(10403.53 - totalGmv) < 0.01) {
      console.log('\n✅ 모든 데이터가 정확합니다!')
    } else if (uniqueContents.length === 1911) {
      console.log('\n⚠️  영상 수는 일치하지만 GMV가 다릅니다.')
      console.log('   GMV 계산 로직을 확인해야 합니다.')
    } else {
      console.log('\n⚠️  데이터 불일치가 있습니다.')
      console.log('   추가 데이터 업로드가 필요할 수 있습니다.')
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

testFullDataFetch()

