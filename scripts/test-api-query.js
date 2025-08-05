const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueries() {
  try {
    // 1. 기본 조회 - 샘플만
    console.log('=== 테스트 1: 샘플 데이터 기본 조회 ===')
    const { data: test1, error: error1 } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .limit(5)
    
    console.log(`샘플 개수: ${test1?.length || 0}`)
    if (test1?.length > 0) {
      console.log('샘플 created_time:', test1.map(d => d.created_time))
    }
    
    // 2. gte 조건 없이 전체 샘플
    console.log('\n=== 테스트 2: gte 조건 없이 ===')
    const { data: test2, error: error2 } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .order('created_time', { ascending: true })
      .limit(10)
    
    console.log(`샘플 개수: ${test2?.length || 0}`)
    if (test2?.length > 0) {
      console.log('최초 날짜:', test2[0].created_time)
      console.log('날짜 형식 샘플:', test2.slice(0, 3).map(d => d.created_time))
    }
    
    // 3. 문자열 비교로 테스트
    console.log('\n=== 테스트 3: 문자열 비교 ===')
    const { data: test3, error: error3 } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-06-01')
      .limit(10)
    
    console.log(`샘플 개수: ${test3?.length || 0}`)
    
    // 4. 날짜 형식별 카운트
    console.log('\n=== 테스트 4: 날짜 형식 분석 ===')
    const { data: allSamples, error: error4 } = await supabase
      .from('orders')
      .select('created_time')
      .eq('sku_unit_original_price', 0)
      .limit(100)
    
    if (allSamples) {
      const formats = {
        'MM/DD/YYYY': 0,
        'ISO': 0,
        'Other': 0
      }
      
      allSamples.forEach(s => {
        if (s.created_time.includes('/')) {
          formats['MM/DD/YYYY']++
        } else if (s.created_time.includes('T') || s.created_time.match(/^\d{4}-\d{2}-\d{2}/)) {
          formats['ISO']++
        } else {
          formats['Other']++
        }
      })
      
      console.log('날짜 형식 분포:', formats)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testQueries()