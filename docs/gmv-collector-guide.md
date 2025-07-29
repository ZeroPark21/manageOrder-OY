# GMV 데이터 자동 수집 가이드

## 개요
TikTok Seller Center에서 GMV Max 캠페인 데이터를 자동으로 수집하여 일별/주별/월별 추이를 분석할 수 있는 시스템입니다.

## 주요 기능
- 🤖 브라우저 자동화를 통한 일별 데이터 수집
- 📊 시계열 데이터 저장 및 집계
- 📈 일별/주별/월별 트렌드 차트
- 🔄 자동 스케줄링 지원
- 📉 ROI, CTR, CVR 등 핵심 지표 추적

## 시스템 구조

### 1. 데이터 수집기 (Collector)
- **위치**: `/lib/gmv-collector/collector.ts`
- **역할**: Playwright를 사용하여 TikTok Seller Center에서 데이터 다운로드
- **특징**: 
  - 세션 유지 (한 번 로그인하면 재사용)
  - 날짜별 데이터 수집
  - 자동 재시도 로직

### 2. 데이터 파서 (Parser)
- **위치**: `/lib/gmv-collector/parser.ts`
- **역할**: Excel 파일 파싱 및 DB 저장
- **특징**:
  - 헤더 자동 매핑
  - 중복 데이터 처리
  - Upsert 방식 저장

### 3. 스케줄러
- **위치**: `/scripts/gmv-collector/scheduler.ts`
- **역할**: 정기적인 데이터 수집 관리
- **특징**:
  - 매일 오전 2시 자동 실행
  - 수동 실행 지원
  - 수집 상태 로깅

### 4. API
- **위치**: `/app/api/gmv-trends/route.ts`
- **엔드포인트**:
  - `GET /api/gmv-trends`: 시계열 데이터 조회
  - `POST /api/gmv-trends`: 수집 상태 확인, View 새로고침

### 5. UI 컴포넌트
- **위치**: `/components/gmv-trend-chart.tsx`
- **기능**:
  - 일별/주별/월별 전환
  - 날짜 범위 선택
  - 실시간 차트 업데이트

## 설치 및 설정

### 1. 데이터베이스 테이블 생성
```bash
# Supabase 대시보드에서 SQL 실행
# 파일: /supabase/create-gmv-daily-tables.sql
```

### 2. 환경 변수 설정
```env
GMV_COLLECTOR_HEADLESS=false        # 브라우저 표시 여부
GMV_SESSION_PATH=./tiktok-session   # 세션 저장 경로
GMV_DOWNLOAD_PATH=./downloads/gmv   # 다운로드 경로
```

### 3. 브라우저 설치
```bash
pnpm exec playwright install chromium
```

## 사용 방법

### 1. 첫 로그인
```bash
# 브라우저가 열리면 TikTok Seller Center에 수동 로그인
pnpm run collect:gmv:yesterday
```

### 2. 어제 데이터 수집
```bash
pnpm run collect:gmv:yesterday
```

### 3. 특정 기간 데이터 수집
```bash
pnpm run collect:gmv:range 2025-07-01 2025-07-31
```

### 4. 자동 스케줄러 실행
```bash
# 백그라운드에서 실행 (PM2 추천)
pnpm run collect:gmv:schedule
```

### 5. PM2로 스케줄러 관리
```bash
# PM2 설치
npm install -g pm2

# 스케줄러 시작
pm2 start npm --name "gmv-collector" -- run collect:gmv:schedule

# 상태 확인
pm2 status

# 로그 확인
pm2 logs gmv-collector

# 재시작
pm2 restart gmv-collector

# 중지
pm2 stop gmv-collector
```

## 트러블슈팅

### 1. 로그인 실패
- 브라우저에서 수동으로 로그인 필요
- 2FA가 활성화된 경우 수동 인증 필요

### 2. 다운로드 실패
- 네트워크 상태 확인
- TikTok Seller Center UI 변경 확인
- 셀렉터 업데이트 필요할 수 있음

### 3. 데이터 파싱 오류
- Excel 파일 형식 변경 확인
- 헤더 매핑 규칙 업데이트

### 4. 중복 데이터
- `gmv_date`, `campaign_id`, `video_id` 조합으로 유니크 처리
- Upsert 로직으로 자동 업데이트

## 데이터 구조

### gmv_daily_raw 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| gmv_date | DATE | GMV 발생 날짜 |
| campaign_id | TEXT | 캠페인 ID |
| campaign_name | TEXT | 캠페인명 |
| video_id | TEXT | 비디오 ID |
| creator_name | TEXT | 크리에이터명 |
| gmv | DECIMAL | 총 매출액 |
| orders | INTEGER | 주문 수 |
| ad_spend | DECIMAL | 광고비 |
| impressions | BIGINT | 노출 수 |
| clicks | BIGINT | 클릭 수 |
| click_rate | DECIMAL | 클릭률 |
| conversion_rate | DECIMAL | 전환율 |

### 집계 뷰 (Materialized Views)
- `gmv_daily_summary`: 일별 집계
- `gmv_weekly_summary`: 주별 집계  
- `gmv_monthly_summary`: 월별 집계

## 주의사항
1. **세션 관리**: 로그인 세션은 브라우저 프로필에 저장됩니다
2. **API 제한**: 너무 빈번한 요청은 차단될 수 있으므로 적절한 딜레이 필요
3. **데이터 정합성**: 매일 같은 시간에 수집하여 일관성 유지
4. **백업**: 정기적인 데이터베이스 백업 권장

## 향후 개선사항
1. TikTok API 공식 지원 시 마이그레이션
2. 실시간 알림 시스템 추가
3. 데이터 검증 로직 강화
4. 대시보드 고도화