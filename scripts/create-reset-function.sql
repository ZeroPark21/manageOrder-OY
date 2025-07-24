-- 시퀀스 리셋 함수 생성 (Supabase SQL Editor에서 실행)
CREATE OR REPLACE FUNCTION reset_orders_sequence()
RETURNS void AS $$
BEGIN
  -- orders 테이블의 id 시퀀스를 1로 리셋
  PERFORM setval('orders_id_seq', 1, false);
END;
$$ LANGUAGE plpgsql;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION reset_orders_sequence() TO anon;
GRANT EXECUTE ON FUNCTION reset_orders_sequence() TO authenticated;
