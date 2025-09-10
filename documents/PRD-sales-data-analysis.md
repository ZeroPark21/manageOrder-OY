# PRD: 매출 데이터 분석 페이지

## 프로젝트 개요

### 목적
올리브영 TikTok 샘플링 캠페인의 매출 데이터를 일자별, 제품별로 분석할 수 있는 대시보드 페이지 구축

### 배경
- 현재 시스템은 샘플 발송 현황(무료 샘플)에 대한 분석만 제공
- 실제 매출이 발생하는 주문들(SKU Unit Original Price > 0)에 대한 분석 필요
- 제품별, 일자별 매출 트렌드 파악을 통한 비즈니스 인사이트 도출

## 기능 요구사항

### 1. 네비게이션 추가
- 사이드바의 "분석 대시보드" 섹션에 "매출 데이터 분석" 메뉴 추가
- 기존 메뉴들과 동일한 스타일 적용
- URL: `/sales-analysis`

### 2. 데이터 필터링 조건
- **포함 조건**: `SKU Unit Original Price > 0` (실제 매출이 발생한 주문만)
- **제외 조건**: `SKU Unit Original Price = 0` (무료 샘플 제외)
- **그룹핑**: Product Name으로 그룹화 (SKU ID, Seller SKU는 제품별로 다르므로)

### 3. 데이터 집계 방식
- **일자별 집계**: Order Date를 기준으로 일별 데이터 생성
- **제품별 집계**: Product Name으로 그룹화
- **주요 지표**:
  - 판매량 (Quantity 합계)
  - 총매출 (Gross Revenue 합계)

### 4. 페이지 구성 요소

#### 4.1 페이지 헤더
- 제목: "매출 데이터 분석"
- 설명: "실제 매출이 발생한 주문 분석 (SKU Unit Original Price > 0)"
- 새로고침 버튼

#### 4.2 요약 카드 (3개)
1. **총 매출액**
   - 전체 기간 Gross Revenue 합계
   - 통화 형식으로 표시 (원화)
   
2. **총 판매량**
   - 전체 기간 Quantity 합계
   - 개수 단위로 표시
   
3. **활성 제품 수**
   - 매출이 발생한 고유 Product Name 수

#### 4.3 매트릭스 테이블
- **일별 매트릭스**: 제품별 일자별 판매량 및 매출
- **주별 매트릭스**: 제품별 주별 판매량 및 매출  
- **월별 매트릭스**: 제품별 월별 판매량 및 매출

### 5. 테이블 구조

#### 공통 컬럼
- 순위
- Product Name
- Seller SKU (대표값)
- SKU ID (대표값)
- 기간별 데이터 컬럼 (판매량/매출)
- 총 판매량
- 총 매출액

#### 기간별 데이터 표시 방식
- **판매량**: 해당 기간 Quantity 합계
- **매출액**: 해당 기간 Gross Revenue 합계
- **이중 표시**: 각 셀에 "판매량 / 매출액" 형태로 표시

## 기술 사양

### 1. API 엔드포인트
- **경로**: `/api/sales-analysis`
- **메서드**: GET
- **응답 형식**: JSON

#### API 응답 구조
```json
{
  "summary": {
    "totalRevenue": number,
    "totalQuantity": number,
    "activeProducts": number
  },
  "daily": {
    "dates": string[],
    "products": string[],
    "matrix": {
      "[product_name]": {
        "[date]": {
          "quantity": number,
          "revenue": number
        },
        "total": {
          "quantity": number,
          "revenue": number
        }
      }
    },
    "productSkuMap": {
      "[product_name]": {
        "seller_sku": string,
        "sku_id": number
      }
    }
  },
  "weekly": { /* 주별 동일한 구조 */ },
  "monthly": { /* 월별 동일한 구조 */ }
}
```

### 2. 데이터베이스 쿼리 로직
```sql
-- 기본 필터링 조건
WHERE "SKU Unit Original Price" > 0

-- 일별 집계
GROUP BY "Order Date", "Product Name"

-- 집계 함수
SUM("Quantity") as total_quantity,
SUM("Gross Revenue") as total_revenue
```

### 3. 페이지 컴포넌트
- **파일 위치**: `app/sales-analysis/page.tsx`
- **재사용 컴포넌트**: 기존 매트릭스 테이블 컴포넌트 활용
- **스타일**: 기존 대시보드와 동일한 디자인 시스템

## 개발 우선순위

### Phase 1 (필수)
1. API 엔드포인트 개발
2. 기본 페이지 구조 및 요약 카드
3. 네비게이션 메뉴 추가

### Phase 2 (핵심)
4. 일별 매트릭스 테이블 구현
5. 데이터 시각화 (차트)

### Phase 3 (확장)
6. 주별/월별 매트릭스 테이블
7. Excel 다운로드 기능
8. 날짜 범위 필터

## 성능 고려사항

### 1. 데이터 최적화
- 인덱스 활용: Order Date, Product Name
- 페이지네이션 적용 (필요시)
- 캐싱 전략 수립

### 2. UI 최적화
- 가상 스크롤링 (대용량 테이블)
- 로딩 스피너 및 스켈레톤 UI
- 점진적 로딩 (탭별)

## 검증 기준

### 1. 기능 검증
- [ ] 매출 데이터만 정확히 필터링 (SKU Unit Original Price > 0)
- [ ] 제품별 그룹핑이 올바르게 작동
- [ ] 일자별 집계가 정확함
- [ ] 요약 통계가 정확함

### 2. 성능 검증
- [ ] 페이지 로딩 시간 < 3초
- [ ] API 응답 시간 < 2초
- [ ] 테이블 렌더링 시간 < 1초

### 3. UX 검증
- [ ] 기존 페이지들과 일관된 디자인
- [ ] 반응형 레이아웃 지원
- [ ] 접근성 기준 충족

## 향후 확장 계획

### 1. 분석 기능 확장
- 제품별 매출 트렌드 차트
- 기간별 비교 분석
- 매출 예측 모델

### 2. 필터링 옵션
- 날짜 범위 선택
- 제품 카테고리 필터
- 매출 구간별 필터

### 3. 내보내기 기능
- Excel 다운로드
- PDF 리포트 생성
- 이메일 공유 기능