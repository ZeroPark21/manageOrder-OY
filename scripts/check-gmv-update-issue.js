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

async function checkGmvUpdateIssue() {
  try {
    console.log('🔍 GMV 업데이트 문제 확인...\n')
    
    // 1. GMV 0인 데이터 중에서 다른 데이터가 있는 것들 확인
    console.log('📊 1. GMV 0인 데이터 분석:')
    const { data: zeroGmvData, error: zeroError } = await supabase
      .from('contents')
      .select('*')
      .eq('gmv', 0)
      .limit(100)
    
    if (zeroError) {
      console.error('❌ GMV 0 데이터 조회 오류:', zeroError.message)
      return
    }
    
    console.log(`   - GMV 0인 데이터: ${zeroGmvData?.length || 0}개 (샘플 100개)`)
    
    if (zeroGmvData && zeroGmvData.length > 0) {
      // GMV 0이지만 다른 데이터가 있는 것들
      const hasOtherData = zeroGmvData.filter(c => 
        (parseInt(c.like_count) || 0) > 0 || 
        (parseInt(c.comment_count) || 0) > 0 ||
        (parseInt(c.shoppable_impressions) || 0) > 0 ||
        (parseInt(c.affiliate_orders) || 0) > 0
      )
      
      console.log(`   - GMV 0이지만 다른 데이터가 있는 것: ${hasOtherData.length}개`)
      
      if (hasOtherData.length > 0) {
        console.log('\n   샘플 데이터:')
        hasOtherData.slice(0, 5).forEach((content, index) => {
          console.log(`   ${index + 1}. ${content.content_title?.substring(0, 50)}...`)
          console.log(`      GMV: ${content.gmv}, 좋아요: ${content.like_count}, 댓글: ${content.comment_count}`)
          console.log(`      노출: ${content.shoppable_impressions}, 주문: ${content.affiliate_orders}`)
          console.log(`      업로드일: ${content.created_at}`)
        })
      }
    }
    
    // 2. 같은 video_link를 가진 중복 데이터 확인
    console.log('\n📊 2. 중복 데이터 확인:')
    const { data: allContents, error: allError } = await supabase
      .from('contents')
      .select('video_link, gmv, created_at, updated_at')
      .not('video_link', 'is', null)
      .neq('video_link', '')
      .order('video_link')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ 전체 데이터 조회 오류:', allError.message)
      return
    }
    
    // video_link별로 그룹화
    const videoLinkGroups = {}
    allContents?.forEach(content => {
      if (!videoLinkGroups[content.video_link]) {
        videoLinkGroups[content.video_link] = []
      }
      videoLinkGroups[content.video_link].push(content)
    })
    
    // 중복이 있는 video_link들 찾기
    const duplicates = Object.entries(videoLinkGroups)
      .filter(([_, contents]) => contents.length > 1)
      .slice(0, 10) // 상위 10개만 확인
    
    console.log(`   - 중복이 있는 video_link: ${duplicates.length}개 (샘플 10개)`)
    
    if (duplicates.length > 0) {
      console.log('\n   중복 데이터 샘플:')
      duplicates.forEach(([videoLink, contents], index) => {
        console.log(`   ${index + 1}. ${videoLink}`)
        contents.forEach((content, i) => {
          console.log(`      ${i + 1}. GMV: ${content.gmv}, 생성: ${content.created_at}, 수정: ${content.updated_at}`)
        })
        console.log('   ---')
      })
    }
    
    // 3. 최근 업데이트된 데이터 확인
    console.log('\n📊 3. 최근 업데이트된 데이터 확인:')
    const { data: recentUpdates, error: recentError } = await supabase
      .from('contents')
      .select('video_link, gmv, created_at, updated_at, content_title')
      .not('gmv', 'eq', 0)
      .order('updated_at', { ascending: false })
      .limit(20)
    
    if (recentError) {
      console.error('❌ 최근 업데이트 데이터 조회 오류:', recentError.message)
      return
    }
    
    console.log(`   - GMV > 0인 최근 데이터: ${recentUpdates?.length || 0}개`)
    
    if (recentUpdates && recentUpdates.length > 0) {
      console.log('\n   최근 GMV > 0 데이터 샘플:')
      recentUpdates.slice(0, 5).forEach((content, index) => {
        console.log(`   ${index + 1}. ${content.content_title?.substring(0, 50)}...`)
        console.log(`      GMV: ${content.gmv}, 생성: ${content.created_at}, 수정: ${content.updated_at}`)
      })
    }
    
    // 4. GMV 분포 분석
    console.log('\n📊 4. GMV 분포 분석:')
    const { data: gmvStats, error: gmvError } = await supabase
      .from('contents')
      .select('gmv')
    
    if (gmvError) {
      console.error('❌ GMV 통계 조회 오류:', gmvError.message)
      return
    }
    
    if (gmvStats) {
      const gmvValues = gmvStats.map(c => parseFloat(c.gmv) || 0)
      const zeroCount = gmvValues.filter(gmv => gmv === 0).length
      const nonZeroCount = gmvValues.filter(gmv => gmv > 0).length
      const totalGmv = gmvValues.reduce((sum, gmv) => sum + gmv, 0)
      
      console.log(`   - 전체 레코드: ${gmvValues.length}개`)
      console.log(`   - GMV 0: ${zeroCount}개 (${(zeroCount / gmvValues.length * 100).toFixed(1)}%)`)
      console.log(`   - GMV > 0: ${nonZeroCount}개 (${(nonZeroCount / gmvValues.length * 100).toFixed(1)}%)`)
      console.log(`   - 총 GMV: ${totalGmv.toFixed(2)}`)
      
      if (nonZeroCount > 0) {
        const nonZeroGmv = gmvValues.filter(gmv => gmv > 0)
        const avgGmv = nonZeroGmv.reduce((sum, gmv) => sum + gmv, 0) / nonZeroGmv.length
        console.log(`   - 평균 GMV (GMV > 0): ${avgGmv.toFixed(2)}`)
      }
    }
    
    // 5. 결론
    console.log('\n' + '='.repeat(60))
    console.log('📋 GMV 업데이트 문제 분석 결과:')
    console.log('='.repeat(60))
    
    if (duplicates.length > 0) {
      console.log('⚠️  중복 데이터가 발견되었습니다.')
      console.log('   - 같은 video_link에 여러 레코드가 있음')
      console.log('   - 업데이트 시 기존 데이터가 완전히 교체되지 않을 수 있음')
    }
    
    if (zeroGmvData && zeroGmvData.length > 0) {
      const hasOtherDataCount = zeroGmvData.filter(c => 
        (parseInt(c.like_count) || 0) > 0 || 
        (parseInt(c.comment_count) || 0) > 0 ||
        (parseInt(c.shoppable_impressions) || 0) > 0
      ).length
      
      if (hasOtherDataCount > 0) {
        console.log('⚠️  GMV 0이지만 다른 데이터가 있는 레코드가 많습니다.')
        console.log('   - 업로드 시 GMV 값이 제대로 업데이트되지 않을 수 있음')
        console.log('   - 또는 원본 데이터에서 GMV가 실제로 0일 수 있음')
      }
    }
    
    console.log('\n💡 권장 사항:')
    console.log('   1. 업로드 시 GMV 값이 제대로 업데이트되는지 로그 확인')
    console.log('   2. 중복 데이터 정리 (같은 video_link의 오래된 레코드 삭제)')
    console.log('   3. Raw Data와 DB의 GMV 값 직접 비교')
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error)
  }
  
  process.exit(0)
}

checkGmvUpdateIssue()
