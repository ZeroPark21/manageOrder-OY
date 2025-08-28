const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function countAllCreators() {
  console.log('Fetching ALL creators from contents table...\n')
  
  try {
    // 모든 creator_name을 가져오기 (페이지네이션 처리)
    let allCreators = []
    let from = 0
    const limit = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error, count } = await supabase
        .from('contents')
        .select('creator_name', { count: 'exact' })
        .not('creator_name', 'is', null)
        .neq('creator_name', '')
        .range(from, from + limit - 1)
      
      if (error) {
        console.error('Error fetching batch:', error)
        break
      }
      
      if (data && data.length > 0) {
        allCreators = [...allCreators, ...data]
        console.log(`Fetched batch: ${from} to ${from + data.length} (Total so far: ${allCreators.length})`)
        from += limit
        hasMore = data.length === limit
      } else {
        hasMore = false
      }
    }
    
    // 유니크한 크리에이터 계산
    const uniqueCreatorNames = new Set(allCreators.map(c => c.creator_name))
    
    console.log('\n=== FINAL RESULTS ===')
    console.log(`Total records with creator_name: ${allCreators.length}`)
    console.log(`UNIQUE CREATORS: ${uniqueCreatorNames.size}`)
    
    // 전체 레코드 수도 확인
    const { count: totalCount } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Total records in contents table: ${totalCount}`)
    
    // 크리에이터별 콘텐츠 수 계산
    const creatorCounts = {}
    allCreators.forEach(c => {
      creatorCounts[c.creator_name] = (creatorCounts[c.creator_name] || 0) + 1
    })
    
    // 상위 20명 표시
    console.log('\nTop 20 creators by content count:')
    const sortedCreators = Object.entries(creatorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
    
    sortedCreators.forEach(([name, count], index) => {
      console.log(`${index + 1}. ${name}: ${count} contents`)
    })
    
    // 크리에이터 리스트 샘플 (처음 10명과 마지막 10명)
    const creatorList = Array.from(uniqueCreatorNames).sort()
    console.log('\nFirst 10 creators (alphabetically):')
    creatorList.slice(0, 10).forEach(name => console.log(`- ${name}`))
    
    console.log('\nLast 10 creators (alphabetically):')
    creatorList.slice(-10).forEach(name => console.log(`- ${name}`))
    
  } catch (error) {
    console.error('Error:', error)
  }
}

countAllCreators()