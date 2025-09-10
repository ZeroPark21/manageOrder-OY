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

async function cleanDuplicateData() {
  try {
    console.log('🧹 중복 데이터 정리 시작...\n')
    
    // 1. 중복 데이터 확인
    console.log('📊 1. 중복 데이터 확인 중...')
    const { data: allContents, error: fetchError } = await supabase
      .from('contents')
      .select('id, video_link, gmv, created_at, updated_at')
      .not('video_link', 'is', null)
      .neq('video_link', '')
      .order('video_link')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ 데이터 조회 오류:', fetchError.message)
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
    
    console.log(`   - 전체 레코드: ${allContents?.length || 0}개`)
    console.log(`   - 유니크 video_link: ${Object.keys(videoLinkGroups).length}개`)
    console.log(`   - 중복이 있는 video_link: ${duplicates.length}개`)
    
    if (duplicates.length === 0) {
      console.log('✅ 중복 데이터가 없습니다.')
      return
    }
    
    // 2. 중복 데이터 분석
    console.log('\n📊 2. 중복 데이터 분석:')
    let totalDuplicates = 0
    let toDelete = []
    
    duplicates.forEach(([videoLink, contents]) => {
      totalDuplicates += contents.length - 1 // 최신 것 제외
      
      // 최신 레코드 (created_at이 가장 최근) 제외하고 삭제 대상에 추가
      const sortedContents = contents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const latestContent = sortedContents[0]
      const oldContents = sortedContents.slice(1)
      
      console.log(`   - ${videoLink}: ${contents.length}개 레코드`)
      console.log(`     최신: ID ${latestContent.id} (GMV: ${latestContent.gmv}, 생성: ${latestContent.created_at})`)
      console.log(`     삭제 대상: ${oldContents.length}개`)
      
      toDelete.push(...oldContents.map(c => c.id))
    })
    
    console.log(`\n   총 삭제 대상: ${toDelete.length}개 레코드`)
    
    // 3. 삭제 실행 (실제로는 주석 처리)
    console.log('\n🗑️ 3. 중복 데이터 삭제:')
    console.log('⚠️  실제 삭제를 원하시면 아래 주석을 해제하세요.')
    
    // 실제 삭제 코드 (주석 처리)
    /*
    if (toDelete.length > 0) {
      console.log(`   ${toDelete.length}개 레코드 삭제 중...`)
      
      // 배치로 삭제 (한 번에 100개씩)
      const BATCH_SIZE = 100
      let deletedCount = 0
      
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE)
        
        const { error } = await supabase
          .from('contents')
          .delete()
          .in('id', batch)
        
        if (error) {
          console.error(`   배치 삭제 실패: ${error.message}`)
        } else {
          deletedCount += batch.length
          console.log(`   삭제 완료: ${deletedCount}/${toDelete.length}`)
        }
      }
      
      console.log(`✅ 총 ${deletedCount}개 중복 레코드 삭제 완료`)
    }
    */
    
    console.log('   (실제 삭제는 주석 처리됨)')
    
    // 4. 정리 후 통계
    console.log('\n📊 4. 정리 후 예상 통계:')
    const expectedUniqueCount = Object.keys(videoLinkGroups).length
    const expectedTotalGmv = duplicates.reduce((sum, [_, contents]) => {
      // 최신 레코드의 GMV만 계산
      const latestContent = contents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      return sum + (parseFloat(latestContent.gmv) || 0)
    }, 0)
    
    console.log(`   - 예상 유니크 레코드 수: ${expectedUniqueCount}개`)
    console.log(`   - 예상 총 GMV: ${expectedTotalGmv.toFixed(2)}`)
    console.log(`   - 삭제될 레코드 수: ${toDelete.length}개`)
    
    // 5. 삭제할 레코드 상세 정보
    console.log('\n📋 5. 삭제 대상 레코드 상세:')
    const deleteDetails = toDelete.slice(0, 10) // 상위 10개만 표시
    
    for (const id of deleteDetails) {
      const content = allContents?.find(c => c.id === id)
      if (content) {
        console.log(`   - ID ${id}: ${content.video_link} (GMV: ${content.gmv}, 생성: ${content.created_at})`)
      }
    }
    
    if (toDelete.length > 10) {
      console.log(`   ... 및 ${toDelete.length - 10}개 더`)
    }
    
    // 6. 실행 명령어
    console.log('\n' + '='.repeat(60))
    console.log('🚀 실행 방법:')
    console.log('='.repeat(60))
    console.log('1. 실제 삭제를 원하시면 스크립트의 주석을 해제하세요.')
    console.log('2. 또는 다음 명령어로 개별 삭제:')
    console.log('')
    console.log('   // 상위 10개 삭제 예시')
    console.log('   const idsToDelete = [' + deleteDetails.slice(0, 5).join(', ') + ']')
    console.log('   await supabase.from("contents").delete().in("id", idsToDelete)')
    console.log('')
    console.log('3. 삭제 후 데이터 검증:')
    console.log('   node scripts/verify-data-after-cleanup.js')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ 중복 데이터 정리 중 오류:', error)
  }
  
  process.exit(0)
}

cleanDuplicateData()


