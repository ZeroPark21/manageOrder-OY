-- 테스트 GMV 데이터 삽입
INSERT INTO gmv_daily_raw (
    gmv_date,
    campaign_id,
    campaign_name,
    video_id,
    video_title,
    creator_name,
    creator_id,
    gmv,
    orders,
    ad_spend,
    impressions,
    clicks,
    click_rate,
    conversion_rate,
    product_name,
    product_id
) VALUES
    ('2025-07-28', 'CAMP001', '여름 특별 캠페인', 'VID001', '신제품 소개 영상', '크리에이터A', 'CREATOR001', 1500000, 25, 150000, 50000, 2500, 0.05, 0.01, '제품A', 'PROD001'),
    ('2025-07-28', 'CAMP001', '여름 특별 캠페인', 'VID002', '사용 후기 영상', '크리에이터B', 'CREATOR002', 2000000, 30, 200000, 80000, 4000, 0.05, 0.0075, '제품A', 'PROD001'),
    ('2025-07-27', 'CAMP001', '여름 특별 캠페인', 'VID003', '라이브 방송', '크리에이터C', 'CREATOR003', 3500000, 50, 300000, 120000, 6000, 0.05, 0.0083, '제품B', 'PROD002'),
    ('2025-07-27', 'CAMP002', '신제품 런칭', 'VID004', '언박싱 영상', '크리에이터A', 'CREATOR001', 1200000, 20, 120000, 40000, 2000, 0.05, 0.01, '제품C', 'PROD003'),
    ('2025-07-26', 'CAMP001', '여름 특별 캠페인', 'VID005', '스타일링 팁', '크리에이터D', 'CREATOR004', 2800000, 40, 250000, 100000, 5000, 0.05, 0.008, '제품A', 'PROD001'),
    ('2025-07-26', 'CAMP002', '신제품 런칭', 'VID006', '비교 리뷰', '크리에이터E', 'CREATOR005', 1800000, 28, 180000, 60000, 3000, 0.05, 0.0093, '제품C', 'PROD003'),
    ('2025-07-25', 'CAMP001', '여름 특별 캠페인', 'VID007', '일주일 사용기', '크리에이터B', 'CREATOR002', 2200000, 35, 220000, 70000, 3500, 0.05, 0.01, '제품B', 'PROD002'),
    ('2025-07-25', 'CAMP001', '여름 특별 캠페인', 'VID008', 'Q&A 라이브', '크리에이터C', 'CREATOR003', 4000000, 60, 350000, 150000, 7500, 0.05, 0.008, '제품A', 'PROD001');

-- Materialized View 새로고침
REFRESH MATERIALIZED VIEW gmv_daily_summary;
REFRESH MATERIALIZED VIEW gmv_weekly_summary;
REFRESH MATERIALIZED VIEW gmv_monthly_summary;

-- 데이터 확인
SELECT * FROM gmv_daily_summary ORDER BY gmv_date DESC;