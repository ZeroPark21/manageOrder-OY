-- role 컬럼이 이미 있다면 체크 제약조건만 업데이트
DO $$
BEGIN
    -- role 컬럼이 없는 경우에만 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_companies'
                   AND column_name = 'role') THEN
        ALTER TABLE user_companies
        ADD COLUMN role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin'));
    END IF;
END $$;

-- bang@cosduck.com 사용자의 role을 admin으로 설정
UPDATE user_companies
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'bang@cosduck.com'
) AND (role IS NULL OR role != 'admin');

-- role 컬럼에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_companies_role ON user_companies(role);

-- RLS 정책 업데이트: role 기반 접근 제어
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own company associations" ON user_companies;
DROP POLICY IF EXISTS "Users can only insert their own associations" ON user_companies;

-- 새로운 정책 생성
CREATE POLICY "Users can view their own company associations"
ON user_companies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admin users can manage company associations"
ON user_companies FOR ALL
USING (
  auth.uid() = user_id AND role = 'admin'
);

-- companies 테이블에 대한 권한 정책
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;

CREATE POLICY "Users can view companies they belong to"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = companies.id
    AND user_companies.user_id = auth.uid()
  )
);

-- orders 테이블에 대한 권한 정책 (role 기반)
DROP POLICY IF EXISTS "Users can view orders for their companies" ON orders;

CREATE POLICY "Users can view orders for their companies"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = orders.company_id
    AND user_companies.user_id = auth.uid()
  )
);

CREATE POLICY "Admin and editor can manage orders"
ON orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = orders.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- contents 테이블에 대한 권한 정책
DROP POLICY IF EXISTS "Users can view contents for their companies" ON contents;

CREATE POLICY "Users can view contents for their companies"
ON contents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = contents.company_id
    AND user_companies.user_id = auth.uid()
  )
);

CREATE POLICY "Admin and editor can manage contents"
ON contents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = contents.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);