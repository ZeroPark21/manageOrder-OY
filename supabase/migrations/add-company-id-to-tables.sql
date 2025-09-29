-- 1. orders 테이블에 company_id 추가
ALTER TABLE orders
ADD COLUMN company_id INTEGER REFERENCES companies(id);

-- 기존 데이터를 위한 기본값 설정 (company_id = 1로 설정)
UPDATE orders SET company_id = 1 WHERE company_id IS NULL;

-- company_id를 NOT NULL로 변경
ALTER TABLE orders
ALTER COLUMN company_id SET NOT NULL;

-- company_id 인덱스 추가
CREATE INDEX idx_orders_company_id ON orders(company_id);
CREATE INDEX idx_orders_company_product ON orders(company_id, product_name);
CREATE INDEX idx_orders_company_created ON orders(company_id, created_time);
-- date 인덱스는 timezone을 고정해서 생성 (UTC 기준)
CREATE INDEX idx_orders_company_date ON orders(company_id, ((created_time AT TIME ZONE 'UTC')::date));

-- 2. contents 테이블이 있다면 company_id 추가
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contents') THEN
    ALTER TABLE contents
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

    UPDATE contents SET company_id = 1 WHERE company_id IS NULL;

    ALTER TABLE contents
    ALTER COLUMN company_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_contents_company_id ON contents(company_id);
  END IF;
END $$;

-- 3. gmv_data 테이블이 있다면 company_id 추가
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gmv_data') THEN
    ALTER TABLE gmv_data
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

    UPDATE gmv_data SET company_id = 1 WHERE company_id IS NULL;

    ALTER TABLE gmv_data
    ALTER COLUMN company_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_gmv_data_company_id ON gmv_data(company_id);
  END IF;
END $$;

-- 4. tiktok_ads_data 테이블이 있다면 company_id 추가
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiktok_ads_data') THEN
    ALTER TABLE tiktok_ads_data
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

    UPDATE tiktok_ads_data SET company_id = 1 WHERE company_id IS NULL;

    ALTER TABLE tiktok_ads_data
    ALTER COLUMN company_id SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_tiktok_ads_data_company_id ON tiktok_ads_data(company_id);
  END IF;
END $$;

-- 5. RLS (Row Level Security) 정책 추가
-- orders 테이블에 대한 RLS 활성화
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- orders 테이블 RLS 정책
CREATE POLICY "Users can view orders for their companies" ON orders
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders for their companies" ON orders
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM user_companies
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can update orders for their companies" ON orders
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id
      FROM user_companies
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Users can delete orders for their companies" ON orders
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id
      FROM user_companies
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Service role은 모든 데이터에 접근 가능
CREATE POLICY "Service role has full access to orders" ON orders
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. 함수 생성: 사용자가 접근 가능한 company_ids 반환
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id
  FROM user_companies
  WHERE user_id = auth.uid();
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION get_user_company_ids() TO authenticated;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ company_id 컬럼이 성공적으로 추가되었습니다!';
  RAISE NOTICE '📊 적용된 테이블:';
  RAISE NOTICE '   - orders (필수)';
  RAISE NOTICE '   - contents (있는 경우)';
  RAISE NOTICE '   - gmv_data (있는 경우)';
  RAISE NOTICE '   - tiktok_ads_data (있는 경우)';
  RAISE NOTICE '🔒 RLS 정책이 적용되었습니다.';
END $$;