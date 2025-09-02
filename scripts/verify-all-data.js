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

async function verifyAllData() {
  try {
    console.log('🔍 전체 데이터 검증...\n')
    
    // 1. 전체 레코드 수 확인
    console.log('📊 1. 전체 레코드 수 확인:')
    const { count: totalCount, error: countError } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ 카운트 오류:', countError.message)
      return
    }
    
    console.log(`   - 전체 레코드 수: ${totalCount || 0}개`)
    
    // 2. 실제 데이터 조회
    console.log('\n📊 2. 실제 데이터 조회:')
    const { data: allContents, error: fetchError } = await supabase
      .from('contents')
      .select('*')
    
    if (fetchError) {
      console.error('❌ 데이터 조회 오류:', fetchError.message)
      return
    }
    
    console.log(`   - 실제 조회된 레코드 수: ${allContents?.length || 0}개`)
    
    if (!allContents || allContents.length === 0) {
      console.log('⚠️  데이터가 없습니다.')
      return
    }
    
    // 3. video_link 기준 중복 제거
    console.log('\n🔄 3. video_link 기준 중복 제거:')
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
    
    // 6. 가능한 시나리오 분석
    console.log('\n🔍 가능한 시나리오 분석:')
    
    if (uniqueContents.length === 1911) {
      console.log('✅ 영상 수가 일치합니다!')
      if (Math.abs(10403.53 - totalGmv) < 0.01) {
        console.log('✅ GMV도 일치합니다!')
      } else {
        console.log(`⚠️  GMV가 ${(10403.53 - totalGmv).toFixed(2)} 차이납니다.`)
        console.log('   가능한 원인:')
        console.log('   1. GMV 값의 데이터 타입 변환 문제')
        console.log('   2. Raw Data와 DB의 GMV 계산 방식 차이')
        console.log('   3. 일부 GMV 값이 0으로 저장됨')
      }
    } else if (uniqueContents.length < 1911) {
      console.log(`⚠️  ${1911 - uniqueContents.length}개 영상이 부족합니다.`)
      console.log('   가능한 원인:')
      console.log('   1. 일부 데이터가 아직 업로드되지 않음')
      console.log('   2. 중복 제거 과정에서 예상보다 많은 중복 데이터 존재')
      console.log('   3. Raw Data에 포함된 데이터가 실제로는 중복이었음')
    } else {
      console.log(`⚠️  ${uniqueContents.length - 1911}개 영상이 더 많습니다.`)
      console.log('   가능한 원인:')
      console.log('   1. Raw Data 이후에 추가 데이터가 업로드됨')
      console.log('   2. Raw Data 계산 시 중복 제거가 되지 않았음')
    }
    
    // 7. GMV 0인 데이터 분석
    console.log('\n💸 5. GMV 0인 데이터 분석:')
    const zeroGmv = uniqueContents.filter(c => (parseFloat(c.gmv) || 0) === 0)
    const nonZeroGmv = uniqueContents.filter(c => (parseFloat(c.gmv) || 0) > 0)
    
    console.log(`   - GMV 0인 콘텐츠: ${zeroGmv.length}개`)
    console.log(`   - GMV > 0인 콘텐츠: ${nonZeroGmv.length}개`)
    
    if (nonZeroGmv.length > 0) {
      const nonZeroGmvTotal = nonZeroGmv.reduce((sum, content) => sum + (parseFloat(content.gmv) || 0), 0)
      console.log(`   - GMV > 0인 콘텐츠 총 GMV: ${nonZeroGmvTotal.toFixed(2)}`)
      console.log(`   - 평균 GMV (GMV > 0): ${(nonZeroGmvTotal / nonZeroGmv.length).toFixed(2)}`)
    }
    
    // 8. 날짜 범위 확인
    console.log('\n📅 6. 날짜 범위 확인:')
    const dates = uniqueContents.map(c => new Date(c.publish_date)).sort((a, b) => a - b)
    if (dates.length > 0) {
      console.log(`   - 첫 게시일: ${dates[0].toISOString().split('T')[0]}`)
      console.log(`   - 마지막 게시일: ${dates[dates.length - 1].toISOString().split('T')[0]}`)
    }
    
    // 9. 최종 결론
    console.log('\n' + '='.repeat(60))
    console.log('📋 최종 결론:')
    console.log('='.repeat(60))
    
    if (uniqueContents.length === 1911 && Math.abs(10403.53 - totalGmv) < 0.01) {
      console.log('✅ 모든 데이터가 정확합니다!')
      console.log('   - 영상 수: 1911개 ✓')
      console.log('   - GMV 총합: 10403.53 ✓')
    } else {
      console.log('⚠️  데이터 불일치가 있습니다.')
      console.log(`   - 영상 수: ${uniqueContents.length}개 (목표: 1911개)`)
      console.log(`   - GMV 총합: ${totalGmv.toFixed(2)} (목표: 10403.53)`)
      
      if (uniqueContents.length < 1911) {
        console.log('\n💡 해결 방안:')
        console.log('   1. 누락된 데이터를 추가로 업로드')
        console.log('   2. 또는 현재 데이터를 기준으로 정확한 수치 표시')
      }
    }
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

verifyAllData()
