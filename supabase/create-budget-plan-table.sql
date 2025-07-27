-- 월별 예산 계획 테이블 생성
CREATE TABLE IF NOT EXISTS budget_plan (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    budget BIGINT NOT NULL DEFAULT 0,
    ratio DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, month)
);

-- 2025년 월별 예산 계획 데이터 삽입
INSERT INTO budget_plan (year, month, budget, ratio) VALUES
(2025, 7, 0, 0),
(2025, 8, 9000000, 9),
(2025, 9, 15000000, 15),
(2025, 10, 27000000, 27),
(2025, 11, 33000000, 33),
(2025, 12, 16000000, 16)
ON CONFLICT (year, month) 
DO UPDATE SET 
    budget = EXCLUDED.budget,
    ratio = EXCLUDED.ratio,
    updated_at = NOW();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_budget_plan_year_month ON budget_plan(year, month);

-- RLS 활성화
ALTER TABLE budget_plan ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
DO $$ 
BEGIN
    -- 기존 정책이 있으면 삭제
    DROP POLICY IF EXISTS "Enable read access for all users" ON budget_plan;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON budget_plan;
    DROP POLICY IF EXISTS "Enable update access for all users" ON budget_plan;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON budget_plan;
    
    -- 새 정책 생성
    CREATE POLICY "Enable read access for all users" ON budget_plan
        FOR SELECT USING (true);
    CREATE POLICY "Enable insert access for all users" ON budget_plan
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update access for all users" ON budget_plan
        FOR UPDATE USING (true);
    CREATE POLICY "Enable delete access for all users" ON budget_plan
        FOR DELETE USING (true);
END $$;

-- updated_at 자동 업데이트를 위한 함수 (이미 존재하지 않는 경우만)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_budget_plan_updated_at ON budget_plan;
CREATE TRIGGER update_budget_plan_updated_at 
    BEFORE UPDATE ON budget_plan 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();