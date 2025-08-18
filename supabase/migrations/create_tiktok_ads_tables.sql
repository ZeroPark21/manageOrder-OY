-- Create GMV_Max table for TikTok Ads data if not exists
CREATE TABLE IF NOT EXISTS public.GMV_Max (
    id BIGSERIAL PRIMARY KEY,
    
    -- Campaign information
    campaign_name TEXT,
    campaign_id TEXT,
    ad_group_name TEXT,
    ad_group_id TEXT,
    ad_name TEXT,
    ad_id TEXT,
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(10, 2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(10, 2) DEFAULT 0,
    
    -- Cost metrics
    cost DECIMAL(15, 2) DEFAULT 0,
    cpc DECIMAL(10, 2) DEFAULT 0,
    cpm DECIMAL(10, 2) DEFAULT 0,
    
    -- Revenue metrics
    revenue DECIMAL(15, 2) DEFAULT 0,
    roas DECIMAL(10, 2) DEFAULT 0,
    orders INTEGER DEFAULT 0,
    units_sold INTEGER DEFAULT 0,
    
    -- Date tracking
    data_date DATE, -- The date this data represents
    download_date DATE, -- When this data was downloaded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Store raw data for reference
    raw_data JSONB,
    
    -- Indexes for performance
    CONSTRAINT unique_ad_date UNIQUE (ad_id, data_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gmv_max_data_date ON public.GMV_Max(data_date);
CREATE INDEX IF NOT EXISTS idx_gmv_max_campaign_id ON public.GMV_Max(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmv_max_ad_group_id ON public.GMV_Max(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_gmv_max_ad_id ON public.GMV_Max(ad_id);
CREATE INDEX IF NOT EXISTS idx_gmv_max_created_at ON public.GMV_Max(created_at);

-- Create upload logs table
CREATE TABLE IF NOT EXISTS public.tiktok_ads_upload_logs (
    id BIGSERIAL PRIMARY KEY,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_date DATE,
    rows_count INTEGER DEFAULT 0,
    status TEXT, -- 'success', 'error', 'partial'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for upload logs
CREATE INDEX IF NOT EXISTS idx_upload_logs_data_date ON public.tiktok_ads_upload_logs(data_date);
CREATE INDEX IF NOT EXISTS idx_upload_logs_status ON public.tiktok_ads_upload_logs(status);

-- Create a view for daily aggregated data
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
        THEN ROUND((SUM(clicks)::DECIMAL / SUM(impressions)) * 100, 2)
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
    public.GMV_Max
GROUP BY 
    data_date
ORDER BY 
    data_date DESC;

-- Create RLS policies if needed
ALTER TABLE public.GMV_Max ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_ads_upload_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view GMV_Max" 
    ON public.GMV_Max 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to insert GMV_Max" 
    ON public.GMV_Max 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update GMV_Max" 
    ON public.GMV_Max 
    FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to delete GMV_Max" 
    ON public.GMV_Max 
    FOR DELETE 
    TO authenticated 
    USING (true);

-- Policies for upload logs
CREATE POLICY "Allow authenticated users to view upload logs" 
    ON public.tiktok_ads_upload_logs 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to insert upload logs" 
    ON public.tiktok_ads_upload_logs 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Grant permissions for service role
GRANT ALL ON public.GMV_Max TO service_role;
GRANT ALL ON public.tiktok_ads_upload_logs TO service_role;
GRANT ALL ON public.tiktok_ads_daily_summary TO service_role;

-- Grant permissions for authenticated users
GRANT ALL ON public.GMV_Max TO authenticated;
GRANT ALL ON public.tiktok_ads_upload_logs TO authenticated;
GRANT SELECT ON public.tiktok_ads_daily_summary TO authenticated;