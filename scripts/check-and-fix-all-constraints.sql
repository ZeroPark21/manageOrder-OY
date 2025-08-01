-- orders 테이블의 모든 constraint 확인 및 정리

-- 1. 현재 모든 constraint 확인
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
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 2. 모든 UNIQUE constraint 제거
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'orders' 
        AND constraint_type = 'UNIQUE'
        AND table_schema = 'public'
    )
    LOOP
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
    END LOOP;
END $$;

-- 3. 현재 중복 확인
SELECT order_id, COUNT(*) as count
FROM orders
GROUP BY order_id
HAVING COUNT(*) > 1
LIMIT 10;

-- 4. 중복 제거 (최신 것만 유지)
DELETE FROM orders a
USING (
    SELECT order_id, MAX(id) as max_id
    FROM orders
    GROUP BY order_id
    HAVING COUNT(*) > 1
) b
WHERE a.order_id = b.order_id 
AND a.id < b.max_id;

-- 5. 올바른 unique constraint 하나만 추가
ALTER TABLE orders 
ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 6. 최종 확인
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
    AND tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public';

-- 7. 테이블 상태 확인
SELECT 
    'Total Records' as metric,
    COUNT(*) as count
FROM orders
UNION ALL
SELECT 
    'Unique Order IDs' as metric,
    COUNT(DISTINCT order_id) as count
FROM orders;