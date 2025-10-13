# 통합 대시보드 데이터 설계

## 현재 상태
- ❌ 목 데이터만 사용 중 (`lib/mock-data/dashboard-mock-data.ts`)
- ✅ DB에 TikTok 주문 데이터 있음 (`tiktok_orders`)
- ✅ DB에 Amazon 주문 데이터 있음 (`amazon_orders`)

## 필요한 데이터 구조

### 1. 상단 메트릭 카드 (4개)

#### 1.1 Total Revenue (총 매출)
```typescript
{
  value: number,        // 선택한 기간의 총 매출
  change: number,       // 이전 기간 대비 증감률 (%)
  platform?: 'all' | 'tiktok' | 'amazon'
}
```

**쿼리 로직:**
```sql
-- 현재 기간 (예: 최근 7일)
SELECT
  SUM(total_amount) as current_revenue
FROM (
  -- TikTok
  SELECT total_amount FROM tiktok_orders
  WHERE company_id = ?
    AND order_date >= CURRENT_DATE - INTERVAL '7 days'

  UNION ALL

  -- Amazon
  SELECT (item_price + shipping_price + item_tax + shipping_tax
          - item_promotion_discount - ship_promotion_discount) as total_amount
  FROM amazon_orders
  WHERE company_id = ?
    AND purchase_date >= CURRENT_DATE - INTERVAL '7 days'
) combined;

-- 이전 기간 (예: 7일 전 ~ 14일 전)
SELECT
  SUM(total_amount) as previous_revenue
FROM (
  -- TikTok
  SELECT total_amount FROM tiktok_orders
  WHERE company_id = ?
    AND order_date >= CURRENT_DATE - INTERVAL '14 days'
    AND order_date < CURRENT_DATE - INTERVAL '7 days'

  UNION ALL

  -- Amazon
  SELECT (item_price + shipping_price + item_tax + shipping_tax
          - item_promotion_discount - ship_promotion_discount) as total_amount
  FROM amazon_orders
  WHERE company_id = ?
    AND purchase_date >= CURRENT_DATE - INTERVAL '14 days'
    AND purchase_date < CURRENT_DATE - INTERVAL '7 days'
) combined;

-- 증감률 계산: ((current - previous) / previous) * 100
```

#### 1.2 Total Orders (총 주문 수)
```typescript
{
  value: number,        // 선택한 기간의 총 주문 수
  change: number,       // 이전 기간 대비 증감률 (%)
}
```

**쿼리 로직:**
```sql
-- 현재 기간
SELECT COUNT(*) as current_orders
FROM (
  SELECT order_id FROM tiktok_orders
  WHERE company_id = ? AND order_date >= ?

  UNION ALL

  SELECT order_item_id FROM amazon_orders
  WHERE company_id = ? AND purchase_date >= ?
) combined;
```

#### 1.3 Avg Order Value (평균 주문액)
```typescript
{
  value: number,        // 평균 주문액
  change: number,       // 이전 기간 대비 증감률 (%)
}
```

**계산:** Total Revenue / Total Orders

#### 1.4 Conversion Rate (전환율)
```typescript
{
  value: number,        // 전환율 (%)
  change: number,       // 이전 기간 대비 증감률 (%p)
}
```

**문제:** 현재 DB에 트래픽/세션 데이터가 없음
**해결 방안:**
- Option 1: 해당 메트릭 제거하고 다른 지표로 대체 (예: Total Items Sold)
- Option 2: TikTok/Amazon 광고 데이터 연동 필요
- **추천:** Total Items Sold (총 판매 수량)으로 변경

```sql
SELECT SUM(quantity) as total_items
FROM (
  SELECT quantity FROM tiktok_orders WHERE company_id = ? AND order_date >= ?
  UNION ALL
  SELECT quantity_purchased FROM amazon_orders WHERE company_id = ? AND purchase_date >= ?
) combined;
```

### 2. Platform Revenue Comparison (플랫폼별 매출 비교 - Pie Chart)

```typescript
[
  {
    name: 'TikTok Shop',
    value: number,      // TikTok 총 매출
    color: '#FF6B6B'
  },
  {
    name: 'Amazon',
    value: number,      // Amazon 총 매출
    color: '#FF9500'
  }
]
```

**쿼리 로직:**
```sql
-- TikTok 매출
SELECT COALESCE(SUM(total_amount), 0) as tiktok_revenue
FROM tiktok_orders
WHERE company_id = ? AND order_date >= ? AND order_date <= ?;

-- Amazon 매출
SELECT COALESCE(SUM(
  item_price + shipping_price + item_tax + shipping_tax
  - item_promotion_discount - ship_promotion_discount
), 0) as amazon_revenue
FROM amazon_orders
WHERE company_id = ? AND purchase_date >= ? AND purchase_date <= ?;
```

### 3. Sales Trend (매출 추이 - Line Chart)

```typescript
[
  {
    date: 'YYYY-MM-DD',
    tiktok: number,     // 해당 일자 TikTok 매출
    amazon: number      // 해당 일자 Amazon 매출
  },
  // ...
]
```

**쿼리 로직 (Daily):**
```sql
WITH date_series AS (
  SELECT generate_series(
    DATE '2024-01-01',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date as date
),
tiktok_daily AS (
  SELECT
    order_date::date as date,
    SUM(total_amount) as revenue
  FROM tiktok_orders
  WHERE company_id = ?
    AND order_date >= ?
    AND order_date <= ?
  GROUP BY order_date::date
),
amazon_daily AS (
  SELECT
    purchase_date::date as date,
    SUM(item_price + shipping_price + item_tax + shipping_tax
        - item_promotion_discount - ship_promotion_discount) as revenue
  FROM amazon_orders
  WHERE company_id = ?
    AND purchase_date >= ?
    AND purchase_date <= ?
  GROUP BY purchase_date::date
)
SELECT
  ds.date,
  COALESCE(td.revenue, 0) as tiktok,
  COALESCE(ad.revenue, 0) as amazon
FROM date_series ds
LEFT JOIN tiktok_daily td ON ds.date = td.date
LEFT JOIN amazon_daily ad ON ds.date = ad.date
WHERE ds.date >= ? AND ds.date <= ?
ORDER BY ds.date;
```

**Weekly/Monthly 집계:**
```sql
-- Weekly: GROUP BY DATE_TRUNC('week', order_date)
-- Monthly: GROUP BY DATE_TRUNC('month', order_date)
```

### 4. Top Performing Products (상위 제품)

```typescript
[
  {
    id: string,
    name: string,
    platform: 'TikTok' | 'Amazon',
    orders: number,
    revenue: number,
    growth: number      // 이전 기간 대비 증감률
  },
  // ... top 5
]
```

**쿼리 로직:**
```sql
WITH current_period AS (
  -- TikTok 제품
  SELECT
    'tiktok_' || sku as id,
    product_name as name,
    'TikTok' as platform,
    COUNT(*) as orders,
    SUM(total_amount) as revenue
  FROM tiktok_orders
  WHERE company_id = ?
    AND order_date >= ?
    AND order_date <= ?
  GROUP BY sku, product_name

  UNION ALL

  -- Amazon 제품
  SELECT
    'amazon_' || asin as id,
    product_name as name,
    'Amazon' as platform,
    COUNT(*) as orders,
    SUM(item_price + shipping_price + item_tax + shipping_tax
        - item_promotion_discount - ship_promotion_discount) as revenue
  FROM amazon_orders
  WHERE company_id = ?
    AND purchase_date >= ?
    AND purchase_date <= ?
  GROUP BY asin, product_name
),
previous_period AS (
  -- 동일하게 이전 기간 데이터
  -- ...
)
SELECT
  cp.id,
  cp.name,
  cp.platform,
  cp.orders,
  cp.revenue,
  CASE
    WHEN pp.revenue IS NULL OR pp.revenue = 0 THEN 0
    ELSE ROUND(((cp.revenue - pp.revenue) / pp.revenue * 100)::numeric, 1)
  END as growth
FROM current_period cp
LEFT JOIN previous_period pp ON cp.id = pp.id
ORDER BY cp.revenue DESC
LIMIT 5;
```

### 5. Platform Performance (플랫폼 성과)

```typescript
{
  tiktok: {
    name: 'TikTok Shop',
    revenue: number,
    orders: number,
    conversionRate: number,     // 없으면 0
    avgOrderValue: number,
    percentOfTotal: number
  },
  amazon: {
    name: 'Amazon',
    revenue: number,
    orders: number,
    conversionRate: number,     // 없으면 0
    avgOrderValue: number,
    percentOfTotal: number
  }
}
```

**쿼리 로직:**
```sql
WITH platform_stats AS (
  SELECT
    'tiktok' as platform,
    COUNT(*) as orders,
    SUM(total_amount) as revenue
  FROM tiktok_orders
  WHERE company_id = ? AND order_date >= ? AND order_date <= ?

  UNION ALL

  SELECT
    'amazon' as platform,
    COUNT(*) as orders,
    SUM(item_price + shipping_price + item_tax + shipping_tax
        - item_promotion_discount - ship_promotion_discount) as revenue
  FROM amazon_orders
  WHERE company_id = ? AND purchase_date >= ? AND purchase_date <= ?
),
total_revenue AS (
  SELECT SUM(revenue) as total FROM platform_stats
)
SELECT
  ps.platform,
  ps.orders,
  ps.revenue,
  ROUND((ps.revenue / ps.orders)::numeric, 2) as avg_order_value,
  ROUND((ps.revenue / tr.total * 100)::numeric, 1) as percent_of_total
FROM platform_stats ps
CROSS JOIN total_revenue tr;
```

## 필터 옵션

### Date Range (기간)
- Last 7 Days
- Last 30 Days
- Last 90 Days
- This Month
- Last Month
- Custom Range

### Platform (플랫폼)
- All Platforms
- TikTok Shop
- Amazon

### Period (집계 단위)
- Daily
- Weekly
- Monthly

## API 엔드포인트 설계

### GET `/api/dashboard/metrics`
**Query Params:**
- `companyId`: number
- `dateFrom`: YYYY-MM-DD
- `dateTo`: YYYY-MM-DD
- `platform`: 'all' | 'tiktok' | 'amazon'

**Response:**
```typescript
{
  summary: {
    totalRevenue: { value: number, change: number },
    totalOrders: { value: number, change: number },
    avgOrderValue: { value: number, change: number },
    totalItems: { value: number, change: number }
  },
  platformRevenue: [
    { name: string, value: number, color: string }
  ],
  salesTrend: [
    { date: string, tiktok: number, amazon: number }
  ],
  topProducts: [
    { id: string, name: string, platform: string, orders: number, revenue: number, growth: number }
  ],
  platformPerformance: {
    tiktok: { ... },
    amazon: { ... }
  }
}
```

## 구현 우선순위

1. ✅ **High Priority** (핵심 지표)
   - Total Revenue
   - Total Orders
   - Platform Revenue Comparison
   - Sales Trend (Daily)

2. ⚠️ **Medium Priority**
   - Avg Order Value
   - Top Products
   - Platform Performance

3. 🔵 **Low Priority** (선택적)
   - Weekly/Monthly 집계
   - Conversion Rate (데이터 연동 필요)
   - Export Report 기능

## DB 인덱스 최적화 필요

```sql
-- TikTok Orders
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_company_date
ON tiktok_orders(company_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_tiktok_orders_sku
ON tiktok_orders(company_id, sku);

-- Amazon Orders
CREATE INDEX IF NOT EXISTS idx_amazon_orders_company_date
ON amazon_orders(company_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_amazon_orders_asin
ON amazon_orders(company_id, asin);
```

## 다음 단계

1. API Route 구현 (`/api/dashboard/metrics`)
2. 통합 대시보드 페이지 실제 데이터 연동
3. 로딩 상태 및 에러 핸들링
4. 캐싱 전략 (React Query 또는 SWR)
5. 성능 모니터링 및 최적화
