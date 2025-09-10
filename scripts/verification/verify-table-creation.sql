-- 테이블 생성 검증 쿼리
-- 이 쿼리들을 실행하여 테이블이 올바르게 생성되었는지 확인하세요

-- 1. 테이블 존재 확인
SELECT 
  table_name,
  table_type,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'orders' AND table_schema = 'public';

-- 2. 컬럼 정보 확인
SELECT 
  ordinal_position as "순서",
  column_name as "컬럼명",
  data_type as "데이터타입",
  character_maximum_length as "최대길이",
  is_nullable as "NULL허용",
  column_default as "기본값"
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 인덱스 확인
SELECT 
  indexname as "인덱스명",
  indexdef as "인덱스정의"
FROM pg_indexes 
WHERE tablename = 'orders' AND schemaname = 'public'
ORDER BY indexname;

-- 4. 제약조건 확인
SELECT 
  constraint_name as "제약조건명",
  constraint_type as "타입"
FROM information_schema.table_constraints 
WHERE table_name = 'orders' AND table_schema = 'public';

-- 5. 권한 확인
SELECT 
  grantee as "사용자",
  privilege_type as "권한"
FROM information_schema.role_table_grants 
WHERE table_name = 'orders' AND table_schema = 'public';

-- 6. 함수 존재 확인
SELECT 
  routine_name as "함수명",
  routine_type as "타입"
FROM information_schema.routines 
WHERE routine_name = 'reset_orders_sequence' AND routine_schema = 'public';

-- 7. 테이블 크기 확인 (생성 직후에는 0)
SELECT 
  pg_size_pretty(pg_total_relation_size('orders')) as "테이블크기",
  pg_size_pretty(pg_relation_size('orders')) as "데이터크기",
  pg_size_pretty(pg_total_relation_size('orders') - pg_relation_size('orders')) as "인덱스크기";
