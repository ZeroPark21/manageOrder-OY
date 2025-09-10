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

async function verifyDataAfterCleanup() {
  try {
    console.log('🔍 정리 후 데이터 검증 시작...\n')
    
    // 1. 전체 데이터 조회
    console.log('📊 1. 전체 데이터 조회:')
    const { data: allContents, error: fetchError } = await supabase
      .from('contents')
      .select('*')
    
    if (fetchError) {
      console.error('❌ 데이터 조회 오류:', fetchError.message)
      return
    }
    
    console.log(`   - 전체 레코드 수: ${allContents?.length || 0}개`)
    
    // 2. video_link 기준 중복 제거
    console.log('\n🔄 2. video_link 기준 중복 제거:')
    const uniqueContentsMap = new Map()
    let duplicatesRemoved = 0
    
    allContents?.forEach(content => {
      if (content.video_link) {
        if (uniqueContentsMap.has(content.video_link)) {
          duplicatesRemoved++
        } else {
          uniqueContentsMap.set(content.video_link, content)
        }
      } else {
        // video_link가 없는 경우도 포함 (id 기준으로)
        uniqueContentsMap.set(`no_link_${content.id}`, content)
      }
    })
    
    const uniqueContents = Array.from(uniqueContentsMap.values())
    
    console.log(`   - 원본 레코드: ${allContents?.length || 0}개`)
    console.log(`   - 중복 제거됨: ${duplicatesRemoved}개`)
    console.log(`   - 유니크 레코드: ${uniqueContents.length}개`)
    
    // 3. GMV 계산
    console.log('\n💰 3. GMV 계산:')
    const totalGmv = uniqueContents.reduce((sum, content) => {
      const gmv = parseFloat(content.gmv) || 0
      return sum + gmv
    }, 0)
    
    console.log(`💵 총 GMV: ${totalGmv.toFixed(2)}`)
    
    // 4. 기타 통계
    console.log('\n📈 4. 기타 통계:')
    const totalLikes = uniqueContents.reduce((sum, content) => sum + (parseInt(content.like_count) || 0), 0)
    const totalComments = uniqueContents.reduce((sum, content) => sum + (parseInt(content.comment_count) || 0), 0)
    const totalImpressions = uniqueContents.reduce((sum, content) => sum + (parseInt(content.shoppable_impressions) || 0), 0)
    const totalOrders = uniqueContents.reduce((sum, content) => sum + (parseInt(content.affiliate_orders) || 0), 0)
    
    // 유니크 크리에이터 계산
    const uniqueCreators = new Set(
      uniqueContents
        .map(c => c.creator_name)
        .filter(name => name && name.trim() !== '')
    ).size
    
    console.log(`   - 유니크 크리에이터: ${uniqueCreators}명`)
    console.log(`   - 총 좋아요: ${totalLikes.toLocaleString()}`)
    console.log(`   - 총 댓글: ${totalComments.toLocaleString()}`)
    console.log(`   - 총 노출: ${totalImpressions.toLocaleString()}`)
    console.log(`   - 총 주문: ${totalOrders.toLocaleString()}`)
    
    // 5. Raw Data와 비교
    console.log('\n' + '='.repeat(60))
    console.log('📊 Raw Data와 비교:')
    console.log('='.repeat(60))
    console.log(`🎬 Raw Data 영상 수: 1903개`)
    console.log(`🎬 현재 DB 영상 수: ${uniqueContents.length}개`)
    console.log(`📊 차이: ${1903 - uniqueContents.length}개`)
    console.log('─'.repeat(60))
    console.log(`💰 Raw Data GMV: 10403.53`)
    console.log(`💰 현재 DB GMV: ${totalGmv.toFixed(2)}`)
    console.log(`📊 차이: ${(10403.53 - totalGmv).toFixed(2)}`)
    console.log('─'.repeat(60))
    console.log(`👥 Raw Data 크리에이터: 508명`)
    console.log(`👥 현재 DB 크리에이터: ${uniqueCreators}명`)
    console.log(`📊 차이: ${508 - uniqueCreators}명`)
    console.log('─'.repeat(60))
    console.log(`👁️  Raw Data 노출: 1,252,154`)
    console.log(`👁️  현재 DB 노출: ${totalImpressions.toLocaleString()}`)
    console.log(`📊 차이: ${(1252154 - totalImpressions).toLocaleString()}`)
    console.log('─'.repeat(60))
    console.log(`❤️  Raw Data 좋아요: 16,974`)
    console.log(`❤️  현재 DB 좋아요: ${totalLikes.toLocaleString()}`)
    console.log(`📊 차이: ${(16974 - totalLikes).toLocaleString()}`)
    console.log('='.repeat(60))
    
    // 6. 정합성 평가
    console.log('\n📋 6. 정합성 평가:')
    
    const gmvDiff = Math.abs(10403.53 - totalGmv)
    const videoDiff = Math.abs(1903 - uniqueContents.length)
    const creatorDiff = Math.abs(508 - uniqueCreators)
    
    let score = 100
    
    if (gmvDiff > 100) score -= 30
    else if (gmvDiff > 10) score -= 20
    else if (gmvDiff > 1) score -= 10
    
    if (videoDiff > 50) score -= 25
    else if (videoDiff > 10) score -= 15
    else if (videoDiff > 0) score -= 5
    
    if (creatorDiff > 20) score -= 20
    else if (creatorDiff > 5) score -= 10
    else if (creatorDiff > 0) score -= 5
    
    if (duplicatesRemoved > 0) score -= 20
    
    console.log(`   - 데이터 정합성 점수: ${score}/100`)
    
    if (score >= 90) {
      console.log('   ✅ 우수: 데이터가 매우 정확합니다!')
    } else if (score >= 80) {
      console.log('   ✅ 양호: 데이터가 대체로 정확합니다.')
    } else if (score >= 70) {
      console.log('   ⚠️  보통: 일부 개선이 필요합니다.')
    } else {
      console.log('   ❌ 불량: 상당한 개선이 필요합니다.')
    }
    
    // 7. 권장 사항
    console.log('\n💡 7. 권장 사항:')
    
    if (gmvDiff > 100) {
      console.log('   - GMV 차이가 큽니다. 중복 데이터 정리가 필요합니다.')
    }
    
    if (videoDiff > 10) {
      console.log('   - 영상 수 차이가 큽니다. 누락된 데이터를 확인하세요.')
    }
    
    if (duplicatesRemoved > 0) {
      console.log('   - 중복 데이터가 있습니다. 정리 스크립트를 실행하세요.')
    }
    
    if (score >= 90) {
      console.log('   - 데이터 품질이 우수합니다. 정기적인 모니터링을 계속하세요.')
    }
    
    // 8. 최종 요약
    console.log('\n' + '='.repeat(60))
    console.log('📋 최종 요약:')
    console.log('='.repeat(60))
    console.log(`🎬 총 영상 수: ${uniqueContents.length}개`)
    console.log(`💰 총 GMV: ${totalGmv.toFixed(2)}`)
    console.log(`👥 유니크 크리에이터: ${uniqueCreators}명`)
    console.log(`👁️  총 노출: ${totalImpressions.toLocaleString()}`)
    console.log(`❤️  총 좋아요: ${totalLikes.toLocaleString()}`)
    console.log(`📊 정합성 점수: ${score}/100`)
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ 데이터 검증 중 오류:', error)
  }
  
  process.exit(0)
}

verifyDataAfterCleanup()


