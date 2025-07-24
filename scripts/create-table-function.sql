-- Supabase에서 실행할 함수 (테이블 자동 생성용)
CREATE OR REPLACE FUNCTION create_tiktok_orders_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS tiktok_orders (
    id SERIAL PRIMARY KEY,
    order_id TEXT,
    order_status TEXT,
    product_name TEXT,
    variation TEXT,
    quantity INTEGER DEFAULT 0,
    created_time TIMESTAMP,
    shipped_time TIMESTAMP,
    delivered_time TIMESTAMP,
    sku_unit_original_price DECIMAL(10,2) DEFAULT 0,
    order_amount DECIMAL(10,2) DEFAULT 0,
    product_category TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
  );

  -- 인덱스 생성
  CREATE INDEX IF NOT EXISTS idx_tiktok_orders_created_time ON tiktok_orders(created_time);
  CREATE INDEX IF NOT EXISTS idx_tiktok_orders_shipped_time ON tiktok_orders(shipped_time);
  CREATE INDEX IF NOT EXISTS idx_tiktok_orders_product_name ON tiktok_orders(product_name);
  
  -- RLS 비활성화 (개발용)
  ALTER TABLE tiktok_orders DISABLE ROW LEVEL SECURITY;
END;
$$ LANGUAGE plpgsql;
