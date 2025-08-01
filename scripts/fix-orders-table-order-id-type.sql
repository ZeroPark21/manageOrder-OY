-- orders 테이블의 order_id 타입을 TEXT로 변경하여 JavaScript 정밀도 문제 해결

-- 1. 먼저 현재 order_id 타입 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'orders' 
    AND column_name = 'order_id';

-- 2. unique constraint 임시 제거
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_order_id_unique;

-- 3. order_id 타입을 TEXT로 변경
ALTER TABLE orders 
ALTER COLUMN order_id TYPE TEXT USING order_id::TEXT;

-- 4. unique constraint 다시 추가
ALTER TABLE orders 
ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 5. 변경 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'orders' 
    AND column_name = 'order_id';

-- 6. constraint 확인
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