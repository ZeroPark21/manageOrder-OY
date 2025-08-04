-- contents 테이블의 video_link 컬럼에 unique constraint 추가
-- 이미 존재하는 constraint는 무시
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'contents_video_link_key'
    ) THEN
        ALTER TABLE contents 
        ADD CONSTRAINT contents_video_link_key UNIQUE (video_link);
    END IF;
END $$;

-- 인덱스 생성 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_contents_video_link 
ON contents(video_link);

-- 확인
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'contents'::regclass 
AND conname = 'contents_video_link_key';