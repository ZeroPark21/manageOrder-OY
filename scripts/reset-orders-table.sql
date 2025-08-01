-- orders 테이블 완전 초기화 (주의: 모든 데이터가 삭제됩니다!)

-- 1. 백업을 위한 현재 데이터 수 확인
SELECT COUNT(*) as total_records_before_delete FROM orders;

-- 2. unique constraint 제거
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_order_id_unique;

-- 3. 모든 데이터 삭제
TRUNCATE TABLE orders;

-- 4. 시퀀스 리셋
SELECT setval('orders_id_seq', 1, false);

-- 5. unique constraint 다시 추가
ALTER TABLE orders 
ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 6. 확인
SELECT COUNT(*) as total_records_after_reset FROM orders;

-- 7. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
    AND column_name IN ('id', 'order_id')
ORDER BY ordinal_position;