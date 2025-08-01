const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSalesData() {
  try {
    // 전체 주문 데이터 가져오기
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_id, sku_unit_original_price, order_status, product_name')
      .order('order_id')
    
    if (error) throw error
    
    console.log(`\n총 주문 수: ${orders.length}건\n`)
    
    // 가격 타입별 분류
    let validSales = 0
    let zeroPrice = 0
    let invalidPrice = 0
    let nullPrice = 0
    
    orders.forEach(order => {
      const price = order.sku_unit_original_price
      
      if (price === null || price === undefined) {
        nullPrice++
        console.log(`NULL 가격 - Order ID: ${order.order_id}, Product: ${order.product_name}`)
      } else if (typeof price === 'number' && !isNaN(price) && price > 0) {
        validSales++
      } else if (price === 0) {
        zeroPrice++
      } else {
        invalidPrice++
        console.log(`유효하지 않은 가격 - Order ID: ${order.order_id}, Price: "${price}", Type: ${typeof price}, Product: ${order.product_name}`)
      }
    })
    
    console.log(`\n=== 가격 분석 결과 ===`)
    console.log(`실제 판매 (가격 > 0): ${validSales}건`)
    console.log(`샘플 (가격 = 0): ${zeroPrice}건`)
    console.log(`NULL 가격: ${nullPrice}건`)
    console.log(`유효하지 않은 가격: ${invalidPrice}건`)
    console.log(`총합: ${validSales + zeroPrice + nullPrice + invalidPrice}건`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkSalesData()