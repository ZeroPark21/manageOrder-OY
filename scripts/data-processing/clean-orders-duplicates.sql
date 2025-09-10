-- orders 테이블 중복 제거 스크립트

-- 1. 현재 중복 확인
SELECT order_id, COUNT(*) as count
FROM orders
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- 2. 전체 레코드 수 확인
SELECT COUNT(*) as total_records FROM orders;

-- 3. unique constraint 제거
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_id_unique;

-- 4. 중복 제거 (각 order_id별로 가장 최근 id만 유지)
DELETE FROM orders a
USING (
    SELECT order_id, MAX(id) as max_id
    FROM orders
    GROUP BY order_id
    HAVING COUNT(*) > 1
) b
WHERE a.order_id = b.order_id 
AND a.id < b.max_id;

-- 5. unique constraint 재생성
ALTER TABLE orders ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 6. 최종 확인
SELECT COUNT(*) as total_after_cleanup FROM orders;