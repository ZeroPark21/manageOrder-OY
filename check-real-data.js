const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkRealData() {
  console.log('🔍 Checking REAL Supabase data...\n')
  
  // 1. 전체 orders 테이블 - 실제 전체 카운트
  const { count: absoluteTotalCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 전체 orders 테이블 총 레코드 수: ${absoluteTotalCount}`)
  
  // 2. 2025년 6월 1일 이후 전체 데이터 - 페이징으로 모두 가져오기
  let allOrders = []
  let offset = 0
  const limit = 1000
  let allCount = 0
  
  while (true) {
    const { data, count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .gte('created_time', '06/01/2025')
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching data:', error)
      break
    }
    
    if (offset === 0) allCount = count  // 첫 번째 쿼리에서만 전체 카운트 저장
    if (!data || data.length === 0) break
    
    allOrders = [...allOrders, ...data]
    if (data.length < limit) break
    offset += limit
  }
  
  console.log(`\n📅 2025년 6월 1일 이후:`)
  console.log(`  - Count API 반환값: ${allCount}`)
  console.log(`  - 실제 가져온 데이터 수: ${allOrders?.length}`)
  
  // 3. 샘플과 판매 분류
  if (allOrders && allOrders.length > 0) {
    const samples = allOrders.filter(o => o.sku_unit_original_price === 0)
    const sales = allOrders.filter(o => o.sku_unit_original_price > 0)
    const nullPrice = allOrders.filter(o => o.sku_unit_original_price === null || o.sku_unit_original_price === undefined)
    
    console.log(`\n📈 데이터 분류:`)
    console.log(`  - 샘플 (price = 0): ${samples.length}건`)
    console.log(`  - 판매 (price > 0): ${sales.length}건`)
    console.log(`  - NULL/undefined price: ${nullPrice.length}건`)
    console.log(`  - 합계: ${samples.length + sales.length + nullPrice.length}건`)
    
    // 샘플 상세
    if (samples.length > 0) {
      const cancelledSamples = samples.filter(o => 
        o.order_status === 'Cancelled' || 
        o.order_status === 'Canceled' ||
        o.cancelled_time !== null
      )
      const sampleQuantity = samples.reduce((sum, o) => sum + (o.quantity || 0), 0)
      const cancelledQuantity = cancelledSamples.reduce((sum, o) => sum + (o.quantity || 0), 0)
      
      console.log(`\n🎁 샘플 상세:`)
      console.log(`  - 총 샘플 주문: ${samples.length}건`)
      console.log(`  - 총 샘플 수량: ${sampleQuantity}개`)
      console.log(`  - 취소된 샘플: ${cancelledSamples.length}건 (${cancelledQuantity}개)`)
      console.log(`  - 실제 발송 샘플: ${samples.length - cancelledSamples.length}건 (${sampleQuantity - cancelledQuantity}개)`)
    }
    
    // 판매 상세
    if (sales.length > 0) {
      const cancelledSales = sales.filter(o => 
        o.order_status === 'Cancelled' || 
        o.order_status === 'Canceled' ||
        o.cancelled_time !== null
      )
      const salesAmount = sales.reduce((sum, o) => sum + (o.order_amount || 0), 0)
      const salesQuantity = sales.reduce((sum, o) => sum + (o.quantity || 0), 0)
      
      console.log(`\n💰 판매 상세:`)
      console.log(`  - 총 판매 주문: ${sales.length}건`)
      console.log(`  - 총 판매 금액: $${salesAmount.toFixed(2)}`)
      console.log(`  - 총 판매 수량: ${salesQuantity}개`)
      console.log(`  - 취소된 판매: ${cancelledSales.length}건`)
    }
  }
  
  // 4. 날짜 범위 확인
  if (allOrders && allOrders.length > 0) {
    const dates = allOrders.map(o => o.created_time).filter(Boolean)
    dates.sort()
    console.log(`\n📅 날짜 범위:`)
    console.log(`  - 첫 주문: ${dates[0]}`)
    console.log(`  - 마지막 주문: ${dates[dates.length - 1]}`)
  }
}

checkRealData().catch(console.error)