# Product Requirements Document (PRD)
# 콘텐츠 분석 페이지 (Content Analysis Page)

## 1. 개요 (Overview)

### 1.1 목적
TikTok Shop 크리에이터들의 콘텐츠 퍼포먼스를 분석하고 관리하기 위한 대시보드 페이지

### 1.2 주요 사용자
- 마케팅 매니저
- 크리에이터 관리 담당자
- 데이터 분석가

### 1.3 핵심 가치
- 크리에이터별 성과를 한눈에 파악
- 데이터 기반 의사결정 지원
- ROI 분석 및 최적화

---

## 2. 데이터 구조 (Data Structure)

### 2.1 원본 데이터 소스
- **파일명 형식**: `Video_List_YYYYMMDD-YYYYMMDD_YYYYMMDDHHMMSS.xlsx`
- **업로드 경로**: `/api/upload-content-v2`
- **저장 위치**: Supabase `contents` 테이블

### 2.2 필수 데이터 필드

| 필드명 | 데이터베이스 컬럼 | 타입 | 설명 |
|--------|------------------|------|------|
| Video name | content_title | string | 콘텐츠 제목 |
| Video link | video_link | string | TikTok 비디오 URL (고유 식별자) |
| Video post date | publish_date | date | 게시일 |
| Creator username | creator_name | string | 크리에이터 이름 |
| GMV | gmv | decimal | 총 상품 거래액 |
| Est. commission | est_commission | decimal | 예상 수수료 |
| Affiliate orders | affiliate_orders | integer | 주문 수 |
| Shoppable video impressions | shoppable_impressions | integer | 노출 수 |
| Affiliate CTR | affiliate_ctr | decimal | 클릭률 (%) |
| Shoppable video likes | like_count | integer | 좋아요 수 |
| Shoppable video comments | comment_count | integer | 댓글 수 |

---

## 3. 핵심 기능 (Core Features)

### 3.1 크리에이터별 데이터 집계

#### 집계 로직
```javascript
// Creator username을 기준으로 그룹화
// 각 크리에이터별로 다음 항목들을 합산:
- 총 GMV: 모든 비디오의 GMV 합계
- 총 Commission: 모든 비디오의 est_commission 합계
- 총 영상 수: 해당 크리에이터의 비디오 개수
- 총 주문 수: affiliate_orders 합계
- 총 노출 수: shoppable_impressions 합계
- 총 좋아요: like_count 합계
- 총 댓글: comment_count 합계
- 평균 CTR: 유효한 CTR 값들의 평균
```

#### 중복 제거
- `video_link` 기준으로 중복 콘텐츠 제거
- 동일한 비디오가 여러 번 업로드된 경우 최신 데이터만 유지

### 3.2 크리에이터 리스트 뷰

#### 표시 정보
1. **크리에이터 카드**
   - 크리에이터 이름
   - 총 비디오 수
   - 총 GMV (통화 포맷)
   - 총 Commission (통화 포맷)
   - 총 주문 수
   - 평균 CTR (%)

2. **정렬 옵션**
   - 기본: 총 GMV 내림차순
   - 검색: 크리에이터 이름으로 필터링

### 3.3 크리에이터 상세 뷰

#### 상세 통계
- 총 노출 수 (천 단위 구분)
- 총 좋아요 수
- 총 댓글 수
- 평균 주문 가치
- 개별 비디오 리스트

#### 비디오 리스트
각 비디오별로 표시:
- 콘텐츠 제목
- 게시일
- GMV
- Commission
- 주문 수
- CTR
- 노출/좋아요/댓글

### 3.4 데이터 내보내기

#### Excel 내보내기 기능
- 크리에이터별 통계 CSV 다운로드
- 선택한 크리에이터의 비디오 목록 CSV 다운로드
- UTF-8 인코딩 지원

---

## 4. 데이터 업데이트 프로세스

### 4.1 업로드 플로우
1. Excel/CSV 파일 업로드 (`/upload-content` 페이지)
2. 파일 파싱 및 검증
3. 데이터 변환 (컬럼 매핑)
4. 중복 체크 (video_link 기준)
5. 데이터베이스 업서트 (insert or update)
6. 캐시 무효화

### 4.2 데이터 검증 규칙
- 필수 필드 존재 여부 확인
- 숫자 필드 파싱 ($ 기호, 콤마 제거)
- 날짜 형식 표준화 (YYYY-MM-DD)
- 빈 값은 0 또는 기본값으로 처리

### 4.3 업데이트 정책
- **기존 데이터 있을 경우**: 새 데이터로 업데이트
- **신규 데이터**: 새로 삽입
- **변경사항 없을 경우**: 건너뛰기

---

## 5. API 엔드포인트

### 5.1 콘텐츠 조회
```
GET /api/contents?groupBy=creator
```
- 크리에이터별로 그룹화된 콘텐츠 데이터 반환
- 통계 정보 포함

### 5.2 콘텐츠 업로드
```
POST /api/upload-content-v2
```
- multipart/form-data로 Excel/CSV 파일 업로드
- 자동 파싱 및 데이터베이스 저장

---

## 6. 주의사항 및 알려진 이슈

### 6.1 데이터 정합성
- 동일한 video_link는 한 번만 저장됨
- Commission 값이 0인 경우 확인 필요
- GMV와 Commission의 비율 검증 권장

### 6.2 성능 최적화
- 대량 데이터 업로드 시 배치 처리 (20개씩)
- 프론트엔드에서 useMemo로 집계 계산 캐싱
- 검색 시 클라이언트 사이드 필터링

### 6.3 데이터 업데이트 시 체크리스트
- [ ] 올바른 파일 형식인지 확인 (Excel/CSV)
- [ ] 필수 컬럼이 모두 있는지 확인
- [ ] 크리에이터 이름이 일관되게 입력되었는지 확인
- [ ] Commission 값이 정확한지 확인
- [ ] 업로드 후 콘텐츠 분석 페이지 새로고침

---

## 7. 향후 개선사항

### 7.1 단기 (1-2주)
- [ ] 실시간 데이터 동기화
- [ ] 더 많은 필터 옵션 추가
- [ ] 날짜 범위 필터링

### 7.2 중기 (1개월)
- [ ] 크리에이터 성과 트렌드 차트
- [ ] 자동 리포트 생성
- [ ] 크리에이터 등급 시스템

### 7.3 장기 (3개월)
- [ ] AI 기반 성과 예측
- [ ] 크리에이터 추천 시스템
- [ ] ROI 자동 최적화

---

## 8. 문서 버전

- **버전**: 1.0.0
- **작성일**: 2025-09-08
- **작성자**: System
- **최종 수정일**: 2025-09-08
- **검토 주기**: 월 1회

---

## 9. 연락처

기술 문의 및 버그 리포트:
- GitHub Issues: [프로젝트 저장소]
- 담당팀: 데이터 플랫폼팀