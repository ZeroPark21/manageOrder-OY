-- orders 테이블 초기화 스크립트

-- 1. 현재 데이터 수 확인
SELECT COUNT(*) as total_before FROM orders;

-- 2. constraint 제거
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_id_unique;

-- 3. 테이블 비우기
TRUNCATE TABLE orders;

-- 4. 시퀀스 리셋
ALTER SEQUENCE orders_id_seq RESTART WITH 1;

-- 5. constraint 재생성
ALTER TABLE orders ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- 6. 확인
SELECT COUNT(*) as total_after FROM orders;