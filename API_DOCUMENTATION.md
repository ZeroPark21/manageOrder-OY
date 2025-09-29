# API 목록 및 사용 방법 분석

## 1. 인증 관련 API

### `/api/login` (POST)
- **용도**: 사용자 로그인
- **사용처**: 로그인 페이지 (`/login`)
- **기능**: Supabase 인증 후 쿠키 설정
- **company_id 필요**: ❌

### `/api/logout` (POST)
- **용도**: 사용자 로그아웃
- **사용처**: 사이드바 로그아웃 버튼
- **기능**: 쿠키 삭제 및 세션 종료
- **company_id 필요**: ❌

## 2. 샘플 발송 현황 관련 API

### `/api/sample-summary` (GET)
- **용도**: 샘플 발송 요약 데이터 조회
- **사용처**: 샘플 발송 현황 페이지 (`/[companyId]/page.tsx`)
- **파라미터**: `?companyId={companyId}`
- **반환 데이터**:
  - `totalCount`: 총 샘플 발송 수
  - `cancelledCount`: 취소된 샘플 수
  - `shippedCount`: 발송된 샘플 수
- **company_id 필요**: ✅ (구현됨)

### `/api/matrix/all-matrix` (GET)
- **용도**: 일별/주별/월별 매트릭스 데이터 전체 조회
- **사용처**: Excel 다운로드 기능
- **파라미터**: `?companyId={companyId}`
- **반환 데이터**: daily, weekly, monthly 매트릭스 데이터
- **company_id 필요**: ✅ (구현 필요)

### `/api/matrix/daily-matrix` (GET)
- **용도**: 일별 매트릭스 데이터 조회
- **사용처**: `DailyMatrixTable` 컴포넌트
- **파라미터**: `?companyId={companyId}`
- **company_id 필요**: ✅ (구현 필요)

### `/api/matrix/weekly-matrix` (GET)
- **용도**: 주별 매트릭스 데이터 조회
- **사용처**: `WeeklyMatrixTable` 컴포넌트
- **파라미터**: `?companyId={companyId}`
- **company_id 필요**: ✅ (구현 필요)

### `/api/matrix/monthly-matrix` (GET)
- **용도**: 월별 매트릭스 데이터 조회
- **사용처**: `MonthlyMatrixTable` 컴포넌트
- **파라미터**: `?companyId={companyId}`
- **company_id 필요**: ✅ (구현 필요)

## 3. SKU별 판매량 관련 API

### `/api/sales-analysis` (GET)
- **용도**: SKU별 판매량 데이터 조회
- **사용처**: SKU별 판매량 페이지 (`/[companyId]/sales-analysis`)
- **파라미터**:
  - `?companyId={companyId}`
  - `?startDate={date}&endDate={date}`
- **company_id 필요**: ✅ (구현 필요)

### `/api/product-sales` (GET)
- **용도**: 제품 판매 데이터 조회
- **사용처**: 테스트 페이지 (`/test-product-sales`)
- **파라미터**: `?groupBy=all`
- **company_id 필요**: ✅ (구현 필요)

## 4. 콘텐츠 관련 API

### `/api/content/contents` (GET)
- **용도**: 콘텐츠 목록 조회
- **사용처**: 콘텐츠 발행 현황 페이지
- **company_id 필요**: ✅ (구현 필요)

### `/api/content/content-stats` (GET)
- **용도**: 콘텐츠 통계 조회
- **사용처**: 콘텐츠 분석 페이지
- **company_id 필요**: ✅ (구현 필요)

### `/api/content/content-all-matrix` (GET)
- **용도**: 콘텐츠 매트릭스 데이터
- **사용처**: 콘텐츠 매트릭스 테이블
- **company_id 필요**: ✅ (구현 필요)

## 5. 데이터 업로드 API

### `/api/upload/upload-csv` (POST)
- **용도**: TikTok 주문 데이터 CSV 업로드
- **사용처**: 제품 데이터 업로드 페이지
- **파라미터**: FormData (file)
- **company_id 필요**: ✅ (구현 필요 - 업로드 시 company_id 추가)

### `/api/upload/upload-content` (POST)
- **용도**: 콘텐츠 데이터 업로드
- **사용처**: 콘텐츠 데이터 업로드 페이지
- **파라미터**: FormData (file)
- **company_id 필요**: ✅ (구현 필요 - 업로드 시 company_id 추가)

### `/api/upload/tiktok-ads-upload` (POST)
- **용도**: TikTok 광고 데이터 업로드
- **사용처**: TikTok 광고 데이터 업로드
- **company_id 필요**: ✅ (구현 필요)

## 6. 예산 관련 API

### `/api/budget-plan` (GET/POST)
- **용도**: 예산 계획 조회/생성
- **사용처**: 예산 계획 페이지
- **company_id 필요**: ✅ (구현 필요)

## 7. 기타 API

### `/api/orders` (GET)
- **용도**: 주문 데이터 조회
- **사용처**: 주문 관리 페이지
- **company_id 필요**: ✅ (구현 필요)

### `/api/check-orders` (GET)
- **용도**: 주문 데이터 검증
- **사용처**: 디버깅용
- **company_id 필요**: ✅ (구현 필요)

### `/api/clear-cache` (POST)
- **용도**: 캐시 초기화
- **사용처**: 관리자 기능
- **company_id 필요**: ❌

## 현재 구현 상태

### ✅ 완료된 작업
1. `sample-summary` API에 company_id 필터링 추가
2. 페이지에서 companyId 파라미터 전달
3. 데이터베이스 테이블에 company_id 컬럼 추가
4. RLS (Row Level Security) 정책 설정

### 📌 추가 필요한 작업
1. **Matrix API들** (`daily-matrix`, `weekly-matrix`, `monthly-matrix`, `all-matrix`)에 company_id 필터링 추가
2. **콘텐츠 API들**에 company_id 필터링 추가
3. **업로드 API들**에서 company_id를 데이터에 추가
4. **컴포넌트들** (`DailyMatrixTable`, `WeeklyMatrixTable`, `MonthlyMatrixTable`)에서 companyId prop 전달

## 사용 패턴

### 1. 페이지에서 API 호출 패턴
```typescript
// 페이지 컴포넌트
export default function Page({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)

  // API 호출
  const response = await fetch(`/api/sample-summary?companyId=${companyId}`)
}
```

### 2. API에서 company_id 처리 패턴
```typescript
// API Route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 })
  }

  // Supabase 쿼리에 company_id 필터 추가
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', companyId)
}
```

### 3. RLS 정책
- 사용자는 `user_companies` 테이블에 연결된 회사의 데이터만 조회 가능
- `viewer`: 읽기 전용
- `editor`: 읽기/쓰기
- `admin`: 모든 권한

## Multi-tenant 구조
```
/                     → 기본 업체 또는 업체 선택 페이지로 리다이렉트
/select-company       → 업체 선택 페이지 (여러 업체 연결된 경우)
/[companyId]/         → 회사별 샘플 발송 현황
/[companyId]/sales-analysis → 회사별 SKU별 판매량
/[companyId]/content-publish → 회사별 콘텐츠 발행 현황
/[companyId]/content-analysis → 회사별 콘텐츠 분석
/[companyId]/upload-product → 회사별 제품 데이터 업로드
/[companyId]/upload-content → 회사별 콘텐츠 데이터 업로드
```