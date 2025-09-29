-- companies 테이블의 RLS 활성화 확인
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to view companies" ON companies;

-- 새로운 정책: 인증된 사용자는 모든 회사 정보를 볼 수 있음
-- (회사 이름은 공개 정보로 간주)
CREATE POLICY "Allow authenticated users to view all companies"
ON companies FOR SELECT
TO authenticated
USING (true);

-- admin 사용자는 회사 정보를 수정할 수 있음
CREATE POLICY "Admin users can manage companies"
ON companies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.role = 'admin'
  )
);
