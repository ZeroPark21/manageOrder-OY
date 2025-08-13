const { createClient } = require('@supabase/supabase-js')

// 환경 변수 직접 설정
const supabaseUrl = 'https://cekqainvjrliiqynixnw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla3FhaW52anJsaWlxeW5peG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA2NjMzMiwiZXhwIjoyMDY4NjQyMzMyfQ.ZF7sDI_ddq5n5IP4uRjcfrHQwQe4G4FQidHpVJItI4s'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSampleData() {
  try {
    console.log('🔍 Checking sample data in database...')
    
    // 1. 전체 orders 개수 확인
    const { count: totalCount, error: totalError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) {
      console.error('❌ Error counting total orders:', totalError.message)
      return
    }
    
    console.log(`📊 Total orders in database: ${totalCount || 0}`)
    
    // 2. sku_unit_original_price가 0인 샘플 개수 확인
    const { count: sampleCount, error: sampleError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('sku_unit_original_price', 0)
    
    if (sampleError) {
      console.error('❌ Error counting sample orders:', sampleError.message)
      return
    }
    
    console.log(`📦 Sample orders (price = 0): ${sampleCount || 0}`)
    
    // 3. 2025년 6월 1일 이후 샘플 개수 확인
    const { count: recentSampleCount, error: recentError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-06-01')
    
    if (recentError) {
      console.error('❌ Error counting recent samples:', recentError.message)
      return
    }
    
    console.log(`📅 Sample orders after 2025-06-01: ${recentSampleCount || 0}`)
    
    // 4. 샘플 데이터 몇 개 가져와서 확인
    const { data: samples, error: samplesError } = await supabase
      .from('orders')
      .select('id, product_name, sku_unit_original_price, created_time, quantity')
      .eq('sku_unit_original_price', 0)
      .order('created_time', { ascending: false })
      .limit(5)
    
    if (samplesError) {
      console.error('❌ Error fetching samples:', samplesError.message)
      return
    }
    
    if (samples && samples.length > 0) {
      console.log('\n📋 Recent sample orders:')
      samples.forEach((sample, index) => {
        console.log(`${index + 1}. Product: ${sample.product_name}`)
        console.log(`   Created: ${sample.created_time}`)
        console.log(`   Quantity: ${sample.quantity}`)
        console.log(`   Price: ${sample.sku_unit_original_price}`)
        console.log('---')
      })
    }
    
    // 5. 날짜 범위 확인
    const { data: dateRange, error: dateError } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .order('created_time', { ascending: true })
      .limit(1)
    
    const { data: latestDate, error: latestError } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .order('created_time', { ascending: false })
      .limit(1)
    
    if (!dateError && dateRange && dateRange.length > 0 && !latestError && latestDate && latestDate.length > 0) {
      console.log(`\n📅 Sample data date range:`)
      console.log(`   Earliest: ${dateRange[0].created_time}`)
      console.log(`   Latest: ${latestDate[0].created_time}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
  
  process.exit(0)
}

checkSampleData()