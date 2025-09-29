-- Amazon 주문 데이터 테이블
CREATE TABLE IF NOT EXISTS amazon_orders (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id VARCHAR(50) NOT NULL,
  order_date DATE NOT NULL,
  asin VARCHAR(20),
  product_name TEXT,
  sku VARCHAR(100),
  quantity INTEGER DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50),
  fulfillment_channel VARCHAR(20), -- FBA/FBM
  marketplace VARCHAR(10) DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, order_id)
);

-- Amazon 제품 정보 테이블
CREATE TABLE IF NOT EXISTS amazon_products (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asin VARCHAR(20) NOT NULL,
  sku VARCHAR(100),
  product_name TEXT,
  category TEXT,
  brand TEXT,
  current_price DECIMAL(10, 2),
  inventory_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, asin)
);

-- 통합 대시보드 메트릭 캐시 테이블
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('tiktok', 'amazon')),
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10, 2) DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),
  top_products JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, metric_date, platform)
);

-- 인덱스 생성
CREATE INDEX idx_amazon_orders_company_date ON amazon_orders(company_id, order_date);
CREATE INDEX idx_amazon_orders_asin ON amazon_orders(asin);
CREATE INDEX idx_amazon_orders_sku ON amazon_orders(sku);
CREATE INDEX idx_amazon_orders_status ON amazon_orders(status);

CREATE INDEX idx_amazon_products_company ON amazon_products(company_id);
CREATE INDEX idx_amazon_products_asin ON amazon_products(asin);
CREATE INDEX idx_amazon_products_sku ON amazon_products(sku);
CREATE INDEX idx_amazon_products_active ON amazon_products(is_active);

CREATE INDEX idx_dashboard_metrics_company_date ON dashboard_metrics(company_id, metric_date);
CREATE INDEX idx_dashboard_metrics_platform ON dashboard_metrics(platform);

-- RLS (Row Level Security) 정책
ALTER TABLE amazon_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- Amazon 주문 조회 권한
CREATE POLICY "Users can view amazon orders for their companies"
ON amazon_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_orders.company_id
    AND user_companies.user_id = auth.uid()
  )
);

-- Amazon 주문 관리 권한 (editor, admin)
CREATE POLICY "Editor and admin can manage amazon orders"
ON amazon_orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_orders.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- Amazon 제품 조회 권한
CREATE POLICY "Users can view amazon products for their companies"
ON amazon_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_products.company_id
    AND user_companies.user_id = auth.uid()
  )
);

-- Amazon 제품 관리 권한 (editor, admin)
CREATE POLICY "Editor and admin can manage amazon products"
ON amazon_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_products.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- 대시보드 메트릭 조회 권한
CREATE POLICY "Users can view dashboard metrics for their companies"
ON dashboard_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = dashboard_metrics.company_id
    AND user_companies.user_id = auth.uid()
  )
);

-- 대시보드 메트릭 관리 권한 (editor, admin)
CREATE POLICY "Editor and admin can manage dashboard metrics"
ON dashboard_metrics FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = dashboard_metrics.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_amazon_orders_updated_at BEFORE UPDATE ON amazon_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amazon_products_updated_at BEFORE UPDATE ON amazon_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_metrics_updated_at BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();