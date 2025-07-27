-- GMV 데이터 테이블에 새로운 컬럼 추가
-- 새로운 Excel 파일 구조에 맞춰 업데이트

-- 새로운 컬럼 추가
ALTER TABLE gmv_data 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS authorization_type TEXT;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_name ON gmv_data(campaign_name);
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_id ON gmv_data(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_product_id ON gmv_data(product_id);

-- 테이블 구조 확인
-- 이제 gmv_data 테이블은 다음 컬럼들을 포함합니다:
-- id, video_id, video_title, tiktok_account, creative_type, status,
-- orders, gross_revenue, ad_impressions, ad_clicks, ad_click_rate,
-- ad_conversion_rate, video_view_rate_2s, video_view_rate_6s,
-- video_view_rate_25, video_view_rate_50, video_view_rate_75,
-- video_view_rate_100, currency, campaign_name, campaign_id,
-- product_id, authorization_type, created_at, updated_at