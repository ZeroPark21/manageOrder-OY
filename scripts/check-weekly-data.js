const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function parseDeliveredTime(dateStr) {
  if (!dateStr) return null
  
  const datePart = dateStr.split(' ')[0]
  const parts = datePart.split('/')
  
  if (parts.length !== 3) return null
  
  const month = parseInt(parts[0], 10)
  const day = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null
  
  return new Date(year, month - 1, day)
}

async function checkWeeklyData() {
  console.log('📊 Checking Weekly Sample Delivery Data\n')
  console.log('='.repeat(60))
  
  try {
    // Get SAMPLE orders (sku_unit_original_price = 0)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('delivered_time, quantity, sku_unit_original_price, product_name')
      .eq('sku_unit_original_price', 0)  // SAMPLES ONLY
      .not('delivered_time', 'is', null)
      .order('delivered_time', { ascending: false })
      .limit(2000)
    
    if (error) throw error
    
    // Parse dates and group by week
    const weeklyData = {}
    let latestDate = null
    let earliestDate = null
    
    orders.forEach(order => {
      const date = parseDeliveredTime(order.delivered_time)
      if (!date) return
      
      // Track latest and earliest dates
      if (!latestDate || date > latestDate) latestDate = date
      if (!earliestDate || date < earliestDate) earliestDate = date
      
      // Calculate week start (Sunday)
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const weekKey = startOfWeek.toISOString().split('T')[0]
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          startDate: weekKey,
          endDate: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: 0,
          quantity: 0,
          revenue: 0
        }
      }
      
      weeklyData[weekKey].count++
      weeklyData[weekKey].quantity += order.quantity || 0
      weeklyData[weekKey].revenue += (order.quantity || 0) * (order.sku_unit_original_price || 0)
    })
    
    // Sort weeks and display
    const sortedWeeks = Object.keys(weeklyData).sort().reverse()
    
    console.log('\n📅 Data Range:')
    console.log(`   Earliest: ${earliestDate ? earliestDate.toLocaleDateString() : 'N/A'}`)
    console.log(`   Latest: ${latestDate ? latestDate.toLocaleDateString() : 'N/A'}`)
    
    console.log('\n📊 Weekly Summary (Recent 10 weeks):')
    console.log('Week Start    | Week End      | Orders | Quantity | Revenue')
    console.log('-'.repeat(60))
    
    sortedWeeks.slice(0, 10).forEach(weekKey => {
      const week = weeklyData[weekKey]
      console.log(
        `${week.startDate} | ${week.endDate} | ${String(week.count).padStart(6)} | ${String(week.quantity).padStart(8)} | ₩${week.revenue.toLocaleString()}`
      )
    })
    
    // Check for missing recent weeks
    console.log('\n⚠️  Checking for Missing Recent Data:')
    const today = new Date()
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const recentWeeks = sortedWeeks.filter(weekKey => {
      const weekDate = new Date(weekKey)
      return weekDate >= twoWeeksAgo
    })
    
    if (recentWeeks.length === 0) {
      console.log('   ❌ NO DATA for the last 2 weeks!')
      console.log(`   Last data week: ${sortedWeeks[0]}`)
    } else {
      console.log(`   ✅ Found ${recentWeeks.length} weeks of recent data`)
    }
    
    // Test the API endpoint
    console.log('\n🔍 Testing API Endpoint:')
    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/product-sales/all-matrix?groupBy=weekly`
    
    try {
      const response = await fetch(apiUrl)
      const apiData = await response.json()
      
      if (apiData.weeks) {
        console.log(`   API returned ${apiData.weeks.length} weeks`)
        console.log(`   Latest week from API: ${apiData.weeks[apiData.weeks.length - 1]}`)
        
        // Compare with database
        if (apiData.weeks[apiData.weeks.length - 1] !== sortedWeeks[0]) {
          console.log(`   ⚠️  API latest week (${apiData.weeks[apiData.weeks.length - 1]}) doesn't match DB latest (${sortedWeeks[0]})`)
        } else {
          console.log('   ✅ API data matches database')
        }
      } else {
        console.log('   ❌ API returned no weekly data')
      }
    } catch (apiError) {
      console.log('   ❌ API request failed:', apiError.message)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkWeeklyData()