const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugProductSales() {
  console.log('🔍 Debugging Product Sales Data...\n')
  
  // 1. Check total orders count
  const { count: totalCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 Total orders in database: ${totalCount}`)
  
  // 2. Check orders with price > 0
  const { count: pricedCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gt('sku_unit_original_price', 0)
  
  console.log(`💰 Orders with price > 0: ${pricedCount}`)
  
  // 3. Check delivered orders with price > 0
  const { count: deliveredCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gt('sku_unit_original_price', 0)
    .not('delivered_time', 'is', null)
  
  console.log(`📦 Delivered orders with price > 0: ${deliveredCount}`)
  
  // 4. Get sample of delivered_time formats
  const { data: samples } = await supabase
    .from('orders')
    .select('delivered_time, sku_unit_original_price, product_name')
    .gt('sku_unit_original_price', 0)
    .not('delivered_time', 'is', null)
    .limit(5)
  
  console.log('\n📅 Sample delivered_time formats:')
  samples?.forEach(s => {
    console.log(`  - ${s.delivered_time} | $${s.sku_unit_original_price} | ${s.product_name}`)
  })
  
  // 5. Check date range
  const { data: dateRange } = await supabase
    .from('orders')
    .select('delivered_time')
    .gt('sku_unit_original_price', 0)
    .not('delivered_time', 'is', null)
    .order('delivered_time', { ascending: true })
    .limit(1)
  
  const { data: latestDate } = await supabase
    .from('orders')
    .select('delivered_time')
    .gt('sku_unit_original_price', 0)
    .not('delivered_time', 'is', null)
    .order('delivered_time', { ascending: false })
    .limit(1)
  
  console.log('\n📆 Date range:')
  console.log(`  Earliest: ${dateRange?.[0]?.delivered_time || 'N/A'}`)
  console.log(`  Latest: ${latestDate?.[0]?.delivered_time || 'N/A'}`)
  
  // 6. Test date filtering
  const testQueries = [
    { filter: "07/01/2024", label: "After 07/01/2024" },
    { filter: "01/01/2024", label: "After 01/01/2024" },
    { filter: "01/01/2023", label: "After 01/01/2023" }
  ]
  
  console.log('\n🧪 Testing date filters:')
  for (const test of testQueries) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gt('sku_unit_original_price', 0)
      .not('delivered_time', 'is', null)
      .gte('delivered_time', test.filter)
    
    console.log(`  ${test.label}: ${count} orders`)
  }
}

debugProductSales().catch(console.error)