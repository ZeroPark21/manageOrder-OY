-- 모든 잘못된 UNIQUE 제약 제거
ALTER TABLE contents
DROP CONSTRAINT IF EXISTS contents_video_link_key;

ALTER TABLE contents
DROP CONSTRAINT IF EXISTS idx_contents_unique_combination;

ALTER TABLE contents
DROP CONSTRAINT IF EXISTS contents_video_link_company_unique;

-- 올바른 UNIQUE 제약 추가 (video_link + company_id 조합)
ALTER TABLE contents
ADD CONSTRAINT contents_video_link_company_unique
UNIQUE (video_link, company_id);

-- 모든 잘못된 인덱스 제거
DROP INDEX IF EXISTS idx_contents_video_link;
DROP INDEX IF EXISTS idx_contents_unique_combination;
DROP INDEX IF EXISTS idx_contents_video_link_company;

-- 올바른 인덱스 생성
CREATE INDEX idx_contents_video_link_company
ON contents(video_link, company_id);

-- 확인
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'contents'::regclass
AND contype = 'u';