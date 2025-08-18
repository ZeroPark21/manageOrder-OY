# TikTok GMV Auto Collector Chrome Extension

TikTok Seller Center에서 GMV 데이터를 자동으로 수집하고 Supabase에 업로드하는 Chrome 확장 프로그램입니다.

## 기능

- ✅ 자동 데이터 수집 (매일 지정된 시간)
- ✅ 수동 즉시 수집
- ✅ 날짜 범위 수집
- ✅ Supabase 직접 업로드
- ✅ 수집 로그 확인

## 설치 방법

1. Chrome 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `chrome-extension` 폴더 선택

## 설정

1. 확장 프로그램 아이콘 클릭
2. Supabase 정보 입력:
   - Supabase URL: `https://your-project.supabase.co`
   - Supabase Anon Key: 프로젝트 설정에서 확인
3. 자동 수집 설정 (선택사항)
4. "설정 저장" 클릭

## 사용 방법

### 즉시 수집
1. TikTok Seller Center Ads Dashboard 페이지 열기
2. 확장 프로그램에서 "지금 수집" 클릭

### 자동 수집
- 매일 설정된 시간에 자동으로 어제 데이터 수집
- Chrome이 실행 중이어야 함

### 기간 수집
1. "기간 수집" 클릭
2. 시작일과 종료일 입력
3. 자동으로 각 날짜별 데이터 수집

## 아이콘 생성

아이콘이 없는 경우, icon.svg를 PNG로 변환:
```bash
# macOS에서 sips 사용
sips -s format png icon.svg --out icon16.png --resampleHeightWidth 16 16
sips -s format png icon.svg --out icon48.png --resampleHeightWidth 48 48
sips -s format png icon.svg --out icon128.png --resampleHeightWidth 128 128
```

또는 온라인 변환 도구 사용:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/kr/svg-png/

## 문제 해결

### 데이터를 찾을 수 없음
- 페이지가 완전히 로드될 때까지 대기
- 올바른 페이지인지 확인 (Ads Dashboard)
- 날짜 범위가 올바르게 설정되었는지 확인

### Supabase 업로드 실패
- Supabase URL과 Key가 올바른지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 네트워크 연결 확인

## 보안 주의사항

- Supabase Anon Key는 공개되어도 안전하지만, 다른 사람과 공유하지 마세요
- 확장 프로그램은 로컬에서만 사용하세요