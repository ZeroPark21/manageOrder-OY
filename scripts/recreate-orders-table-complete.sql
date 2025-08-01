-- orders 테이블 완전 재생성 스크립트
-- 2025-07-31 CSV 파일 기준

-- 1. 기존 테이블 완전 삭제 (주의: 모든 데이터가 삭제됩니다!)
DROP TABLE IF EXISTS orders CASCADE;

-- 2. 새로운 orders 테이블 생성
CREATE TABLE orders (
  -- 기본 키
  id SERIAL PRIMARY KEY,
  
  -- 주문 기본 정보
  order_id TEXT NOT NULL UNIQUE, -- TEXT로 변경하여 큰 숫자 처리
  order_status VARCHAR(100),
  order_substatus VARCHAR(100),
  cancelation_return_type VARCHAR(100),
  normal_or_preorder VARCHAR(50),
  
  -- SKU 및 상품 정보
  sku_id TEXT, -- TEXT로 변경
  seller_sku VARCHAR(200),
  product_name TEXT NOT NULL,
  variation VARCHAR(500),
  quantity INTEGER NOT NULL DEFAULT 0,
  sku_quantity_of_return INTEGER DEFAULT 0,
  
  -- 가격 정보 (모든 금액 필드)
  sku_unit_original_price DECIMAL(15,4) DEFAULT 0,
  sku_subtotal_before_discount DECIMAL(15,4) DEFAULT 0,
  sku_platform_discount DECIMAL(15,4) DEFAULT 0,
  sku_seller_discount DECIMAL(15,4) DEFAULT 0,
  sku_subtotal_after_discount DECIMAL(15,4) DEFAULT 0,
  
  -- 배송비 관련 정보
  shipping_fee_after_discount DECIMAL(15,4) DEFAULT 0,
  original_shipping_fee DECIMAL(15,4) DEFAULT 0,
  shipping_fee_seller_discount DECIMAL(15,4) DEFAULT 0,
  co_funded_shipping_fee_discount DECIMAL(15,4) DEFAULT 0,
  shipping_fee_platform_discount DECIMAL(15,4) DEFAULT 0,
  payment_platform_discount DECIMAL(15,4) DEFAULT 0,
  retail_delivery_fee DECIMAL(15,4) DEFAULT 0,
  taxes DECIMAL(15,4) DEFAULT 0,
  
  -- 주문 총액 정보
  order_amount DECIMAL(15,4) DEFAULT 0,
  order_refund_amount DECIMAL(15,4) DEFAULT 0,
  
  -- 날짜 및 시간 정보
  created_time TIMESTAMPTZ,
  paid_time TIMESTAMPTZ,
  rts_time TIMESTAMPTZ,
  shipped_time TIMESTAMPTZ,
  delivered_time TIMESTAMPTZ,
  cancelled_time TIMESTAMPTZ,
  
  -- 취소 관련 정보
  cancel_by VARCHAR(100),
  cancel_reason TEXT,
  
  -- 주문 처리 및 배송 정보
  fulfillment_type VARCHAR(200),
  warehouse_name VARCHAR(300),
  tracking_id VARCHAR(200),
  delivery_option_type VARCHAR(200),
  delivery_option VARCHAR(200),
  shipping_provider_name VARCHAR(200),
  
  -- 구매자 메시지 및 사용자 정보
  buyer_message TEXT,
  buyer_username VARCHAR(200),
  recipient VARCHAR(300),
  phone_number VARCHAR(50),
  
  -- 배송 주소 정보
  country VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(200),
  zipcode VARCHAR(20),
  address_line_1 TEXT,
  address_line_2 TEXT,
  delivery_instruction TEXT,
  
  -- 결제 정보
  payment_method VARCHAR(200),
  
  -- 상품 물리적 정보
  weight_kg DECIMAL(10,3),
  product_category VARCHAR(300),
  
  -- 패키지 및 기타 정보
  package_id TEXT, -- TEXT로 변경
  seller_note TEXT,
  shipping_information TEXT,
  combined_listing VARCHAR(200),
  
  -- 메타데이터
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_product_name ON orders(product_name);
CREATE INDEX idx_orders_created_time ON orders(created_time);
CREATE INDEX idx_orders_sku_unit_price ON orders(sku_unit_original_price);
CREATE INDEX idx_orders_created_date ON orders(DATE(created_time));

-- 판매 vs 샘플 구분을 위한 함수형 인덱스
CREATE INDEX idx_orders_is_sample ON orders((sku_unit_original_price = 0));

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security 설정 (필요시)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 6. 기본 정책 설정
CREATE POLICY "Enable all access for authenticated users" ON orders
    FOR ALL USING (true);

-- 7. 권한 설정
GRANT ALL PRIVILEGES ON TABLE orders TO anon;
GRANT ALL PRIVILEGES ON TABLE orders TO authenticated;
GRANT ALL PRIVILEGES ON TABLE orders TO service_role;

-- 8. 시퀀스 권한 설정
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO service_role;

-- 9. 테이블 생성 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. 주요 통계 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW order_stats AS
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN sku_unit_original_price > 0 THEN 1 END) as sales_orders,
    COUNT(CASE WHEN sku_unit_original_price = 0 THEN 1 END) as sample_orders,
    COUNT(CASE WHEN order_status IN ('Cancelled', 'Canceled') THEN 1 END) as cancelled_orders,
    SUM(CASE WHEN sku_unit_original_price > 0 THEN order_amount ELSE 0 END) as total_sales_amount,
    SUM(quantity) as total_quantity
FROM orders;