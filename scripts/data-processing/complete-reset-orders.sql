-- orders 테이블 완전 초기화

-- 1. 모든 constraint 목록 확인
SELECT 
    tc.constraint_name, 
    tc.constraint_type
FROM 
    information_schema.table_constraints AS tc 
WHERE tc.table_name = 'orders' 
    AND tc.table_schema = 'public';

-- 2. 모든 constraint 제거
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_id_key;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_id_unique;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey CASCADE;

-- 3. 테이블 비우기
TRUNCATE TABLE orders;

-- 4. 시퀀스 리셋
ALTER SEQUENCE orders_id_seq RESTART WITH 1;

-- 5. Primary Key 재생성
ALTER TABLE orders ADD PRIMARY KEY (id);

-- 6. Unique constraint 생성
ALTER TABLE orders ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 7. 최종 확인
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'orders' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type;