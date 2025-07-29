-- GMV 일별 원본 데이터 테이블
CREATE TABLE IF NOT EXISTS gmv_daily_raw (
    id BIGSERIAL PRIMARY KEY,
    collection_date DATE DEFAULT CURRENT_DATE,  -- 데이터 수집한 날짜
    gmv_date DATE NOT NULL,                     -- GMV 발생 날짜
    campaign_id TEXT NOT NULL,
    campaign_name TEXT,
    video_id TEXT NOT NULL,
    video_title TEXT,
    creator_name TEXT,
    creator_id TEXT,
    gmv DECIMAL(12,2) DEFAULT 0,
    orders INTEGER DEFAULT 0,
    ad_spend DECIMAL(12,2) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    product_name TEXT,
    product_id TEXT,
    raw_file_name TEXT,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gmv_date, campaign_id, video_id)
);

-- 인덱스 생성
CREATE INDEX idx_gmv_daily_raw_gmv_date ON gmv_daily_raw(gmv_date);
CREATE INDEX idx_gmv_daily_raw_campaign_id ON gmv_daily_raw(campaign_id);
CREATE INDEX idx_gmv_daily_raw_creator_name ON gmv_daily_raw(creator_name);
CREATE INDEX idx_gmv_daily_raw_composite ON gmv_daily_raw(gmv_date, campaign_id);

-- 데이터 수집 로그 테이블
CREATE TABLE IF NOT EXISTS gmv_collection_logs (
    id BIGSERIAL PRIMARY KEY,
    collection_id UUID DEFAULT gen_random_uuid(),
    collection_type TEXT NOT NULL, -- 'manual', 'scheduled'
    target_date DATE NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    file_path TEXT,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_gmv_collection_logs_target_date ON gmv_collection_logs(target_date);
CREATE INDEX idx_gmv_collection_logs_status ON gmv_collection_logs(status);

-- 일별 집계 뷰 (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS gmv_daily_summary AS
SELECT 
    gmv_date,
    campaign_id,
    campaign_name,
    COUNT(DISTINCT video_id) as video_count,
    COUNT(DISTINCT creator_name) as creator_count,
    SUM(gmv) as total_gmv,
    SUM(orders) as total_orders,
    SUM(ad_spend) as total_ad_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    CASE 
        WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks)::DECIMAL / SUM(impressions) * 100, 2)
        ELSE 0 
    END as avg_click_rate,
    CASE 
        WHEN SUM(clicks) > 0 THEN ROUND(SUM(orders)::DECIMAL / SUM(clicks) * 100, 2)
        ELSE 0 
    END as avg_conversion_rate,
    CASE 
        WHEN SUM(ad_spend) > 0 THEN ROUND(SUM(gmv) / SUM(ad_spend), 2)
        ELSE 0 
    END as roi
FROM gmv_daily_raw
GROUP BY gmv_date, campaign_id, campaign_name
WITH DATA;

-- 인덱스 생성
CREATE INDEX idx_gmv_daily_summary_gmv_date ON gmv_daily_summary(gmv_date);
CREATE INDEX idx_gmv_daily_summary_campaign_id ON gmv_daily_summary(campaign_id);

-- 주별 집계 뷰
CREATE MATERIALIZED VIEW IF NOT EXISTS gmv_weekly_summary AS
SELECT 
    DATE_TRUNC('week', gmv_date)::DATE as week_start,
    campaign_id,
    campaign_name,
    COUNT(DISTINCT video_id) as video_count,
    COUNT(DISTINCT creator_name) as creator_count,
    SUM(gmv) as total_gmv,
    SUM(orders) as total_orders,
    SUM(ad_spend) as total_ad_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    CASE 
        WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks)::DECIMAL / SUM(impressions) * 100, 2)
        ELSE 0 
    END as avg_click_rate,
    CASE 
        WHEN SUM(clicks) > 0 THEN ROUND(SUM(orders)::DECIMAL / SUM(clicks) * 100, 2)
        ELSE 0 
    END as avg_conversion_rate,
    CASE 
        WHEN SUM(ad_spend) > 0 THEN ROUND(SUM(gmv) / SUM(ad_spend), 2)
        ELSE 0 
    END as roi
FROM gmv_daily_raw
GROUP BY DATE_TRUNC('week', gmv_date)::DATE, campaign_id, campaign_name
WITH DATA;

-- 월별 집계 뷰
CREATE MATERIALIZED VIEW IF NOT EXISTS gmv_monthly_summary AS
SELECT 
    DATE_TRUNC('month', gmv_date)::DATE as month_start,
    campaign_id,
    campaign_name,
    COUNT(DISTINCT video_id) as video_count,
    COUNT(DISTINCT creator_name) as creator_count,
    SUM(gmv) as total_gmv,
    SUM(orders) as total_orders,
    SUM(ad_spend) as total_ad_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    CASE 
        WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks)::DECIMAL / SUM(impressions) * 100, 2)
        ELSE 0 
    END as avg_click_rate,
    CASE 
        WHEN SUM(clicks) > 0 THEN ROUND(SUM(orders)::DECIMAL / SUM(clicks) * 100, 2)
        ELSE 0 
    END as avg_conversion_rate,
    CASE 
        WHEN SUM(ad_spend) > 0 THEN ROUND(SUM(gmv) / SUM(ad_spend), 2)
        ELSE 0 
    END as roi
FROM gmv_daily_raw
GROUP BY DATE_TRUNC('month', gmv_date)::DATE, campaign_id, campaign_name
WITH DATA;

-- Materialized View 자동 새로고침 함수
CREATE OR REPLACE FUNCTION refresh_gmv_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_weekly_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_monthly_summary;
END;
$$ LANGUAGE plpgsql;

-- RLS 정책 설정
ALTER TABLE gmv_daily_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmv_collection_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 정책 생성
CREATE POLICY "GMV 데이터는 모두 읽기 가능" ON gmv_daily_raw
    FOR ALL USING (true);

CREATE POLICY "수집 로그는 모두 읽기 가능" ON gmv_collection_logs
    FOR ALL USING (true);