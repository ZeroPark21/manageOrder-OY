수정-- 콘텐츠 테이블 생성
CREATE TABLE IF NOT EXISTS contents (
    id BIGSERIAL PRIMARY KEY,
    content_title TEXT NOT NULL,
    video_link TEXT,
    publish_date DATE NOT NULL,
    creator_name TEXT NOT NULL,
    gmv DECIMAL(10,2) DEFAULT 0,
    affiliate_items_sold INTEGER DEFAULT 0,
    affiliate_gmv DECIMAL(10,2) DEFAULT 0,
    shoppable_avg_order_value DECIMAL(10,2) DEFAULT 0,
    est_commission DECIMAL(10,2) DEFAULT 0,
    est_flat_fee TEXT DEFAULT '--',
    affiliate_orders INTEGER DEFAULT 0,
    shoppable_impressions INTEGER DEFAULT 0,
    affiliate_ctr DECIMAL(5,2) DEFAULT 0,
    shoppable_gpm DECIMAL(5,2) DEFAULT 0,
    affiliate_items_refunded INTEGER DEFAULT 0,
    affiliate_refunded_gmv DECIMAL(10,2) DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contents_publish_date ON contents(publish_date);
CREATE INDEX IF NOT EXISTS idx_contents_creator_name ON contents(creator_name);
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정 (모든 사용자가 읽기/쓰기 가능)
CREATE POLICY "Enable read access for all users" ON contents
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON contents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON contents
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON contents
    FOR DELETE USING (true);

-- updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_contents_updated_at 
    BEFORE UPDATE ON contents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 생성 확인
SELECT 'contents 테이블이 성공적으로 생성되었습니다.' as message; 