const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkQuantityIssue() {
  try {
    // gmv-sales-stats API와 동일한 조건으로 조회
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_time', '2025-06-01')
    
    if (error) throw error
    
    // 샘플 주문 필터링 (sku_unit_original_price = 0)
    const sampleOrders = orders.filter(order => order.sku_unit_original_price === 0)
    
    console.log('=== GMV Sales Stats API 조건 확인 ===')
    console.log(`전체 샘플 주문 건수: ${sampleOrders.length}건`)
    console.log(`전체 샘플 수량: ${sampleOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)}개`)
    
    // quantity가 1이 아닌 주문 확인
    const nonOneQuantity = sampleOrders.filter(order => order.quantity !== 1)
    console.log(`\nquantity가 1이 아닌 주문: ${nonOneQuantity.length}건`)
    
    if (nonOneQuantity.length > 0) {
      console.log('\n=== quantity가 1이 아닌 주문 상세 ===')
      nonOneQuantity.forEach(order => {
        console.log(`${order.created_time} - ${order.product_name}: ${order.quantity}개`)
      })
    }
    
    // 월별로 분석
    const monthlyBreakdown = {}
    sampleOrders.forEach(order => {
      const month = order.created_time.substring(0, 7)
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { orders: 0, quantity: 0 }
      }
      monthlyBreakdown[month].orders += 1
      monthlyBreakdown[month].quantity += order.quantity || 0
    })
    
    console.log('\n=== 월별 상세 분석 ===')
    Object.entries(monthlyBreakdown).sort().forEach(([month, data]) => {
      console.log(`${month}: 주문 ${data.orders}건, 수량 ${data.quantity}개`)
    })
    
    // daily-matrix API와 동일한 조건으로 7월 데이터만 다시 확인
    const { data: julyOrders, error: error2 } = await supabase
      .from('orders')
      .select('id, product_name, quantity, created_time')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-07-01')
      .lte('created_time', '2025-07-31')
    
    if (error2) throw error2
    
    const julyQuantity = julyOrders.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0)
    console.log(`\n=== Daily Matrix API 조건 (7월만) ===`)
    console.log(`7월 주문 건수: ${julyOrders.length}건`)
    console.log(`7월 수량: ${julyQuantity}개`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkQuantityIssue()