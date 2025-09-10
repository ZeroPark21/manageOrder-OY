-- 최적화된 주문 테이블 생성 (실제 CSV 구조 기반)
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  
  -- 주문 기본 정보
  order_id BIGINT NOT NULL,
  order_status VARCHAR(50),
  order_substatus VARCHAR(50),
  cancelation_return_type VARCHAR(50),
  normal_or_preorder VARCHAR(50),
  
  -- 상품 정보
  sku_id BIGINT,
  seller_sku VARCHAR(100),
  product_name TEXT NOT NULL,
  variation VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  sku_quantity_of_return INTEGER DEFAULT 0,
  
  -- 가격 정보
  sku_unit_original_price DECIMAL(12,2) DEFAULT 0,
  sku_subtotal_before_discount DECIMAL(12,2) DEFAULT 0,
  sku_platform_discount DECIMAL(12,2) DEFAULT 0,
  sku_seller_discount DECIMAL(12,2) DEFAULT 0,
  sku_subtotal_after_discount DECIMAL(12,2) DEFAULT 0,
  
  -- 배송비 정보
  shipping_fee_after_discount DECIMAL(12,2) DEFAULT 0,
  original_shipping_fee DECIMAL(12,2) DEFAULT 0,
  shipping_fee_seller_discount DECIMAL(12,2) DEFAULT 0,
  co_funded_shipping_fee_discount DECIMAL(12,2) DEFAULT 0,
  shipping_fee_platform_discount DECIMAL(12,2) DEFAULT 0,
  payment_platform_discount DECIMAL(12,2) DEFAULT 0,
  retail_delivery_fee DECIMAL(12,2) DEFAULT 0,
  taxes DECIMAL(12,2) DEFAULT 0,
  
  -- 주문 금액
  order_amount DECIMAL(12,2) DEFAULT 0,
  order_refund_amount DECIMAL(12,2) DEFAULT 0,
  
  -- 날짜 정보
  created_time TIMESTAMP,
  paid_time TIMESTAMP,
  rts_time TIMESTAMP,
  shipped_time TIMESTAMP,
  delivered_time TIMESTAMP,
  cancelled_time TIMESTAMP,
  
  -- 취소 정보
  cancel_by VARCHAR(50),
  cancel_reason TEXT,
  
  -- 배송 정보
  fulfillment_type VARCHAR(100),
  warehouse_name VARCHAR(200),
  tracking_id VARCHAR(100),
  delivery_option_type VARCHAR(100),
  delivery_option VARCHAR(100),
  shipping_provider_name VARCHAR(100),
  
  -- 구매자 정보
  buyer_message TEXT,
  buyer_username VARCHAR(100),
  recipient VARCHAR(200),
  phone_number VARCHAR(50),
  country VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  zipcode VARCHAR(20),
  address_line_1 TEXT,
  address_line_2 TEXT,
  delivery_instruction TEXT,
  payment_method VARCHAR(100),
  
  -- 기타 정보
  weight_kg DECIMAL(8,3),
  product_category VARCHAR(200),
  package_id BIGINT,
  seller_note TEXT,
  shipping_information TEXT,
  combined_listing VARCHAR(100),
  
  -- 메타데이터
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_product_name ON orders(product_name);
CREATE INDEX idx_orders_created_time ON orders(created_time);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_product_category ON orders(product_category);
CREATE INDEX idx_orders_shipped_time ON orders(shipped_time);
CREATE INDEX idx_orders_delivered_time ON orders(delivered_time);

-- 복합 인덱스 (분석 쿼리 최적화)
CREATE INDEX idx_orders_date_product ON orders(DATE(created_time), product_name);
CREATE INDEX idx_orders_status_date ON orders(order_status, created_time);

-- RLS 비활성화 (개발용)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 테이블 권한 설정
GRANT ALL ON orders TO anon;
GRANT ALL ON orders TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO authenticated;

-- 테이블 생성 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
