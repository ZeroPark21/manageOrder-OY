const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUniqueCreators() {
  console.log('Checking unique creators in contents table...\n')
  
  try {
    // Get all creator names
    const { data: creators, error: fetchError } = await supabase
      .from('contents')
      .select('creator_name')
      .not('creator_name', 'is', null)
      .neq('creator_name', '')
    
    if (fetchError) {
      console.error('Error fetching creators:', fetchError)
      return
    }
    
    // Count unique creators
    const uniqueCreators = new Set(creators.map(c => c.creator_name))
    
    console.log(`Total records with creator_name: ${creators.length}`)
    console.log(`Unique creators: ${uniqueCreators.size}`)
    console.log('\nTop 10 creators by content count:')
    
    // Count content per creator
    const creatorCounts = {}
    creators.forEach(c => {
      creatorCounts[c.creator_name] = (creatorCounts[c.creator_name] || 0) + 1
    })
    
    // Sort by count and show top 10
    const sortedCreators = Object.entries(creatorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    sortedCreators.forEach(([name, count], index) => {
      console.log(`${index + 1}. ${name}: ${count} contents`)
    })
    
    // Also check if there are any variations in creator names (case sensitivity, spaces)
    console.log('\nChecking for potential duplicates (case/space variations)...')
    const normalizedCreators = new Set(
      creators.map(c => c.creator_name.toLowerCase().trim())
    )
    
    if (normalizedCreators.size < uniqueCreators.size) {
      console.log(`Found ${uniqueCreators.size - normalizedCreators.size} potential duplicates due to case/space differences`)
      
      // Find the duplicates
      const creatorMap = {}
      creators.forEach(c => {
        const normalized = c.creator_name.toLowerCase().trim()
        if (!creatorMap[normalized]) {
          creatorMap[normalized] = []
        }
        if (!creatorMap[normalized].includes(c.creator_name)) {
          creatorMap[normalized].push(c.creator_name)
        }
      })
      
      console.log('\nVariations found:')
      Object.entries(creatorMap)
        .filter(([_, variations]) => variations.length > 1)
        .slice(0, 10)
        .forEach(([normalized, variations]) => {
          console.log(`- "${variations.join('", "')}`)
        })
    } else {
      console.log('No case/space variations found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkUniqueCreators()