const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tphhipquxzuihqxsqipd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaGhpcHF1eHp1aWhxeHNxaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxMTkxNjIsImV4cCI6MjA0MTY5NTE2Mn0.zK2__M6vq8CmPasVYkdRSnLxKp34u_zQ16C-kif5xLs'

const supabase = createClient(supabaseUrl, supabaseKey)

// 날짜 파싱 함수 (API와 동일하게)
function parseDate(dateStr) {
  if (!dateStr) return null
  
  try {
    // MM/DD/YYYY HH:MM:SS AM/PM 형식 (가장 먼저 체크)
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')
      const datePart = parts[0]
      const timePart = parts[1] || "00:00:00"
      const ampm = parts[2] || ""
      
      const [month, day, year] = datePart.split('/')
      
      if (timePart !== "00:00:00") {
        const [hours, minutes, seconds] = timePart.split(':')
        let hour = parseInt(hours)
        if (ampm === 'PM' && hour !== 12) hour += 12
        if (ampm === 'AM' && hour === 12) hour = 0
        
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes) || 0, parseInt(seconds) || 0)
      } else {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
    }
    
    // ISO 형식
    if (dateStr.includes('T')) {
      return new Date(dateStr)
    }
    
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00')
    }
    
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }
    
    return null
  } catch (e) {
    console.error('Date parsing error:', dateStr, e)
    return null
  }
}

async function testMatrixAPIs() {
  try {
    // 1. 먼저 샘플 데이터 조회
    console.log('=== 샘플 데이터 조회 ===')
    const { data: samples, error } = await supabase
      .from('orders')
      .select('created_time, product_name, quantity')
      .eq('sku_unit_original_price', 0)
      .gte('created_time', '2025-06-01T00:00:00')
      .limit(20)
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    console.log(`조회된 샘플 수: ${samples.length}`)
    
    // 2. 날짜 파싱 테스트
    console.log('\n=== 날짜 파싱 테스트 ===')
    const dateFormats = new Set()
    let parseSuccess = 0
    let parseFail = 0
    
    samples.forEach(sample => {
      const date = parseDate(sample.created_time)
      if (date) {
        parseSuccess++
        console.log(`✅ ${sample.created_time} -> ${date.toISOString()}`)
      } else {
        parseFail++
        console.log(`❌ ${sample.created_time} -> 파싱 실패`)
      }
      
      // 날짜 형식 패턴 수집
      if (sample.created_time.includes('/')) {
        dateFormats.add('MM/DD/YYYY')
      } else if (sample.created_time.includes('T')) {
        dateFormats.add('ISO')
      } else {
        dateFormats.add('기타')
      }
    })
    
    console.log(`\n파싱 성공: ${parseSuccess}, 실패: ${parseFail}`)
    console.log('날짜 형식들:', Array.from(dateFormats))
    
    // 3. 주별 데이터 시뮬레이션
    console.log('\n=== 주별 데이터 테스트 ===')
    const weekMap = {}
    
    samples.forEach(sample => {
      const date = parseDate(sample.created_time)
      if (!date) return
      
      // 주의 월요일 계산
      const dayOfWeek = date.getDay()
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(date)
      monday.setDate(date.getDate() + daysToMonday)
      monday.setHours(0, 0, 0, 0)
      
      const weekKey = monday.toISOString().split('T')[0]
      weekMap[weekKey] = (weekMap[weekKey] || 0) + 1
    })
    
    console.log('주별 그룹화 결과:', weekMap)
    
    // 4. 월별 데이터 시뮬레이션
    console.log('\n=== 월별 데이터 테스트 ===')
    const monthMap = {}
    
    samples.forEach(sample => {
      const date = parseDate(sample.created_time)
      if (!date) return
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthMap[monthKey] = (monthMap[monthKey] || 0) + 1
    })
    
    console.log('월별 그룹화 결과:', monthMap)
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testMatrixAPIs()