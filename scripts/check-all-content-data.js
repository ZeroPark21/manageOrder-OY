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

async function checkAllContentData() {
  try {
    console.log('🔍 전체 콘텐츠 데이터 확인 시작...\n')
    
    // 1. 전체 콘텐츠 데이터 조회 (날짜 필터링 없음)
    console.log('📊 1. 전체 콘텐츠 데이터 조회 중...')
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
    
    // 2. 날짜별 분포 확인
    console.log('\n📅 2. 날짜별 분포 확인:')
    const dateStats = {}
    let beforeJune = 0
    let afterJune = 0
    
    allContents.forEach(content => {
      const date = new Date(content.publish_date)
      const dateKey = date.toISOString().split('T')[0]
      
      if (!dateStats[dateKey]) {
        dateStats[dateKey] = { count: 0, gmv: 0 }
      }
      
      dateStats[dateKey].count++
      dateStats[dateKey].gmv += (parseFloat(content.gmv) || 0)
      
      if (date < new Date('2025-06-01')) {
        beforeJune++
      } else {
        afterJune++
      }
    })
    
    console.log(`   - 2025-06-01 이전: ${beforeJune}개`)
    console.log(`   - 2025-06-01 이후: ${afterJune}개`)
    
    // 날짜 범위 확인
    const dates = Object.keys(dateStats).sort()
    if (dates.length > 0) {
      console.log(`   - 첫 게시일: ${dates[0]}`)
      console.log(`   - 마지막 게시일: ${dates[dates.length - 1]}`)
    }
    
    // 3. video_link 기준 중복 제거 (전체 데이터)
    console.log('\n🔄 3. video_link 기준 중복 제거 (전체 데이터):')
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
    
    // 4. GMV 계산 (전체 데이터)
    console.log('\n💰 4. GMV 계산 (전체 데이터):')
    const totalGmv = uniqueContents.reduce((sum, content) => {
      const gmv = parseFloat(content.gmv) || 0
      return sum + gmv
    }, 0)
    
    console.log(`💵 총 GMV: ${totalGmv.toFixed(2)}`)
    
    // 5. 2025-06-01 이후만 필터링해서 계산
    console.log('\n📅 5. 2025-06-01 이후 데이터만 계산:')
    const afterJuneContents = uniqueContents.filter(content => {
      return new Date(content.publish_date) >= new Date('2025-06-01')
    })
    
    const afterJuneGmv = afterJuneContents.reduce((sum, content) => {
      const gmv = parseFloat(content.gmv) || 0
      return sum + gmv
    }, 0)
    
    console.log(`   - 6월 이후 영상 수: ${afterJuneContents.length}개`)
    console.log(`   - 6월 이후 GMV: ${afterJuneGmv.toFixed(2)}`)
    
    // 6. 월별 상세 분포
    console.log('\n📊 6. 월별 상세 분포 (중복 제거 후):')
    const monthlyStats = {}
    uniqueContents.forEach(content => {
      const date = new Date(content.publish_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          count: 0,
          gmv: 0,
          nonZeroGmv: 0,
          nonZeroCount: 0
        }
      }
      
      monthlyStats[monthKey].count++
      const gmv = parseFloat(content.gmv) || 0
      monthlyStats[monthKey].gmv += gmv
      
      if (gmv > 0) {
        monthlyStats[monthKey].nonZeroGmv += gmv
        monthlyStats[monthKey].nonZeroCount++
      }
    })
    
    Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        console.log(`   - ${month}: ${stats.count}개 (GMV>0: ${stats.nonZeroCount}개), GMV ${stats.gmv.toFixed(2)} (GMV>0: ${stats.nonZeroGmv.toFixed(2)})`)
      })
    
    // 7. GMV 0인 데이터 분석
    console.log('\n💸 7. GMV 0인 데이터 분석:')
    const zeroGmv = uniqueContents.filter(c => (parseFloat(c.gmv) || 0) === 0)
    const nonZeroGmv = uniqueContents.filter(c => (parseFloat(c.gmv) || 0) > 0)
    
    console.log(`   - GMV 0인 콘텐츠: ${zeroGmv.length}개`)
    console.log(`   - GMV > 0인 콘텐츠: ${nonZeroGmv.length}개`)
    
    if (nonZeroGmv.length > 0) {
      const nonZeroGmvTotal = nonZeroGmv.reduce((sum, content) => sum + (parseFloat(content.gmv) || 0), 0)
      console.log(`   - GMV > 0인 콘텐츠 총 GMV: ${nonZeroGmvTotal.toFixed(2)}`)
      console.log(`   - 평균 GMV (GMV > 0): ${(nonZeroGmvTotal / nonZeroGmv.length).toFixed(2)}`)
    }
    
    // 8. 최종 요약 및 Raw Data 비교
    console.log('\n' + '='.repeat(80))
    console.log('📋 최종 요약 및 Raw Data 비교:')
    console.log('='.repeat(80))
    console.log(`🎬 전체 영상 수 (중복 제거): ${uniqueContents.length}개`)
    console.log(`🎬 6월 이후 영상 수: ${afterJuneContents.length}개`)
    console.log(`💰 전체 GMV: ${totalGmv.toFixed(2)}`)
    console.log(`💰 6월 이후 GMV: ${afterJuneGmv.toFixed(2)}`)
    console.log('─'.repeat(80))
    console.log(`📊 Raw Data와 비교:`)
    console.log(`   - Raw Data 영상 수: 1911개`)
    console.log(`   - 전체 DB 영상 수: ${uniqueContents.length}개 (차이: ${1911 - uniqueContents.length}개)`)
    console.log(`   - 6월 이후 영상 수: ${afterJuneContents.length}개 (차이: ${1911 - afterJuneContents.length}개)`)
    console.log(`   - Raw Data GMV: 10403.53`)
    console.log(`   - 전체 DB GMV: ${totalGmv.toFixed(2)} (차이: ${(10403.53 - totalGmv).toFixed(2)})`)
    console.log(`   - 6월 이후 GMV: ${afterJuneGmv.toFixed(2)} (차이: ${(10403.53 - afterJuneGmv).toFixed(2)})`)
    console.log('='.repeat(80))
    
    // 9. 가능한 원인 분석
    console.log('\n🔍 데이터 불일치 원인 분석:')
    if (uniqueContents.length < 1911) {
      console.log(`⚠️  DB에 ${1911 - uniqueContents.length}개 영상이 누락되어 있습니다.`)
      console.log('   가능한 원인:')
      console.log('   1. 데이터 업로드 과정에서 일부 파일이 누락됨')
      console.log('   2. 업로드 중 오류로 인한 중단')
      console.log('   3. 중복 제거 과정에서 예상보다 많은 중복 데이터 존재')
      console.log('   4. Raw Data에 포함된 데이터가 실제로는 중복이었음')
    }
    
    if (Math.abs(10403.53 - totalGmv) > 0.01) {
      console.log(`⚠️  GMV가 ${(10403.53 - totalGmv).toFixed(2)} 차이납니다.`)
      console.log('   가능한 원인:')
      console.log('   1. 누락된 영상들이 높은 GMV를 가지고 있었음')
      console.log('   2. 데이터 타입 변환 과정에서 GMV 값 손실')
      console.log('   3. Raw Data와 DB의 GMV 계산 방식 차이')
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

checkAllContentData()

