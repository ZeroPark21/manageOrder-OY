const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDateIssue() {
  try {
    // 7월 31일 23:59:59까지의 정확한 범위로 조회
    const { data: july31Data, error: error1 } = await supabase
      .from('orders')
      .select('created_time, product_name, quantity')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-07-31T00:00:00')
      .lt('created_time', '2025-08-01T00:00:00')
    
    if (error1) throw error1
    
    console.log('=== 7월 31일 샘플 주문 ===')
    console.log(`총 ${july31Data.length}건`)
    july31Data.forEach(order => {
      console.log(`${order.created_time} - ${order.product_name}`)
    })
    
    // 8월 1일 이후 데이터 확인
    const { data: augustData, error: error2 } = await supabase
      .from('orders')
      .select('created_time, product_name, quantity')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-08-01T00:00:00')
    
    if (error2) throw error2
    
    console.log(`\n=== 8월 1일 이후 샘플 주문 ===`)
    console.log(`총 ${augustData.length}건`)
    if (augustData.length > 0) {
      augustData.forEach(order => {
        console.log(`${order.created_time} - ${order.product_name}`)
      })
    }
    
    // gmv-sales-stats가 사용하는 조건 재현
    const { data: allFromJune, error: error3 } = await supabase
      .from('orders')
      .select('*')
      .gte('created_time', '2025-06-01')
    
    const julyOrders = allFromJune.filter(order => 
      order.sku_unit_original_price === 0 && 
      order.created_time >= '2025-07-01' && 
      order.created_time < '2025-08-01'
    )
    
    console.log(`\n=== GMV Stats API 방식으로 7월 필터링 ===`)
    console.log(`7월 샘플 주문: ${julyOrders.length}건`)
    console.log(`7월 샘플 수량: ${julyOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)}개`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkDateIssue()