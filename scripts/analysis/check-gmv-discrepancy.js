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

async function checkGmvDiscrepancy() {
  try {
    console.log('🔍 GMV 불일치 원인 분석...\n')
    
    // 1. 전체 데이터 조회 (날짜 필터링 없음)
    console.log('📊 1. 전체 데이터 조회 중...')
    const { data: allContents, error: fetchError } = await supabase
      .from('contents')
      .select('*')
    
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
    
    console.log(`   - 원본 레코드: ${allContents.length}개`)
    console.log(`   - 중복 제거됨: ${duplicatesRemoved}개`)
    console.log(`   - 유니크 레코드: ${uniqueContents.length}개`)
    
    // 3. GMV 분석
    console.log('\n💰 3. GMV 분석:')
    const totalGmv = uniqueContents.reduce((sum, content) => {
      const gmv = parseFloat(content.gmv) || 0
      return sum + gmv
    }, 0)
    
    console.log(`💵 총 GMV: ${totalGmv.toFixed(2)}`)
    
    // 4. GMV 분포 분석
    const gmvStats = {
      zero: 0,
      low: 0,      // 0 < gmv <= 10
      medium: 0,   // 10 < gmv <= 100
      high: 0,     // 100 < gmv <= 1000
      veryHigh: 0  // gmv > 1000
    }
    
    const gmvValues = []
    
    uniqueContents.forEach(content => {
      const gmv = parseFloat(content.gmv) || 0
      gmvValues.push(gmv)
      
      if (gmv === 0) gmvStats.zero++
      else if (gmv <= 10) gmvStats.low++
      else if (gmv <= 100) gmvStats.medium++
      else if (gmv <= 1000) gmvStats.high++
      else gmvStats.veryHigh++
    })
    
    console.log(`   - GMV 0: ${gmvStats.zero}개`)
    console.log(`   - GMV 0-10: ${gmvStats.low}개`)
    console.log(`   - GMV 10-100: ${gmvStats.medium}개`)
    console.log(`   - GMV 100-1000: ${gmvStats.high}개`)
    console.log(`   - GMV 1000+: ${gmvStats.veryHigh}개`)
    
    // 5. 상위 GMV 값들 확인
    console.log('\n📈 4. 상위 GMV 값들:')
    const sortedGmv = gmvValues
      .filter(gmv => gmv > 0)
      .sort((a, b) => b - a)
      .slice(0, 20)
    
    console.log('   상위 20개 GMV 값:')
    sortedGmv.forEach((gmv, index) => {
      console.log(`   ${index + 1}. ${gmv.toFixed(2)}`)
    })
    
    // 6. 날짜별 GMV 분석
    console.log('\n📅 5. 날짜별 GMV 분석:')
    const monthlyGmv = {}
    uniqueContents.forEach(content => {
      const date = new Date(content.publish_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyGmv[monthKey]) {
        monthlyGmv[monthKey] = { count: 0, gmv: 0 }
      }
      
      monthlyGmv[monthKey].count++
      monthlyGmv[monthKey].gmv += (parseFloat(content.gmv) || 0)
    })
    
    Object.entries(monthlyGmv)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        console.log(`   - ${month}: ${stats.count}개, GMV ${stats.gmv.toFixed(2)}`)
      })
    
    // 7. Raw Data와 비교
    console.log('\n' + '='.repeat(60))
    console.log('📊 Raw Data와 비교:')
    console.log('='.repeat(60))
    console.log(`🎬 Raw Data 영상 수: 1911개`)
    console.log(`🎬 현재 DB 영상 수: ${uniqueContents.length}개`)
    console.log(`📊 차이: ${1911 - uniqueContents.length}개`)
    console.log('─'.repeat(60))
    console.log(`💰 Raw Data GMV: 10403.53`)
    console.log(`💰 현재 DB GMV: ${totalGmv.toFixed(2)}`)
    console.log(`📊 차이: ${(10403.53 - totalGmv).toFixed(2)}`)
    console.log('='.repeat(60))
    
    // 8. 가능한 원인 분석
    console.log('\n🔍 GMV 불일치 원인 분석:')
    const missingGmv = 10403.53 - totalGmv
    const missingVideos = 1911 - uniqueContents.length
    
    if (missingVideos > 0) {
      console.log(`⚠️  ${missingVideos}개 영상이 누락되어 있습니다.`)
      console.log(`   누락된 영상들의 평균 GMV: ${(missingGmv / missingVideos).toFixed(2)}`)
    }
    
    if (missingGmv > 0) {
      console.log(`⚠️  GMV가 ${missingGmv.toFixed(2)} 부족합니다.`)
      console.log('   가능한 원인:')
      console.log('   1. 누락된 영상들이 높은 GMV를 가지고 있음')
      console.log('   2. 일부 데이터의 GMV 값이 0으로 저장됨')
      console.log('   3. Raw Data와 DB의 GMV 계산 방식 차이')
      console.log('   4. 데이터 타입 변환 과정에서 GMV 값 손실')
    }
    
    // 9. GMV 0인 데이터 상세 분석
    console.log('\n💸 6. GMV 0인 데이터 상세 분석:')
    const zeroGmvContents = uniqueContents.filter(c => (parseFloat(c.gmv) || 0) === 0)
    
    if (zeroGmvContents.length > 0) {
      console.log(`   - GMV 0인 콘텐츠: ${zeroGmvContents.length}개`)
      
      // GMV 0인 데이터의 다른 필드들 확인
      const hasOtherData = zeroGmvContents.filter(c => 
        (parseInt(c.like_count) || 0) > 0 || 
        (parseInt(c.comment_count) || 0) > 0 ||
        (parseInt(c.shoppable_impressions) || 0) > 0
      )
      
      console.log(`   - GMV 0이지만 다른 데이터가 있는 콘텐츠: ${hasOtherData.length}개`)
      
      if (hasOtherData.length > 0) {
        console.log('   샘플 데이터:')
        hasOtherData.slice(0, 5).forEach((content, index) => {
          console.log(`   ${index + 1}. ${content.content_title?.substring(0, 50)}...`)
          console.log(`      좋아요: ${content.like_count}, 댓글: ${content.comment_count}, 노출: ${content.shoppable_impressions}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

checkGmvDiscrepancy()


