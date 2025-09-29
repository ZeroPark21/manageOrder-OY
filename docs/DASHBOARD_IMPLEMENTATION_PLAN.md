# 📊 TikTok & Amazon 통합 대시보드 구현 계획

## 1. 아키텍처 설계

### 1.1 데이터베이스 구조

#### 기존 TikTok 테이블
- `orders` - TikTok 주문 데이터
- `contents` - TikTok 콘텐츠 데이터
- `companies` - 회사 정보
- `user_companies` - 사용자-회사 관계

#### 신규 Amazon 테이블
```sql
-- Amazon 주문 데이터
amazon_orders (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  order_id VARCHAR(50) UNIQUE,
  order_date DATE,
  asin VARCHAR(20),
  product_name TEXT,
  sku VARCHAR(100),
  quantity INTEGER,
  price DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  currency VARCHAR(3),
  status VARCHAR(50),
  fulfillment_channel VARCHAR(20), -- FBA/FBM
  marketplace VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
)

-- Amazon 제품 정보
amazon_products (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  asin VARCHAR(20) UNIQUE,
  sku VARCHAR(100),
  product_name TEXT,
  category TEXT,
  brand TEXT,
  current_price DECIMAL(10, 2),
  inventory_quantity INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
)

-- 통합 대시보드 메트릭 (캐시용)
dashboard_metrics (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  date DATE,
  platform VARCHAR(20), -- 'tiktok' | 'amazon'
  total_revenue DECIMAL(10, 2),
  total_orders INTEGER,
  avg_order_value DECIMAL(10, 2),
  conversion_rate DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, date, platform)
)
```

### 1.2 페이지 구조

```
/[companyId]/
  ├── dashboard/              # 통합 대시보드 (홈)
  ├── tiktok/
  │   ├── sales-analysis/    # 기존 TikTok 판매 분석
  │   ├── content/           # 기존 TikTok 콘텐츠
  │   └── sample-summary/    # 기존 TikTok 샘플 발송
  └── amazon/
      ├── sales/             # Amazon 판매 분석
      ├── products/          # Amazon 제품 관리
      └── inventory/         # Amazon 재고 관리
```

## 2. UI/UX 구현 계획

### 2.1 홈 대시보드 레이아웃

```tsx
<DashboardLayout>
  {/* 상단: 날짜 필터 & 플랫폼 선택 */}
  <FilterBar>
    <DateRangePicker />  // 7일, 30일, 90일, 커스텀
    <PlatformFilter />   // 전체, TikTok, Amazon
    <PeriodFilter />     // 일별, 주별, 월별
  </FilterBar>

  {/* 핵심 지표 카드 (4개) */}
  <MetricsGrid>
    <MetricCard title="Total Revenue" value="$125,000" change="+12.5%" />
    <MetricCard title="Total Orders" value="1,250" change="+8.3%" />
    <MetricCard title="Avg Order Value" value="$100" change="-2.1%" />
    <MetricCard title="Conversion Rate" value="3.2%" change="+5.7%" />
  </MetricsGrid>

  {/* 차트 섹션 (2x2 그리드) */}
  <ChartsGrid>
    {/* 왼쪽 상단: 플랫폼 매출 비교 도넛 차트 */}
    <PlatformRevenueChart />

    {/* 오른쪽 상단: 매출 추이 라인 차트 */}
    <SalesTrendChart />

    {/* 왼쪽 하단: Top 상품 테이블 */}
    <TopProductsTable />

    {/* 오른쪽 하단: 플랫폼별 성과 지표 */}
    <PlatformPerformanceTable />
  </ChartsGrid>
</DashboardLayout>
```

### 2.2 컴포넌트 상세 설계

#### A. FilterBar 컴포넌트
```tsx
interface FilterBarProps {
  dateRange: DateRange;
  platform: 'all' | 'tiktok' | 'amazon';
  period: 'daily' | 'weekly' | 'monthly';
  onDateRangeChange: (range: DateRange) => void;
  onPlatformChange: (platform: Platform) => void;
  onPeriodChange: (period: Period) => void;
}

// 날짜 프리셋
const DATE_PRESETS = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'Custom', value: 'custom' }
];
```

#### B. MetricCard 컴포넌트
```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

// 변화율에 따른 색상
const getTrendColor = (change: string) => {
  const value = parseFloat(change);
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};
```

#### C. PlatformRevenueChart (도넛 차트)
```tsx
interface ChartData {
  platform: 'TikTok' | 'Amazon';
  revenue: number;
  percentage: number;
  color: string;
}

// Recharts 도넛 차트 사용
const COLORS = {
  TikTok: '#FF6B6B',  // 핑크/레드
  Amazon: '#FF9500'   // 오렌지
};
```

#### D. SalesTrendChart (라인 차트)
```tsx
interface TrendData {
  date: string;
  tiktok: number;
  amazon: number;
  total: number;
}

// 두 플랫폼 비교 라인 차트
// X축: 날짜
// Y축: 매출액
// 라인: TikTok(핑크), Amazon(오렌지), Total(회색)
```

## 3. API 설계

### 3.1 대시보드 메트릭 API

#### `/api/dashboard/metrics`
```typescript
interface DashboardMetricsRequest {
  companyId: number;
  startDate: string;
  endDate: string;
  platform?: 'all' | 'tiktok' | 'amazon';
  period: 'daily' | 'weekly' | 'monthly';
}

interface DashboardMetricsResponse {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    changes: {
      revenue: string;
      orders: string;
      avgValue: string;
      conversion: string;
    }
  };
  platformComparison: {
    tiktok: { revenue: number; orders: number };
    amazon: { revenue: number; orders: number };
  };
  trend: Array<{
    date: string;
    tiktok: number;
    amazon: number;
    total: number;
  }>;
  topProducts: Array<{
    platform: string;
    productId: string;
    productName: string;
    revenue: number;
    orders: number;
  }>;
}
```

### 3.2 Amazon 데이터 API

#### `/api/amazon/upload`
```typescript
// CSV 업로드 처리
interface AmazonOrderCsv {
  'Order ID': string;
  'Order Date': string;
  'ASIN': string;
  'Product Name': string;
  'SKU': string;
  'Quantity': number;
  'Price': number;
  'Total': number;
  'Status': string;
}
```

## 4. 구현 우선순위

### Phase 1: 데이터베이스 & 기본 구조 (1주)
1. Amazon 테이블 생성 migration
2. 대시보드 페이지 라우팅 설정
3. 기본 레이아웃 컴포넌트

### Phase 2: 데이터 처리 (1주)
1. Amazon CSV 업로드 API
2. 대시보드 메트릭 계산 API
3. 데이터 캐싱 로직

### Phase 3: UI 구현 (2주)
1. FilterBar 컴포넌트
2. MetricCard 컴포넌트
3. 차트 컴포넌트 (Recharts)
4. 테이블 컴포넌트

### Phase 4: 최적화 & 테스트 (1주)
1. 성능 최적화 (React Query 캐싱)
2. 로딩 상태 처리
3. 에러 핸들링
4. 반응형 디자인

## 5. 기술 스택

### Frontend
- **Next.js 15** - 기존 프레임워크
- **Recharts** - 차트 라이브러리
- **React Query (TanStack Query)** - 데이터 페칭 & 캐싱
- **date-fns** - 날짜 처리
- **Tailwind CSS** - 스타일링

### Backend
- **Supabase** - 데이터베이스
- **Next.js API Routes** - API 엔드포인트

### 차트 라이브러리 선택 이유
- **Recharts**: React 친화적, 커스터마이징 용이, 도넛/라인 차트 지원

## 6. 주요 고려사항

### 6.1 데이터 정합성
- TikTok: SKU 기준 집계
- Amazon: ASIN 기준 집계
- 통합 시: 제품명 + 브랜드 매칭 로직 필요

### 6.2 성능 최적화
- 대시보드 메트릭 사전 계산 (일일 배치)
- React Query로 클라이언트 캐싱
- 차트 데이터 lazy loading

### 6.3 확장성
- 추후 다른 플랫폼 추가 고려 (Shopify, eBay 등)
- 플러그인 방식의 플랫폼 모듈 구조

### 6.4 권한 관리
- 기존 권한 시스템 활용
- Amazon 데이터도 company_id로 분리