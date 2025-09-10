-- 기존 테이블이 있다면 삭제 (주의: 모든 데이터가 삭제됩니다)
DROP TABLE IF EXISTS orders CASCADE;

-- TikTok 주문 데이터를 위한 완전한 테이블 생성
CREATE TABLE orders (
  -- 기본 키
  id SERIAL PRIMARY KEY,
  
  -- 주문 기본 정보
  order_id BIGINT NOT NULL,
  order_status VARCHAR(100),
  order_substatus VARCHAR(100),
  cancelation_return_type VARCHAR(100),
  normal_or_preorder VARCHAR(100),
  
  -- SKU 및 상품 정보
  sku_id BIGINT,
  seller_sku VARCHAR(200),
  product_name TEXT NOT NULL,
  variation VARCHAR(200),
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
  
  -- 배송 주소 정보
  recipient VARCHAR(300),
  phone_number VARCHAR(50),
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
  package_id BIGINT,
  seller_note TEXT,
  shipping_information TEXT,
  combined_listing VARCHAR(200),
  
  -- 메타데이터
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약 조건
  CONSTRAINT orders_quantity_positive CHECK (quantity > 0),
  CONSTRAINT orders_order_id_not_null CHECK (order_id IS NOT NULL),
  CONSTRAINT orders_product_name_not_empty CHECK (LENGTH(TRIM(product_name)) > 0)
);

-- 성능 최적화를 위한 인덱스 생성
-- 기본 검색용 인덱스
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_product_name ON orders USING gin(to_tsvector('english', product_name));
CREATE INDEX idx_orders_product_name_simple ON orders(product_name);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_product_category ON orders(product_category);

-- 날짜 관련 인덱스 (분석 쿼리 최적화)
CREATE INDEX idx_orders_created_time ON orders(created_time);
CREATE INDEX idx_orders_shipped_time ON orders(shipped_time);
CREATE INDEX idx_orders_delivered_time ON orders(delivered_time);
CREATE INDEX idx_orders_created_date ON orders(DATE(created_time));

-- 복합 인덱스 (매트릭스 쿼리 최적화)
CREATE INDEX idx_orders_date_product ON orders(DATE(created_time), product_name);
CREATE INDEX idx_orders_product_date ON orders(product_name, DATE(created_time));
CREATE INDEX idx_orders_status_date ON orders(order_status, created_time);

-- 주별/월별 분석을 위한 함수형 인덱스
CREATE INDEX idx_orders_week ON orders(DATE_TRUNC('week', created_time));
CREATE INDEX idx_orders_month ON orders(DATE_TRUNC('month', created_time));

-- 수량 및 금액 관련 인덱스
CREATE INDEX idx_orders_quantity ON orders(quantity);
CREATE INDEX idx_orders_order_amount ON orders(order_amount);

-- Row Level Security 비활성화 (개발 환경용)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 권한 설정
GRANT ALL PRIVILEGES ON TABLE orders TO anon;
GRANT ALL PRIVILEGES ON TABLE orders TO authenticated;
GRANT ALL PRIVILEGES ON TABLE orders TO service_role;

-- 시퀀스 권한 설정
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO service_role;

-- 시퀀스 리셋 함수 생성
CREATE OR REPLACE FUNCTION reset_orders_sequence()
RETURNS void AS $$
BEGIN
  PERFORM setval('orders_id_seq', 1, false);
END;
$$ LANGUAGE plpgsql;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION reset_orders_sequence() TO anon;
GRANT EXECUTE ON FUNCTION reset_orders_sequence() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_orders_sequence() TO service_role;

-- 테이블 생성 확인 및 정보 출력
DO $$
BEGIN
  RAISE NOTICE '✅ Orders 테이블이 성공적으로 생성되었습니다!';
  RAISE NOTICE '📊 테이블 정보:';
  RAISE NOTICE '   - 총 컬럼 수: %', (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND table_schema = 'public'
  );
  RAISE NOTICE '   - 인덱스 수: %', (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE tablename = 'orders' AND schemaname = 'public'
  );
END $$;

-- 테이블 구조 확인 쿼리 (선택사항)
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
