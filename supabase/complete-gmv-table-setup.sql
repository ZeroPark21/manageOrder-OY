-- Complete GMV 데이터 테이블 설정
-- 이 스크립트는 Excel 파일의 모든 22개 컬럼을 포함합니다

-- 1. 먼저 기존 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS gmv_data (
    id BIGSERIAL PRIMARY KEY,
    video_id TEXT,
    video_title TEXT,
    tiktok_account TEXT,
    creative_type TEXT,
    status TEXT,
    orders INTEGER DEFAULT 0,
    gross_revenue DECIMAL(10,2) DEFAULT 0,
    ad_impressions INTEGER DEFAULT 0,
    ad_clicks INTEGER DEFAULT 0,
    ad_click_rate DECIMAL(6,4) DEFAULT 0,
    ad_conversion_rate DECIMAL(6,4) DEFAULT 0,
    video_view_rate_2s DECIMAL(6,4) DEFAULT 0,
    video_view_rate_6s DECIMAL(6,4) DEFAULT 0,
    video_view_rate_25 DECIMAL(6,4) DEFAULT 0,
    video_view_rate_50 DECIMAL(6,4) DEFAULT 0,
    video_view_rate_75 DECIMAL(6,4) DEFAULT 0,
    video_view_rate_100 DECIMAL(6,4) DEFAULT 0,
    currency TEXT DEFAULT 'KRW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 새로운 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE gmv_data 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS authorization_type TEXT;

-- 3. 모든 필요한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gmv_data_video_id ON gmv_data(video_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_tiktok_account ON gmv_data(tiktok_account);
CREATE INDEX IF NOT EXISTS idx_gmv_data_gross_revenue ON gmv_data(gross_revenue);
CREATE INDEX IF NOT EXISTS idx_gmv_data_created_at ON gmv_data(created_at);
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_name ON gmv_data(campaign_name);
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_id ON gmv_data(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_product_id ON gmv_data(product_id);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE gmv_data ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 설정 (이미 존재하면 무시)
DO $$ 
BEGIN
    -- 기존 정책이 있으면 삭제
    DROP POLICY IF EXISTS "Enable read access for all users" ON gmv_data;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON gmv_data;
    DROP POLICY IF EXISTS "Enable update access for all users" ON gmv_data;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON gmv_data;
    
    -- 새 정책 생성
    CREATE POLICY "Enable read access for all users" ON gmv_data
        FOR SELECT USING (true);
    CREATE POLICY "Enable insert access for all users" ON gmv_data
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update access for all users" ON gmv_data
        FOR UPDATE USING (true);
    CREATE POLICY "Enable delete access for all users" ON gmv_data
        FOR DELETE USING (true);
END $$;

-- 6. updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 트리거 생성 (이미 존재하면 먼저 삭제)
DROP TRIGGER IF EXISTS update_gmv_data_updated_at ON gmv_data;
CREATE TRIGGER update_gmv_data_updated_at 
    BEFORE UPDATE ON gmv_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 테이블 구조 확인
-- 실행 후 다음 쿼리로 테이블 구조를 확인할 수 있습니다:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'gmv_data'
-- ORDER BY ordinal_position;