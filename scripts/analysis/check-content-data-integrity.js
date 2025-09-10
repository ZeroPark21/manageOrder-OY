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

async function checkContentDataIntegrity() {
  try {
    console.log('🔍 콘텐츠 데이터 정합성 확인 시작...\n')
    
    // 1. 전체 콘텐츠 데이터 조회 (6월 1일 이후)
    console.log('📊 1. 전체 콘텐츠 데이터 조회 중...')
    const { data: allContents, error: fetchError } = await supabase
      .from('contents')
      .select('*')
      .gte('publish_date', '2025-06-01')
    
    if (fetchError) {
      console.error('❌ 데이터 조회 오류:', fetchError.message)
      return
    }
    
    console.log(`📋 전체 레코드 수: ${allContents?.length || 0}개`)
    
    if (!allContents || allContents.length === 0) {
      console.log('⚠️  데이터가 없습니다.')
      return
    }
    
    // 2. video_link 기준 중복 제거
    console.log('\n🔄 2. video_link 기준 중복 제거 중...')
    const uniqueContentsMap = new Map()
    let duplicatesRemoved = 0
    
    allContents.forEach(content => {
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
    
    console.log(`🔢 중복 제거 결과:`)
    console.log(`   - 원본 레코드: ${allContents.length}개`)
    console.log(`   - 중복 제거됨: ${duplicatesRemoved}개`)
    console.log(`   - 유니크 레코드: ${uniqueContents.length}개`)
    
    // 3. GMV 계산
    console.log('\n💰 3. GMV 계산 중...')
    const totalGmv = uniqueContents.reduce((sum, content) => {
      const gmv = parseFloat(content.gmv) || 0
      return sum + gmv
    }, 0)
    
    console.log(`💵 총 GMV: ${totalGmv.toFixed(2)}`)
    
    // 4. 기타 통계
    console.log('\n📈 4. 기타 통계:')
    const totalLikes = uniqueContents.reduce((sum, content) => sum + (parseInt(content.like_count) || 0), 0)
    const totalComments = uniqueContents.reduce((sum, content) => sum + (parseInt(content.comment_count) || 0), 0)
    const totalShoppableImpressions = uniqueContents.reduce((sum, content) => sum + (parseInt(content.shoppable_impressions) || 0), 0)
    const totalCommission = uniqueContents.reduce((sum, content) => sum + (parseFloat(content.est_commission) || 0), 0)
    const totalOrders = uniqueContents.reduce((sum, content) => sum + (parseInt(content.affiliate_orders) || 0), 0)
    
    // 유니크 크리에이터 계산
    const uniqueCreators = new Set(
      uniqueContents
        .map(c => c.creator_name)
        .filter(name => name && name.trim() !== '')
    ).size
    
    console.log(`   - 총 좋아요: ${totalLikes.toLocaleString()}`)
    console.log(`   - 총 댓글: ${totalComments.toLocaleString()}`)
    console.log(`   - 총 쇼퍼블 노출: ${totalShoppableImpressions.toLocaleString()}`)
    console.log(`   - 총 수수료: ${totalCommission.toFixed(2)}`)
    console.log(`   - 총 주문: ${totalOrders.toLocaleString()}`)
    console.log(`   - 유니크 크리에이터: ${uniqueCreators}명`)
    
    // 5. 날짜 범위 확인
    console.log('\n📅 5. 날짜 범위 확인:')
    const dates = uniqueContents.map(c => new Date(c.publish_date)).sort((a, b) => a - b)
    if (dates.length > 0) {
      console.log(`   - 첫 게시일: ${dates[0].toISOString().split('T')[0]}`)
      console.log(`   - 마지막 게시일: ${dates[dates.length - 1].toISOString().split('T')[0]}`)
    }
    
    // 6. video_link가 없는 데이터 확인
    console.log('\n🔗 6. video_link 누락 데이터 확인:')
    const noVideoLink = uniqueContents.filter(c => !c.video_link)
    console.log(`   - video_link 누락: ${noVideoLink.length}개`)
    
    // 7. GMV가 0인 데이터 확인
    console.log('\n💸 7. GMV 0인 데이터 확인:')
    const zeroGmv = uniqueContents.filter(c => (parseFloat(c.gmv) || 0) === 0)
    console.log(`   - GMV 0인 콘텐츠: ${zeroGmv.length}개`)
    
    // 8. 월별 분포 확인
    console.log('\n📊 8. 월별 분포:')
    const monthlyStats = {}
    uniqueContents.forEach(content => {
      const date = new Date(content.publish_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          count: 0,
          gmv: 0
        }
      }
      
      monthlyStats[monthKey].count++
      monthlyStats[monthKey].gmv += (parseFloat(content.gmv) || 0)
    })
    
    Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        console.log(`   - ${month}: ${stats.count}개, GMV ${stats.gmv.toFixed(2)}`)
      })
    
    // 9. 요약
    console.log('\n' + '='.repeat(60))
    console.log('📋 최종 요약:')
    console.log('='.repeat(60))
    console.log(`🎬 총 영상 수 (중복 제거): ${uniqueContents.length}개`)
    console.log(`💰 총 GMV: ${totalGmv.toFixed(2)}`)
    console.log(`👥 유니크 크리에이터: ${uniqueCreators}명`)
    console.log(`❤️  총 좋아요: ${totalLikes.toLocaleString()}`)
    console.log(`💬 총 댓글: ${totalComments.toLocaleString()}`)
    console.log(`👁️  총 쇼퍼블 노출: ${totalShoppableImpressions.toLocaleString()}`)
    console.log(`💵 총 수수료: ${totalCommission.toFixed(2)}`)
    console.log(`🛒 총 주문: ${totalOrders.toLocaleString()}`)
    console.log('='.repeat(60))
    
    // 10. Raw Data와 비교
    console.log('\n🔍 Raw Data 비교:')
    console.log(`   - Raw Data 영상 수: 1911개`)
    console.log(`   - 현재 계산 영상 수: ${uniqueContents.length}개`)
    console.log(`   - 차이: ${1911 - uniqueContents.length}개`)
    console.log(`   - Raw Data GMV: 10403.53`)
    console.log(`   - 현재 계산 GMV: ${totalGmv.toFixed(2)}`)
    console.log(`   - 차이: ${(10403.53 - totalGmv).toFixed(2)}`)
    
    if (Math.abs(1911 - uniqueContents.length) > 0 || Math.abs(10403.53 - totalGmv) > 0.01) {
      console.log('\n⚠️  데이터 불일치가 발견되었습니다!')
      console.log('   가능한 원인:')
      console.log('   1. 날짜 필터링 조건 (2025-06-01 이후)')
      console.log('   2. 중복 제거 로직')
      console.log('   3. 데이터 업로드/처리 과정에서의 누락')
      console.log('   4. GMV 값의 데이터 타입 변환 문제')
    } else {
      console.log('\n✅ 데이터가 Raw Data와 일치합니다!')
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

checkContentDataIntegrity()


