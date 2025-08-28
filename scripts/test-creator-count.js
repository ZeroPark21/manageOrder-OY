const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCreatorCount() {
  console.log('🧪 Testing Creator Count Accuracy\n')
  console.log('='.repeat(50))
  
  try {
    // 1. Direct database query (with pagination to get ALL data)
    console.log('\n1. Direct Database Query:')
    let allCreators = []
    let from = 0
    const limit = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('contents')
        .select('creator_name')
        .not('creator_name', 'is', null)
        .neq('creator_name', '')
        .range(from, from + limit - 1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        allCreators = [...allCreators, ...data]
        from += limit
        hasMore = data.length === limit
      } else {
        hasMore = false
      }
    }
    
    const uniqueCreatorsDB = new Set(allCreators.map(c => c.creator_name)).size
    console.log(`   ✓ Unique creators in DB: ${uniqueCreatorsDB}`)
    console.log(`   ✓ Total records: ${allCreators.length}`)
    
    // 2. Test content-stats API
    console.log('\n2. Testing /api/content-stats:')
    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/content-stats?startDate=2025-06-01`)
    const statsData = await statsResponse.json()
    
    if (statsData.success) {
      console.log(`   ✓ Unique creators from API: ${statsData.data.uniqueCreators}`)
      console.log(`   ✓ Total contents from API: ${statsData.data.totalContents}`)
      
      if (statsData.data.uniqueCreators === uniqueCreatorsDB) {
        console.log('   ✅ MATCH! API returns correct creator count')
      } else {
        console.log(`   ❌ MISMATCH! Expected ${uniqueCreatorsDB}, got ${statsData.data.uniqueCreators}`)
      }
    } else {
      console.log('   ❌ API request failed:', statsData.error)
    }
    
    // 3. Test contents API
    console.log('\n3. Testing /api/contents:')
    const contentsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/contents?groupBy=creator&startDate=2025-06-01`)
    const contentsData = await contentsResponse.json()
    
    console.log(`   ✓ Unique creators from contents API: ${contentsData.uniqueCreators}`)
    
    if (contentsData.uniqueCreators === uniqueCreatorsDB) {
      console.log('   ✅ MATCH! Contents API returns correct creator count')
    } else {
      console.log(`   ❌ MISMATCH! Expected ${uniqueCreatorsDB}, got ${contentsData.uniqueCreators}`)
    }
    
    // 4. Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 SUMMARY:')
    console.log(`   Expected (DB direct): ${uniqueCreatorsDB} creators`)
    console.log(`   content-stats API: ${statsData.data?.uniqueCreators || 'N/A'} creators`)
    console.log(`   contents API: ${contentsData.uniqueCreators || 'N/A'} creators`)
    
    const allMatch = 
      statsData.data?.uniqueCreators === uniqueCreatorsDB && 
      contentsData.uniqueCreators === uniqueCreatorsDB
    
    if (allMatch) {
      console.log('\n✅ SUCCESS: All APIs return correct creator count!')
    } else {
      console.log('\n⚠️  WARNING: Some APIs return incorrect counts')
    }
    
    // Check for the known correct value
    if (uniqueCreatorsDB === 445) {
      console.log('\n✅ Database count matches expected value (445)')
    } else {
      console.log(`\n⚠️  Database count (${uniqueCreatorsDB}) differs from expected (445)`)
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testCreatorCount()