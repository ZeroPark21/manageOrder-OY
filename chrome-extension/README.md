# TikTok Shop Ads Auto Downloader Chrome Extension

TikTok Shop Ads에서 일별 데이터를 자동으로 다운로드하는 Chrome 확장 프로그램입니다.

## 기능

- ✅ 기간 설정 (시작일/종료일)
- ✅ 일별(Daily) 데이터 자동 다운로드
- ✅ 진행 상황 실시간 표시
- ✅ 오류 처리 및 자동 재시도
- ✅ 다운로드 로그 확인

## 설치 방법

1. Chrome 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `chrome-extension` 폴더 선택

## 설정

1. 확장 프로그램 아이콘 클릭
2. 기간 설정:
   - 시작일: 다운로드 시작 날짜
   - 종료일: 다운로드 종료 날짜 (최대 90일)
3. 고급 설정 (선택사항):
   - 다운로드 간격: 3초 (기본값)
   - 최대 재시도 횟수: 3회 (기본값)

## 사용 방법

### 다운로드 시작
1. TikTok Shop Ads Dashboard 페이지 열기 (https://seller.us.tiktokglobalshop.com/ads-creation/dashboard)
2. 확장 프로그램에서 기간 설정
3. "다운로드 시작" 클릭

### 진행 상황 확인
- 진행률 표시: 전체 날짜 중 현재 진행 상황
- 현재 처리 중인 날짜 표시
- 로그에서 상세 상태 확인

### 중지 및 재개
- "중지" 버튼으로 다운로드 중단
- 진행 상황은 자동 저장됨 (설정 시)

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

### 다운로드가 시작되지 않음
- TikTok Shop Ads 페이지에 접속했는지 확인
- 로그인 상태 확인
- 기간 설정이 올바른지 확인

### 다운로드 실패
- 페이지가 완전히 로드될 때까지 대기
- 날짜 필터가 Daily로 설정되었는지 확인
- 브라우저 다운로드 설정 확인

## 주의사항

- 브라우저를 닫지 마세요
- 다운로드 중 페이지를 이동하지 마세요
- 최대 90일까지 선택 가능
- TikTok UI 변경 시 업데이트 필요