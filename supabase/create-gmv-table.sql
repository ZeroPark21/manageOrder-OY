-- GMV 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS gmv_data (
    id BIGSERIAL PRIMARY KEY,
    video_id TEXT NOT NULL,
    video_title TEXT,
    tiktok_account TEXT,
    creative_type TEXT,
    status TEXT,
    orders INTEGER DEFAULT 0,
    gross_revenue DECIMAL(10,2) DEFAULT 0,
    ad_impressions INTEGER DEFAULT 0,
    ad_clicks INTEGER DEFAULT 0,
    ad_click_rate DECIMAL(5,2) DEFAULT 0,
    ad_conversion_rate DECIMAL(5,2) DEFAULT 0,
    video_view_rate_2s DECIMAL(5,2) DEFAULT 0,
    video_view_rate_6s DECIMAL(5,2) DEFAULT 0,
    video_view_rate_25 DECIMAL(5,2) DEFAULT 0,
    video_view_rate_50 DECIMAL(5,2) DEFAULT 0,
    video_view_rate_75 DECIMAL(5,2) DEFAULT 0,
    video_view_rate_100 DECIMAL(5,2) DEFAULT 0,
    currency TEXT DEFAULT 'KRW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_gmv_data_video_id ON gmv_data(video_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_tiktok_account ON gmv_data(tiktok_account);
CREATE INDEX IF NOT EXISTS idx_gmv_data_gross_revenue ON gmv_data(gross_revenue);
CREATE INDEX IF NOT EXISTS idx_gmv_data_created_at ON gmv_data(created_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE gmv_data ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정 (모든 사용자가 읽기/쓰기 가능)
CREATE POLICY "Enable read access for all users" ON gmv_data
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON gmv_data
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON gmv_data
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON gmv_data
    FOR DELETE USING (true);

-- updated_at 자동 업데이트를 위한 함수 (이미 존재하면 스킵)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_gmv_data_updated_at 
    BEFORE UPDATE ON gmv_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();