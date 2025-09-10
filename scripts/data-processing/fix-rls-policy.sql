-- RLS 정책 확인 및 수정
-- Supabase SQL Editor에서 실행하세요

-- orders 테이블의 RLS 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'orders';

-- RLS가 활성화되어 있다면 비활성화
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 또는 모든 작업을 허용하는 정책 생성 (RLS를 유지하고 싶다면)
-- DROP POLICY IF EXISTS "Allow all operations" ON public.orders;
-- CREATE POLICY "Allow all operations" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 테이블 권한 확인
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'orders';

-- anon 역할에 모든 권한 부여 (필요한 경우)
GRANT ALL ON public.orders TO anon;
GRANT ALL ON public.orders TO authenticated;

-- 시퀀스 권한도 부여
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.orders_id_seq TO authenticated;
