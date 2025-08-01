-- orders 테이블의 unique constraint 추가
-- order_id를 기준으로 unique constraint 설정

-- 1. 먼저 중복된 order_id가 있는지 확인
SELECT order_id, COUNT(*) as count
FROM orders
GROUP BY order_id
HAVING COUNT(*) > 1;

-- 2. 중복이 있다면 최신 것만 남기고 삭제
DELETE FROM orders a
USING orders b
WHERE a.id < b.id
AND a.order_id = b.order_id;

-- 3. order_id에 unique constraint 추가
ALTER TABLE orders 
ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 4. 확인
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'orders' 
    AND tc.constraint_type = 'UNIQUE';