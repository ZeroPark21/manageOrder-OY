-- Amazon Orders 단순 테이블 (CSV와 1:1 매칭)
CREATE TABLE IF NOT EXISTS amazon_orders (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Order 기본 정보
  order_id VARCHAR(50),
  order_item_id VARCHAR(50),
  purchase_date TIMESTAMP WITH TIME ZONE,
  payments_date TIMESTAMP WITH TIME ZONE,

  -- 구매자 정보
  buyer_email VARCHAR(255),
  buyer_name VARCHAR(255),
  buyer_phone_number VARCHAR(50),

  -- 수령인 정보
  recipient_name VARCHAR(255),
  ship_address_1 TEXT,
  ship_address_2 TEXT,
  ship_address_3 TEXT,
  ship_city VARCHAR(100),
  ship_state VARCHAR(50),
  ship_postal_code VARCHAR(20),
  ship_country VARCHAR(50),

  -- 상품 정보
  sku VARCHAR(100),
  product_name TEXT,
  asin VARCHAR(20),
  quantity_purchased INTEGER DEFAULT 0,

  -- 가격 정보
  currency VARCHAR(3) DEFAULT 'USD',
  item_price DECIMAL(12, 2),
  item_tax DECIMAL(10, 2),
  shipping_price DECIMAL(10, 2),
  shipping_tax DECIMAL(10, 2),
  gift_wrap_price DECIMAL(10, 2),
  gift_wrap_tax DECIMAL(10, 2),
  item_promotion_discount DECIMAL(10, 2),
  ship_promotion_discount DECIMAL(10, 2),

  -- 배송 정보
  ship_service_level VARCHAR(50),
  ship_date TIMESTAMP WITH TIME ZONE,
  earliest_ship_date TIMESTAMP WITH TIME ZONE,
  latest_ship_date TIMESTAMP WITH TIME ZONE,
  earliest_delivery_date TIMESTAMP WITH TIME ZONE,
  latest_delivery_date TIMESTAMP WITH TIME ZONE,

  -- 상태 정보
  item_status VARCHAR(50),
  fulfillment_channel VARCHAR(20),

  -- 판매 채널
  sales_channel VARCHAR(50),
  order_channel VARCHAR(50),

  -- 비즈니스 정보
  is_business_order BOOLEAN DEFAULT false,
  is_prime BOOLEAN DEFAULT false,
  is_premium_order BOOLEAN DEFAULT false,

  -- 기타
  price_designation VARCHAR(50),

  -- 업로드 정보
  upload_batch_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 중복 방지 (회사별 order_item_id는 유일)
  UNIQUE(company_id, order_item_id)
);

-- 업로드 배치 관리 테이블
CREATE TABLE IF NOT EXISTS amazon_upload_batches (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),

  -- 파일 정보
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INTEGER,

  -- 처리 상태
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),

  -- 통계
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,

  -- 에러 로그
  error_log JSONB,

  -- 날짜 범위 (자동 감지)
  date_from DATE,
  date_to DATE,

  -- 타임스탬프
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_amazon_orders_company_date ON amazon_orders(company_id, purchase_date DESC);
CREATE INDEX idx_amazon_orders_order_id ON amazon_orders(company_id, order_id);
CREATE INDEX idx_amazon_orders_asin ON amazon_orders(company_id, asin);
CREATE INDEX idx_amazon_orders_sku ON amazon_orders(company_id, sku);
CREATE INDEX idx_amazon_orders_status ON amazon_orders(item_status);
CREATE INDEX idx_amazon_orders_batch ON amazon_orders(upload_batch_id);

-- RLS (Row Level Security) 정책
ALTER TABLE amazon_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_upload_batches ENABLE ROW LEVEL SECURITY;

-- 조회 권한 (모든 사용자)
CREATE POLICY "Users can view amazon orders for their companies"
ON amazon_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_orders.company_id
    AND user_companies.user_id = auth.uid()
  )
);

-- 관리 권한 (Editor, Admin)
CREATE POLICY "Editors can manage amazon orders"
ON amazon_orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_orders.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- 업로드 배치 조회 권한
CREATE POLICY "Users can view upload batches for their companies"
ON amazon_upload_batches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_upload_batches.company_id
    AND user_companies.user_id = auth.uid()
  )
);

-- 업로드 배치 관리 권한
CREATE POLICY "Editors can manage upload batches"
ON amazon_upload_batches FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_upload_batches.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_amazon_orders_updated_at BEFORE UPDATE ON amazon_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();