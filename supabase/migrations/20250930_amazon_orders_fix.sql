-- Amazon Orders 테이블 수정 - order_item_id 제약 조건 변경
-- order_item_id가 없는 경우를 위해 order_id + sku 조합을 고유 키로 사용

-- 1. 기존 제약 조건 삭제
ALTER TABLE amazon_orders DROP CONSTRAINT IF EXISTS amazon_orders_company_id_order_item_id_key;

-- 2. 새로운 고유 제약 조건 추가 (company_id + order_id + sku)
ALTER TABLE amazon_orders ADD CONSTRAINT amazon_orders_unique_order_sku UNIQUE (company_id, order_id, sku);

-- 3. order_item_id 컬럼을 nullable로 변경 (이미 nullable일 수 있음)
-- ALTER TABLE amazon_orders ALTER COLUMN order_item_id DROP NOT NULL;

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_amazon_orders_order_sku ON amazon_orders(company_id, order_id, sku);