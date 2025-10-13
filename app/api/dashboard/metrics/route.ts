import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const platform = searchParams.get('platform') || 'all'

    if (!companyId || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'companyId, dateFrom, dateTo are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 이전 기간 계산 (같은 기간만큼)
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    const prevFrom = new Date(from)
    prevFrom.setDate(prevFrom.getDate() - diffDays)
    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)

    // 1. 현재 기간 TikTok 데이터 (매출 데이터만 - order_amount > 0)
    const { data: allTiktokOrders, error: tiktokError } = await supabase
      .from('orders')
      .select('created_time, order_amount, quantity, seller_sku, product_name')
      .eq('company_id', parseInt(companyId))
      .gt('order_amount', 0)

    // 날짜 파싱 함수 (MM/DD/YYYY 형식 처리)
    const parseOrderDate = (dateStr: string): Date | null => {
      if (!dateStr) return null

      // MM/DD/YYYY HH:MM:SS AM/PM 형식 파싱
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (match) {
        const [, month, day, year] = match
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
      }

      // ISO 형식도 시도
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    }

    // 현재 기간 필터링
    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)

    const tiktokCurrent = (allTiktokOrders || []).filter(order => {
      const orderDate = parseOrderDate(order.created_time)
      if (!orderDate) return false
      return orderDate >= fromDate && orderDate <= toDate
    })

    // 2. 이전 기간 TikTok 데이터
    const tiktokPrevious = (allTiktokOrders || []).filter(order => {
      const orderDate = parseOrderDate(order.created_time)
      if (!orderDate) return false
      return orderDate >= prevFrom && orderDate <= prevTo
    })

    // 3. 현재 기간 Amazon 데이터 (새 테이블 사용)
    const { data: amazonCurrent, error: amazonError } = await supabase
      .from('amazon_business_reports')
      .select('*')
      .eq('company_id', parseInt(companyId))
      .gte('report_date', dateFrom)
      .lte('report_date', dateTo)

    // 4. 이전 기간 Amazon 데이터
    const { data: amazonPrevious } = await supabase
      .from('amazon_business_reports')
      .select('*')
      .eq('company_id', parseInt(companyId))
      .gte('report_date', prevFrom.toISOString().split('T')[0])
      .lte('report_date', prevTo.toISOString().split('T')[0])

    // === 현재 기간 집계 ===
    const tiktokCurrentRevenue = platform === 'amazon' ? 0 : (tiktokCurrent || []).reduce((sum, order) => sum + (order.order_amount || 0), 0)
    const tiktokCurrentOrders = platform === 'amazon' ? 0 : (tiktokCurrent || []).length
    const tiktokCurrentItems = platform === 'amazon' ? 0 : (tiktokCurrent || []).reduce((sum, order) => sum + (order.quantity || 0), 0)

    const amazonCurrentRevenue = platform === 'tiktok' ? 0 : (amazonCurrent || []).reduce((sum, report) => {
      return sum + (parseFloat(report.ordered_product_sales) || 0)
    }, 0)
    const amazonCurrentOrders = platform === 'tiktok' ? 0 : (amazonCurrent || []).reduce((sum, report) => {
      return sum + (parseInt(report.total_order_items) || 0)
    }, 0)
    const amazonCurrentItems = platform === 'tiktok' ? 0 : (amazonCurrent || []).reduce((sum, report) => {
      return sum + (parseInt(report.units_ordered) || 0)
    }, 0)

    const currentTotalRevenue = tiktokCurrentRevenue + amazonCurrentRevenue
    const currentTotalOrders = tiktokCurrentOrders + amazonCurrentOrders
    const currentTotalItems = tiktokCurrentItems + amazonCurrentItems
    const currentAvgOrderValue = currentTotalOrders > 0 ? currentTotalRevenue / currentTotalOrders : 0

    // === 이전 기간 집계 ===
    const tiktokPreviousRevenue = platform === 'amazon' ? 0 : (tiktokPrevious || []).reduce((sum, order) => sum + (order.order_amount || 0), 0)
    const tiktokPreviousOrders = platform === 'amazon' ? 0 : (tiktokPrevious || []).length
    const tiktokPreviousItems = platform === 'amazon' ? 0 : (tiktokPrevious || []).reduce((sum, order) => sum + (order.quantity || 0), 0)

    const amazonPreviousRevenue = platform === 'tiktok' ? 0 : (amazonPrevious || []).reduce((sum, report) => {
      return sum + (parseFloat(report.ordered_product_sales) || 0)
    }, 0)
    const amazonPreviousOrders = platform === 'tiktok' ? 0 : (amazonPrevious || []).reduce((sum, report) => {
      return sum + (parseInt(report.total_order_items) || 0)
    }, 0)
    const amazonPreviousItems = platform === 'tiktok' ? 0 : (amazonPrevious || []).reduce((sum, report) => {
      return sum + (parseInt(report.units_ordered) || 0)
    }, 0)

    const previousTotalRevenue = tiktokPreviousRevenue + amazonPreviousRevenue
    const previousTotalOrders = tiktokPreviousOrders + amazonPreviousOrders
    const previousTotalItems = tiktokPreviousItems + amazonPreviousItems
    const previousAvgOrderValue = previousTotalOrders > 0 ? previousTotalRevenue / previousTotalOrders : 0

    // === 증감률 계산 ===
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    // === Sales Trend (일별) ===
    const salesTrendMap = new Map<string, { tiktok: number; amazon: number }>()
    const ordersTrendMap = new Map<string, { tiktok: number; amazon: number }>()

    // TikTok 일별 집계 (플랫폼 필터 적용)
    if (platform !== 'amazon') {
      ;(tiktokCurrent || []).forEach(order => {
        const orderDate = parseOrderDate(order.created_time)
        if (!orderDate) return
        const date = orderDate.toISOString().split('T')[0]
        if (!salesTrendMap.has(date)) {
          salesTrendMap.set(date, { tiktok: 0, amazon: 0 })
        }
        if (!ordersTrendMap.has(date)) {
          ordersTrendMap.set(date, { tiktok: 0, amazon: 0 })
        }
        salesTrendMap.get(date)!.tiktok += order.order_amount || 0
        ordersTrendMap.get(date)!.tiktok += 1
      })
    }

    // Amazon 일별 집계 (플랫폼 필터 적용)
    if (platform !== 'tiktok') {
      ;(amazonCurrent || []).forEach(report => {
        const date = report.report_date
        if (!date) return
        if (!salesTrendMap.has(date)) {
          salesTrendMap.set(date, { tiktok: 0, amazon: 0 })
        }
        if (!ordersTrendMap.has(date)) {
          ordersTrendMap.set(date, { tiktok: 0, amazon: 0 })
        }
        salesTrendMap.get(date)!.amazon += parseFloat(report.ordered_product_sales) || 0
        ordersTrendMap.get(date)!.amazon += parseInt(report.total_order_items) || 0
      })
    }

    const salesTrend = Array.from(salesTrendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const ordersTrend = Array.from(ordersTrendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // === Weekly Sales Trend (월요일 기준) ===
    const weeklySalesMap = new Map<string, { tiktok: number; amazon: number }>()
    const weeklyOrdersMap = new Map<string, { tiktok: number; amazon: number }>()

    salesTrend.forEach((item, index) => {
      const date = new Date(item.date)
      const dayOfWeek = date.getDay() // 0=일요일, 1=월요일, ...
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // 월요일로 조정
      const monday = new Date(date)
      monday.setDate(date.getDate() + diff)
      const weekKey = monday.toISOString().split('T')[0]

      if (!weeklySalesMap.has(weekKey)) {
        weeklySalesMap.set(weekKey, { tiktok: 0, amazon: 0 })
        weeklyOrdersMap.set(weekKey, { tiktok: 0, amazon: 0 })
      }
      const week = weeklySalesMap.get(weekKey)!
      const weekOrders = weeklyOrdersMap.get(weekKey)!
      week.tiktok += item.tiktok
      week.amazon += item.amazon
      weekOrders.tiktok += ordersTrend[index]?.tiktok || 0
      weekOrders.amazon += ordersTrend[index]?.amazon || 0
    })

    const weeklySalesTrend = Array.from(weeklySalesMap.entries())
      .map(([date, data]) => ({ date, tiktok: data.tiktok, amazon: data.amazon }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const weeklyOrdersTrend = Array.from(weeklyOrdersMap.entries())
      .map(([date, data]) => ({ date, tiktok: data.tiktok, amazon: data.amazon }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // === Monthly Sales Trend ===
    const monthlySalesMap = new Map<string, { tiktok: number; amazon: number }>()
    const monthlyOrdersMap = new Map<string, { tiktok: number; amazon: number }>()

    salesTrend.forEach((item, index) => {
      const date = new Date(item.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlySalesMap.has(monthKey)) {
        monthlySalesMap.set(monthKey, { tiktok: 0, amazon: 0 })
        monthlyOrdersMap.set(monthKey, { tiktok: 0, amazon: 0 })
      }
      const month = monthlySalesMap.get(monthKey)!
      const monthOrders = monthlyOrdersMap.get(monthKey)!
      month.tiktok += item.tiktok
      month.amazon += item.amazon
      monthOrders.tiktok += ordersTrend[index]?.tiktok || 0
      monthOrders.amazon += ordersTrend[index]?.amazon || 0
    })

    const monthlySalesTrend = Array.from(monthlySalesMap.entries())
      .map(([date, data]) => ({ date, tiktok: data.tiktok, amazon: data.amazon }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const monthlyOrdersTrend = Array.from(monthlyOrdersMap.entries())
      .map(([date, data]) => ({ date, tiktok: data.tiktok, amazon: data.amazon }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // === Product Sales Trend (SKU for TikTok, ASIN for Amazon) ===
    const productSalesTrendMap = new Map<string, Map<string, { tiktok: number; amazon: number }>>()

    // TikTok: seller_sku별 일별 판매 추이 (플랫폼 필터 적용)
    if (platform !== 'amazon') {
      ;(tiktokCurrent || []).forEach(order => {
        const orderDate = parseOrderDate(order.created_time)
        if (!orderDate) return
        const date = orderDate.toISOString().split('T')[0]
        const sku = order.seller_sku || order.product_name || 'Unknown'

        if (!productSalesTrendMap.has(sku)) {
          productSalesTrendMap.set(sku, new Map())
        }
        const skuMap = productSalesTrendMap.get(sku)!
        if (!skuMap.has(date)) {
          skuMap.set(date, { tiktok: 0, amazon: 0 })
        }
        skuMap.get(date)!.tiktok += order.order_amount || 0
      })
    }

    // Amazon: ASIN별 일별 판매 추이는 business_reports 테이블에 개별 ASIN 데이터가 없으므로
    // amazon_orders 테이블에서 가져와야 함. 일단 전체 Amazon을 하나의 항목으로 집계
    if (platform !== 'tiktok') {
      ;(amazonCurrent || []).forEach(report => {
        const date = report.report_date
        if (!date) return
        const asin = 'Amazon (전체)' // 개별 ASIN 데이터가 없으므로 전체로 표시

        if (!productSalesTrendMap.has(asin)) {
          productSalesTrendMap.set(asin, new Map())
        }
        const asinMap = productSalesTrendMap.get(asin)!
        if (!asinMap.has(date)) {
          asinMap.set(date, { tiktok: 0, amazon: 0 })
        }
        asinMap.get(date)!.amazon += parseFloat(report.ordered_product_sales) || 0
      })
    }

    // 제품별 일별 추이 데이터 변환
    const productDailySalesTrend = Array.from(productSalesTrendMap.entries()).map(([product, dateMap]) => ({
      product,
      data: Array.from(dateMap.entries())
        .map(([date, sales]) => ({ date, ...sales }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }))

    // 제품별 주별 추이 (월요일 기준)
    const productWeeklySalesTrend = productDailySalesTrend.map(({ product, data }) => {
      const weeklyMap = new Map<string, { tiktok: number; amazon: number }>()

      data.forEach(item => {
        const date = new Date(item.date)
        const dayOfWeek = date.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(date)
        monday.setDate(date.getDate() + diff)
        const weekKey = monday.toISOString().split('T')[0]

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { tiktok: 0, amazon: 0 })
        }
        const week = weeklyMap.get(weekKey)!
        week.tiktok += item.tiktok
        week.amazon += item.amazon
      })

      return {
        product,
        data: Array.from(weeklyMap.entries())
          .map(([date, sales]) => ({ date, ...sales }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    })

    // 제품별 월별 추이
    const productMonthlySalesTrend = productDailySalesTrend.map(({ product, data }) => {
      const monthlyMap = new Map<string, { tiktok: number; amazon: number }>()

      data.forEach(item => {
        const date = new Date(item.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { tiktok: 0, amazon: 0 })
        }
        const month = monthlyMap.get(monthKey)!
        month.tiktok += item.tiktok
        month.amazon += item.amazon
      })

      return {
        product,
        data: Array.from(monthlyMap.entries())
          .map(([date, sales]) => ({ date, ...sales }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    })

    // === Top Products ===
    const productMap = new Map<string, {
      id: string
      name: string
      platform: string
      orders: number
      revenue: number
    }>()

    // TikTok 제품 집계 (플랫폼 필터 적용)
    if (platform !== 'amazon') {
      ;(tiktokCurrent || []).forEach(order => {
        const id = `tiktok_${order.seller_sku || order.product_name}`
        if (!productMap.has(id)) {
          productMap.set(id, {
            id,
            name: order.product_name || order.seller_sku || 'Unknown',
            platform: 'TikTok',
            orders: 0,
            revenue: 0
          })
        }
        const product = productMap.get(id)!
        product.orders += 1
        product.revenue += order.order_amount || 0
      })
    }

    // Amazon 제품 집계 (플랫폼 필터 적용)
    // business_reports는 일별 집계 데이터라 개별 제품 정보가 없음
    // Amazon 전체를 하나의 항목으로 표시
    if (platform !== 'tiktok' && (amazonCurrent || []).length > 0) {
      const amazonTotalRevenue = (amazonCurrent || []).reduce((sum, report) => {
        return sum + (parseFloat(report.ordered_product_sales) || 0)
      }, 0)
      const amazonTotalOrders = (amazonCurrent || []).reduce((sum, report) => {
        return sum + (parseInt(report.total_order_items) || 0)
      }, 0)

      productMap.set('amazon_aggregate', {
        id: 'amazon_aggregate',
        name: 'Amazon Business (전체)',
        platform: 'Amazon',
        orders: amazonTotalOrders,
        revenue: amazonTotalRevenue
      })
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({
        ...p,
        growth: 0 // 이전 기간 대비는 복잡하므로 일단 0으로
      }))

    // === Response ===
    return NextResponse.json({
      summary: {
        totalRevenue: {
          value: Math.round(currentTotalRevenue),
          change: calculateChange(currentTotalRevenue, previousTotalRevenue)
        },
        totalOrders: {
          value: currentTotalOrders,
          change: calculateChange(currentTotalOrders, previousTotalOrders)
        },
        avgOrderValue: {
          value: Math.round(currentAvgOrderValue),
          change: calculateChange(currentAvgOrderValue, previousAvgOrderValue)
        },
        totalItems: {
          value: currentTotalItems,
          change: calculateChange(currentTotalItems, previousTotalItems)
        }
      },
      platformRevenue: [
        {
          name: 'TikTok Shop',
          value: Math.round(tiktokCurrentRevenue),
          color: '#000000'  // TikTok 블랙
        },
        {
          name: 'Amazon',
          value: Math.round(amazonCurrentRevenue),
          color: '#FF9900'  // Amazon 오렌지
        }
      ],
      salesTrend: salesTrend.map(item => ({
        date: item.date,
        tiktok: Math.round(item.tiktok),
        amazon: Math.round(item.amazon)
      })),
      weeklySalesTrend: weeklySalesTrend.map(item => ({
        date: item.date,
        tiktok: Math.round(item.tiktok),
        amazon: Math.round(item.amazon)
      })),
      monthlySalesTrend: monthlySalesTrend.map(item => ({
        date: item.date,
        tiktok: Math.round(item.tiktok),
        amazon: Math.round(item.amazon)
      })),
      ordersTrend: ordersTrend.map(item => ({
        date: item.date,
        tiktok: item.tiktok,
        amazon: item.amazon
      })),
      weeklyOrdersTrend: weeklyOrdersTrend.map(item => ({
        date: item.date,
        tiktok: item.tiktok,
        amazon: item.amazon
      })),
      monthlyOrdersTrend: monthlyOrdersTrend.map(item => ({
        date: item.date,
        tiktok: item.tiktok,
        amazon: item.amazon
      })),
      productSalesTrend: {
        daily: productDailySalesTrend.map(item => ({
          product: item.product,
          data: item.data.map(d => ({
            date: d.date,
            tiktok: Math.round(d.tiktok),
            amazon: Math.round(d.amazon)
          }))
        })),
        weekly: productWeeklySalesTrend.map(item => ({
          product: item.product,
          data: item.data.map(d => ({
            date: d.date,
            tiktok: Math.round(d.tiktok),
            amazon: Math.round(d.amazon)
          }))
        })),
        monthly: productMonthlySalesTrend.map(item => ({
          product: item.product,
          data: item.data.map(d => ({
            date: d.date,
            tiktok: Math.round(d.tiktok),
            amazon: Math.round(d.amazon)
          }))
        }))
      },
      topProducts,
      platformPerformance: {
        tiktok: {
          name: 'TikTok Shop',
          revenue: Math.round(tiktokCurrentRevenue),
          orders: tiktokCurrentOrders,
          conversionRate: 0,
          avgOrderValue: tiktokCurrentOrders > 0 ? Math.round(tiktokCurrentRevenue / tiktokCurrentOrders) : 0,
          percentOfTotal: currentTotalRevenue > 0 ? Number(((tiktokCurrentRevenue / currentTotalRevenue) * 100).toFixed(1)) : 0
        },
        amazon: {
          name: 'Amazon',
          revenue: Math.round(amazonCurrentRevenue),
          orders: amazonCurrentOrders,
          conversionRate: 0,
          avgOrderValue: amazonCurrentOrders > 0 ? Math.round(amazonCurrentRevenue / amazonCurrentOrders) : 0,
          percentOfTotal: currentTotalRevenue > 0 ? Number(((amazonCurrentRevenue / currentTotalRevenue) * 100).toFixed(1)) : 0
        }
      }
    })

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}
