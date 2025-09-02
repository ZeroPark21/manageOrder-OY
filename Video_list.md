# Video List 데이터 관리 정책

## 📋 개요
이 문서는 TikTok 콘텐츠 데이터의 정확성과 일관성을 보장하기 위한 데이터 관리 정책입니다.

## 🎯 핵심 원칙

### 1. 데이터 정합성 보장
- **단일 진실 소스**: Raw Data 파일이 최종 기준
- **중복 제거**: video_link 기준으로 중복 제거 필수
- **실시간 동기화**: 업로드 시 기존 데이터 업데이트

### 2. 업로드 프로세스 표준화
- **파일명 규칙**: `Video_List_YYYYMMDD-YYYYMMDD_YYYYMMDDHHMMSS.xlsx`
- **데이터 검증**: 업로드 전 필수 필드 확인
- **백업**: 업로드 전 기존 데이터 백업

## 📊 데이터 구조 표준

### 필수 컬럼
```
1. Video name (콘텐츠 제목)
2. Video link (고유 식별자)
3. Video post date (게시일)
4. Creator username (크리에이터명)
5. GMV (총 상품 거래액)
6. Shoppable video impressions (노출 수)
7. Shoppable video likes (좋아요 수)
8. Shoppable video comments (댓글 수)
9. Affiliate orders (주문 수)
10. Est. commission (예상 수수료)
```

### 데이터 타입 규칙
- **GMV**: DECIMAL(10,2) - 소수점 2자리
- **날짜**: YYYY-MM-DD 형식
- **숫자**: INTEGER 또는 DECIMAL
- **문자열**: 최대 길이 제한

## 🔄 업로드 프로세스

### 1. 업로드 전 체크리스트
- [ ] 파일명이 표준 규칙을 따르는가?
- [ ] 필수 컬럼이 모두 있는가?
- [ ] 데이터 타입이 올바른가?
- [ ] 중복 데이터가 있는가?
- [ ] GMV 값이 정확한가?

### 2. 업로드 시 처리 로직
```javascript
// 1. 파일 검증
validateFile(file)

// 2. 데이터 파싱
const data = parseExcelFile(file)

// 3. 중복 제거 (video_link 기준)
const uniqueData = removeDuplicates(data, 'video_link')

// 4. 기존 데이터와 비교
const existingData = await getExistingData(uniqueData)

// 5. 업데이트/삽입 분리
const { toUpdate, toInsert } = separateUpdateInsert(uniqueData, existingData)

// 6. 배치 처리
await batchUpdate(toUpdate)
await batchInsert(toInsert)

// 7. 검증
await validateUpload(uniqueData)
```

### 3. 업로드 후 검증
- [ ] 총 레코드 수 확인
- [ ] GMV 총합 검증
- [ ] 중복 데이터 확인
- [ ] 데이터 타입 검증

## 🚨 문제 해결 가이드

### GMV 불일치 문제
**증상**: Raw Data와 DB의 GMV 총합이 다름
**원인**: 
- 중복 데이터로 인한 잘못된 계산
- 업데이트 로직 오류
- 데이터 타입 변환 문제

**해결 방법**:
1. 중복 데이터 정리
2. video_link 기준 중복 제거
3. 기존 데이터 업데이트 로직 수정

### 중복 데이터 문제
**증상**: 같은 video_link에 여러 레코드 존재
**원인**: 
- 업로드 시 기존 데이터 업데이트 실패
- 중복 제거 로직 오류

**해결 방법**:
1. video_link 기준 중복 제거
2. 최신 데이터만 유지
3. 오래된 레코드 삭제

## 📈 모니터링 지표

### 정확성 지표
- **GMV 정합성**: Raw Data와 DB의 GMV 차이 < 0.01
- **중복률**: 중복 레코드 비율 < 1%
- **데이터 완성도**: 필수 필드 누락률 < 0.1%

### 성능 지표
- **업로드 시간**: 1000개 레코드당 < 30초
- **처리 성공률**: > 99%
- **오류 발생률**: < 0.1%

## 🔧 기술적 구현

### API 엔드포인트
```
POST /api/upload-content-v2
- 파일 업로드 및 처리
- 중복 제거 및 업데이트
- 배치 처리

GET /api/content-stats
- 정확한 통계 계산
- video_link 기준 중복 제거
- 실시간 데이터 반영
```

### 데이터베이스 제약조건
```sql
-- video_link 유니크 제약조건
ALTER TABLE contents ADD CONSTRAINT unique_video_link UNIQUE (video_link);

-- GMV 데이터 타입
ALTER TABLE contents ALTER COLUMN gmv TYPE DECIMAL(10,2);

-- 인덱스 최적화
CREATE INDEX idx_contents_video_link ON contents(video_link);
CREATE INDEX idx_contents_publish_date ON contents(publish_date);
```

## 📝 로그 및 감사

### 로그 레벨
- **INFO**: 정상 업로드, 통계 계산
- **WARN**: 중복 데이터 발견, 데이터 타입 변환
- **ERROR**: 업로드 실패, 데이터 검증 실패

### 감사 추적
- 업로드 시간 및 사용자
- 처리된 레코드 수
- 오류 발생 내역
- 데이터 변경 이력

## 🚀 개선 계획

### 단기 (1주일)
- [ ] 중복 데이터 정리 스크립트 작성
- [ ] 업로드 로직 수정
- [ ] 데이터 검증 강화

### 중기 (1개월)
- [ ] 실시간 모니터링 대시보드
- [ ] 자동화된 데이터 검증
- [ ] 백업 및 복구 시스템

### 장기 (3개월)
- [ ] AI 기반 데이터 품질 검증
- [ ] 예측적 데이터 분석
- [ ] 자동화된 리포트 생성

## 📞 연락처 및 지원

### 문제 신고
- **긴급**: 즉시 팀 리더에게 연락
- **일반**: 이슈 트래커에 등록
- **문의**: 데이터 팀 슬랙 채널

### 문서 업데이트
- 이 문서는 월 1회 검토
- 정책 변경 시 모든 팀원에게 공지
- 버전 관리 및 변경 이력 유지

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-09-02  
**다음 검토일**: 2025-10-02
