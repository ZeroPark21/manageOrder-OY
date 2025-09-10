-- gmv_data 테이블의 unique constraint 추가
-- video_id를 기준으로 unique constraint 설정

-- 1. 먼저 중복된 video_id가 있는지 확인
SELECT video_id, COUNT(*) as count
FROM gmv_data
GROUP BY video_id
HAVING COUNT(*) > 1;

-- 2. 중복이 있다면 최신 것만 남기고 삭제
DELETE FROM gmv_data a
USING gmv_data b
WHERE a.id < b.id
AND a.video_id = b.video_id;

-- 3. video_id에 unique constraint 추가
ALTER TABLE gmv_data 
ADD CONSTRAINT gmv_data_video_id_unique UNIQUE (video_id);

-- 4. 확인
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'gmv_data' 
    AND tc.constraint_type = 'UNIQUE';