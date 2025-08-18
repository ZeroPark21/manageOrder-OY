-- ⚠️ WARNING: This will delete all existing data in gmv_data table
-- Make sure to backup data if needed before running this

-- Step 1: Delete all existing data from gmv_data table
TRUNCATE TABLE public.gmv_data;

-- Step 2: Add new columns for TikTok Ads data (if they don't exist)
ALTER TABLE public.gmv_data 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS ad_group_name TEXT,
ADD COLUMN IF NOT EXISTS ad_group_id TEXT,
ADD COLUMN IF NOT EXISTS ad_name TEXT,
ADD COLUMN IF NOT EXISTS ad_id TEXT,
ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpc DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cpm DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS roas DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS units_sold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_date DATE,
ADD COLUMN IF NOT EXISTS download_date DATE,
ADD COLUMN IF NOT EXISTS raw_data JSONB,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'tiktok_ads';

-- Step 3: Update existing columns to handle TikTok Ads data better
ALTER TABLE public.gmv_data 
ALTER COLUMN gross_revenue TYPE DECIMAL(15, 2),
ALTER COLUMN ad_click_rate TYPE DECIMAL(10, 4),
ALTER COLUMN ad_conversion_rate TYPE DECIMAL(10, 4);

-- Step 4: Create new indexes for TikTok Ads data
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_id ON public.gmv_data(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_ad_group_id ON public.gmv_data(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_ad_id ON public.gmv_data(ad_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_data_date ON public.gmv_data(data_date);
CREATE INDEX IF NOT EXISTS idx_gmv_data_data_source ON public.gmv_data(data_source);

-- Step 5: Create a unique constraint to prevent duplicate uploads
ALTER TABLE public.gmv_data 
DROP CONSTRAINT IF EXISTS unique_tiktok_ad_date;

ALTER TABLE public.gmv_data 
ADD CONSTRAINT unique_tiktok_ad_date 
UNIQUE NULLS NOT DISTINCT (ad_id, data_date);

-- Step 6: Create a view for TikTok Ads daily summary
CREATE OR REPLACE VIEW public.tiktok_ads_daily_summary AS
SELECT 
    data_date,
    COUNT(DISTINCT campaign_id) as total_campaigns,
    COUNT(DISTINCT ad_group_id) as total_ad_groups,
    COUNT(DISTINCT ad_id) as total_ads,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    CASE 
        WHEN SUM(impressions) > 0 
        THEN ROUND((SUM(clicks)::DECIMAL / SUM(impressions)) * 100, 4)
        ELSE 0 
    END as overall_ctr,
    SUM(conversions) as total_conversions,
    SUM(cost) as total_cost,
    SUM(revenue) as total_revenue,
    CASE 
        WHEN SUM(cost) > 0 
        THEN ROUND(SUM(revenue) / SUM(cost), 2)
        ELSE 0 
    END as overall_roas,
    SUM(orders) as total_orders,
    SUM(units_sold) as total_units_sold
FROM 
    public.gmv_data
WHERE 
    data_source = 'tiktok_ads'
GROUP BY 
    data_date
ORDER BY 
    data_date DESC;

-- Step 7: Create upload logs table (if not exists)
CREATE TABLE IF NOT EXISTS public.tiktok_ads_upload_logs (
    id BIGSERIAL PRIMARY KEY,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_date DATE,
    rows_count INTEGER DEFAULT 0,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Create indexes for upload logs
CREATE INDEX IF NOT EXISTS idx_upload_logs_data_date ON public.tiktok_ads_upload_logs(data_date);
CREATE INDEX IF NOT EXISTS idx_upload_logs_status ON public.tiktok_ads_upload_logs(status);

-- Step 9: Grant permissions
GRANT ALL ON public.gmv_data TO authenticated;
GRANT ALL ON public.tiktok_ads_upload_logs TO authenticated;
GRANT SELECT ON public.tiktok_ads_daily_summary TO authenticated;

-- Step 10: Update RLS policies if needed
DROP POLICY IF EXISTS "Enable read access for all users" ON public.gmv_data;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.gmv_data;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.gmv_data;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.gmv_data;

CREATE POLICY "Enable read access for all users" ON public.gmv_data
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.gmv_data
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.gmv_data
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.gmv_data
    FOR DELETE USING (true);

-- Display confirmation
SELECT 'gmv_data table has been cleared and updated for TikTok Ads data storage' as status;