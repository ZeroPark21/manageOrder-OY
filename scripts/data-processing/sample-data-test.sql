-- 샘플 데이터 삽입 테스트 (선택사항)
-- 테이블이 올바르게 작동하는지 확인하기 위한 테스트 데이터

INSERT INTO orders (
  order_id,
  order_status,
  product_name,
  quantity,
  created_time,
  order_amount,
  country,
  product_category
) VALUES 
(
  123456789,
  'Shipped',
  'COLORGRAM Test Product',
  2,
  '2025-07-20 10:00:00',
  29.99,
  'United States',
  'Beauty'
);

-- 삽입된 데이터 확인
SELECT 
  id,
  order_id,
  product_name,
  quantity,
  created_time,
  uploaded_at
FROM orders 
WHERE order_id = 123456789;

-- 테스트 데이터 삭제
DELETE FROM orders WHERE order_id = 123456789;

-- 삭제 확인
SELECT COUNT(*) as "레코드수" FROM orders;
