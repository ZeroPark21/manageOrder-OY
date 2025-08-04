const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSampleQuery() {
  try {
    console.log('=== 테스트 1: sku_unit_original_price 필드 확인 ===')
    const { data: sample1, error: error1 } = await supabase
      .from('orders')
      .select('id, product_name, sku_unit_original_price, quantity, created_time')
      .limit(5)
    
    if (error1) {
      console.error('Error 1:', error1)
    } else {
      console.log('Sample records:', sample1)
    }
    
    console.log('\n=== 테스트 2: 샘플 데이터 (price = 0) 조회 ===')
    const { data: sample2, error: error2 } = await supabase
      .from('orders')
      .select('*')
      .eq('sku_unit_original_price', 0)
      .limit(5)
    
    if (error2) {
      console.error('Error 2:', error2)
    } else {
      console.log('샘플 데이터 개수:', sample2?.length || 0)
      if (sample2 && sample2.length > 0) {
        console.log('첫 번째 샘플:', sample2[0])
      }
    }
    
    console.log('\n=== 테스트 3: 7월 데이터 직접 조회 ===')
    const { data: julyData, error: error3 } = await supabase
      .from('orders')
      .select('id, product_name, quantity, created_time, sku_unit_original_price')
      .gte('created_time', '2025-07-01')
      .lt('created_time', '2025-08-01')
      .eq('sku_unit_original_price', 0)
      .limit(10)
    
    if (error3) {
      console.error('Error 3:', error3)
    } else {
      console.log('7월 샘플 데이터 개수:', julyData?.length || 0)
      if (julyData && julyData.length > 0) {
        console.log('7월 샘플 예시:', julyData.slice(0, 2))
      }
    }
    
    console.log('\n=== 테스트 4: sku_unit_original_price 분포 확인 ===')
    const { data: priceData, error: error4 } = await supabase
      .from('orders')
      .select('sku_unit_original_price')
      .limit(100)
    
    if (!error4 && priceData) {
      const priceDistribution = {}
      priceData.forEach(item => {
        const price = item.sku_unit_original_price
        if (price === 0) {
          priceDistribution['0'] = (priceDistribution['0'] || 0) + 1
        } else if (price > 0) {
          priceDistribution['positive'] = (priceDistribution['positive'] || 0) + 1
        } else {
          priceDistribution['other'] = (priceDistribution['other'] || 0) + 1
        }
      })
      console.log('Price distribution:', priceDistribution)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testSampleQuery()