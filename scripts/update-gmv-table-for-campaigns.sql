-- Add new columns to gmv_data table for campaign information
-- These columns are new in the latest Excel file format

-- Add campaign-related columns
ALTER TABLE gmv_data 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS authorization_type TEXT;

-- Create indexes for new campaign-related columns
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_name ON gmv_data(campaign_name);
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_id ON gmv_data(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_product_id ON gmv_data(product_id);
CREATE INDEX IF NOT EXISTS idx_gmv_data_authorization_type ON gmv_data(authorization_type);

-- Add composite index for campaign and account queries
CREATE INDEX IF NOT EXISTS idx_gmv_data_campaign_account ON gmv_data(campaign_id, tiktok_account);

-- Update column comments (for documentation)
COMMENT ON COLUMN gmv_data.campaign_name IS 'Campaign name (e.g., "CG | GMV Max Gross Revenue | 250618")';
COMMENT ON COLUMN gmv_data.campaign_id IS 'TikTok campaign ID';
COMMENT ON COLUMN gmv_data.product_id IS 'TikTok product ID';
COMMENT ON COLUMN gmv_data.authorization_type IS 'Authorization type (e.g., "TikTok Shop official account", "Affiliate mass authorization")';