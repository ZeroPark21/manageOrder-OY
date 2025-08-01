const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkJulyDetail() {
  try {
    // 7월 전체 데이터 확인
    const { data: julyData, error: error1 } = await supabase
      .from('orders')
      .select('created_time, quantity, product_name')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-07-01')
      .lte('created_time', '2025-07-31')
    
    if (error1) throw error1
    
    // 일별로 그룹화
    const dailyCounts = {}
    let totalQuantity = 0
    
    julyData.forEach(order => {
      const date = order.created_time.split('T')[0]
      if (!dailyCounts[date]) {
        dailyCounts[date] = 0
      }
      dailyCounts[date] += parseInt(order.quantity) || 0
      totalQuantity += parseInt(order.quantity) || 0
    })
    
    console.log('=== 7월 일별 샘플 수량 ===')
    const sortedDates = Object.keys(dailyCounts).sort()
    sortedDates.forEach(date => {
      console.log(`${date}: ${dailyCounts[date]}개`)
    })
    
    console.log(`\n7월 총 샘플 수량: ${totalQuantity}개`)
    console.log(`7월 총 주문 건수: ${julyData.length}건`)
    
    // 일별 매트릭스 API와 동일한 조건으로 조회
    console.log('\n=== 일별 매트릭스 API 조건으로 확인 ===')
    const { data: matrixData, error: error2 } = await supabase
      .from('orders')
      .select('id, product_name, seller_sku, sku_id, quantity, created_time')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-07-01')
      .lte('created_time', '2025-07-31')
      .order('created_time', { ascending: true })
    
    if (error2) throw error2
    
    const matrixTotal = matrixData.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0)
    console.log(`매트릭스 조건 총 수량: ${matrixTotal}개`)
    console.log(`매트릭스 조건 총 건수: ${matrixData.length}건`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkJulyDetail()