-- orders 테이블을 CSV 파일과 정확히 일치하도록 재생성
-- CSV 파일: All order-2025-07-31-22_29.csv

-- 1. 기존 테이블 삭제
DROP TABLE IF EXISTS orders CASCADE;

-- 2. CSV와 정확히 일치하는 테이블 생성
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  
  -- CSV 컬럼 순서대로 (BOM 제거된 컬럼명 사용)
  "order_id" TEXT,
  "order_status" TEXT,
  "order_substatus" TEXT,
  "cancelation_return_type" TEXT,
  "normal_or_preorder" TEXT,
  "sku_id" TEXT,
  "seller_sku" TEXT,
  "product_name" TEXT,
  "variation" TEXT,
  "quantity" INTEGER,
  "sku_quantity_of_return" INTEGER,
  "sku_unit_original_price" NUMERIC,
  "sku_subtotal_before_discount" NUMERIC,
  "sku_platform_discount" NUMERIC,
  "sku_seller_discount" NUMERIC,
  "sku_subtotal_after_discount" NUMERIC,
  "shipping_fee_after_discount" NUMERIC,
  "original_shipping_fee" NUMERIC,
  "shipping_fee_seller_discount" NUMERIC,
  "co_funded_shipping_fee_discount" NUMERIC,
  "shipping_fee_platform_discount" NUMERIC,
  "payment_platform_discount" NUMERIC,
  "retail_delivery_fee" NUMERIC,
  "taxes" NUMERIC,
  "order_amount" NUMERIC,
  "order_refund_amount" NUMERIC,
  "created_time" TEXT,
  "paid_time" TEXT,
  "rts_time" TEXT,
  "shipped_time" TEXT,
  "delivered_time" TEXT,
  "cancelled_time" TEXT,
  "cancel_by" TEXT,
  "cancel_reason" TEXT,
  "fulfillment_type" TEXT,
  "warehouse_name" TEXT,
  "tracking_id" TEXT,
  "delivery_option_type" TEXT,
  "delivery_option" TEXT,
  "shipping_provider_name" TEXT,
  "buyer_message" TEXT,
  "buyer_username" TEXT,
  "recipient" TEXT,
  "phone_number" TEXT,
  "country" TEXT,
  "state" TEXT,
  "city" TEXT,
  "zipcode" TEXT,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "delivery_instruction" TEXT,
  "payment_method" TEXT,
  "weight_kg" NUMERIC,
  "product_category" TEXT,
  "package_id" TEXT,
  "seller_note" TEXT,
  "shipping_information" TEXT,
  "combined_listing" TEXT,
  
  -- 메타데이터
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_product_name ON orders(product_name);
CREATE INDEX idx_orders_sku_unit_original_price ON orders(sku_unit_original_price);

-- 4. 권한 설정
GRANT ALL ON orders TO anon;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;
GRANT ALL ON orders_id_seq TO anon;
GRANT ALL ON orders_id_seq TO authenticated;
GRANT ALL ON orders_id_seq TO service_role;

-- 5. RLS 활성화
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON orders FOR ALL USING (true);

-- 6. 확인
SELECT COUNT(*) FROM orders;