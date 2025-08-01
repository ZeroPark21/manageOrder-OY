const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSampleCounts() {
  try {
    // 1. 전체 샘플 수 확인
    const { data: allSamples, error: error1 } = await supabase
      .from('orders')
      .select('quantity, created_time')
      .eq('sku_unit_original_price', 0)
    
    if (error1) throw error1
    
    // 2. 월별로 그룹화
    const monthlyData = {}
    let totalQuantity = 0
    
    allSamples.forEach(order => {
      const quantity = parseInt(order.quantity) || 0
      totalQuantity += quantity
      
      if (order.created_time) {
        const date = new Date(order.created_time)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            orders: 0,
            quantity: 0
          }
        }
        
        monthlyData[monthKey].orders += 1
        monthlyData[monthKey].quantity += quantity
      }
    })
    
    console.log('\n=== 샘플 발송 현황 ===')
    console.log(`전체 샘플 주문 건수: ${allSamples.length}건`)
    console.log(`전체 샘플 발송 수량: ${totalQuantity}개`)
    
    console.log('\n=== 월별 샘플 발송 현황 ===')
    Object.entries(monthlyData).sort().forEach(([month, data]) => {
      console.log(`${month}: ${data.orders}건, ${data.quantity}개`)
    })
    
    // 3. 날짜 범위 확인
    const { data: dateRange, error: error2 } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .order('created_time', { ascending: true })
      .limit(1)
    
    const { data: dateRangeEnd, error: error3 } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .order('created_time', { ascending: false })
      .limit(1)
    
    console.log('\n=== 날짜 범위 ===')
    console.log(`첫 샘플 발송일: ${dateRange?.[0]?.created_time || 'N/A'}`)
    console.log(`마지막 샘플 발송일: ${dateRangeEnd?.[0]?.created_time || 'N/A'}`)
    
    // 4. 6월 이전 데이터 확인
    const { data: beforeJune, error: error4 } = await supabase
      .from('orders')
      .select('quantity, created_time')
      .eq('sku_unit_original_price', 0)
      .lt('created_time', '2025-06-01')
    
    if (beforeJune && beforeJune.length > 0) {
      const beforeJuneQuantity = beforeJune.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0)
      console.log(`\n⚠️  6월 이전 샘플 발송: ${beforeJune.length}건, ${beforeJuneQuantity}개`)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkSampleCounts()