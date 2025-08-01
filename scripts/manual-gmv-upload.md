# 수동 GMV 데이터 업로드 가이드

브라우저 자동화가 작동하지 않을 경우, 다음 단계를 따라 수동으로 데이터를 업로드할 수 있습니다.

## 1. 데이터 다운로드

1. TikTok Seller Center 로그인: https://seller.us.tiktokglobalshop.com
2. Ads Creation Dashboard로 이동
3. 날짜 선택 (예: 2025-07-28)
4. Export/Download 버튼 클릭하여 Excel 파일 다운로드

## 2. 파일 업로드

다운로드한 Excel 파일을 다음 디렉토리에 저장:
```
/Users/sero/Documents/GitHub/manageOrder-OY/manageOrder-OY/downloads/gmv/
```

## 3. 데이터 파싱 및 업로드 스크립트 실행

```bash
# 특정 파일 처리
node scripts/process-gmv-file.js downloads/gmv/[파일명].xlsx 2025-07-28

# 또는 디렉토리의 모든 파일 처리
node scripts/process-gmv-directory.js downloads/gmv/
```

## 4. Supabase에서 확인

데이터가 성공적으로 업로드되었는지 확인:
```sql
SELECT * FROM gmv_daily_raw ORDER BY gmv_date DESC LIMIT 10;
```