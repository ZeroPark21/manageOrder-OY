-- orders 테이블 정리 및 재설정

-- 1. 현재 중복 데이터 확인
SELECT order_id, COUNT(*) as count
FROM orders
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- 2. 전체 레코드 수 확인
SELECT COUNT(*) as total_records FROM orders;

-- 3. 고유한 order_id 수 확인
SELECT COUNT(DISTINCT order_id) as unique_orders FROM orders;

-- 4. unique constraint 제거
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_order_id_unique;

-- 5. 중복 제거 - 각 order_id별로 가장 최근 레코드만 유지
DELETE FROM orders a
USING (
    SELECT order_id, MAX(id) as max_id
    FROM orders
    GROUP BY order_id
    HAVING COUNT(*) > 1
) b
WHERE a.order_id = b.order_id 
AND a.id < b.max_id;

-- 6. 정리 후 확인
SELECT COUNT(*) as total_after_cleanup FROM orders;

-- 7. unique constraint 다시 추가
ALTER TABLE orders 
ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 8. 최종 확인
SELECT 
    'Total Records' as metric,
    COUNT(*) as count
FROM orders
UNION ALL
SELECT 
    'Unique Order IDs' as metric,
    COUNT(DISTINCT order_id) as count
FROM orders;