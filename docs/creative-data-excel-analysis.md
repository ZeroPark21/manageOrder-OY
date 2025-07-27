# Creative Data Excel File Analysis

## File Details
- **Filename**: creative data for product campaigns 2025-07-20 00 ~ 2025-07-26 20.xlsx
- **Total Rows**: 245
- **Sheet Name**: Sheet1

## Column Structure (22 columns)

### New Columns (compared to previous file)
1. **Campaign name** - Campaign identifier (e.g., "CG | GMV Max Gross Revenue | 250618")
2. **Campaign ID** - TikTok campaign ID (e.g., "1835244926321682")
3. **Product ID** - Product identifier (e.g., "1731294979214184689")
4. **Authorization type** - Authorization method (e.g., "TikTok Shop official account", "Affiliate mass authorization")

### Existing Columns
5. **Creative type** - Type of creative (e.g., "Video")
6. **Video title** - Full video title with hashtags
7. **Video ID** - Unique video identifier
8. **TikTok account** - Creator account name
9. **Status** - Delivery status (e.g., "Not delivering", "Unavailable", "In queue")
10. **Orders (SKU)** - Number of orders (numeric)
11. **Gross revenue** - Revenue amount (string format, e.g., "0.00")
12. **Product ad impressions** - Number of impressions (numeric)
13. **Product ad clicks** - Number of clicks (numeric)
14. **Product ad click rate** - Click rate (numeric, as decimal)
15. **Ad conversion rate** - Conversion rate (numeric, as decimal)
16. **2-second ad video view rate** - 2s view rate (numeric)
17. **6-second ad video view rate** - 6s view rate (numeric)
18. **25% ad video view rate** - 25% view rate (numeric)
19. **50% ad video view rate** - 50% view rate (numeric)
20. **75% ad video view rate** - 75% view rate (numeric)
21. **100% ad video view rate** - 100% view rate (numeric)
22. **Currency** - Currency code (e.g., "USD")

## Data Characteristics

### Campaign Information
- All 245 rows belong to a single campaign: "CG | GMV Max Gross Revenue | 250618"
- Single campaign ID: "1835244926321682"
- Multiple product IDs are used within the campaign

### Authorization Types
- "TikTok Shop official account"
- "Affiliate mass authorization"

### Status Values
- "Not delivering"
- "Unavailable" 
- "In queue"
- "Delivering"

### Data Types
- **String fields**: Campaign name, Campaign ID, Product ID, Creative type, Video title, Video ID, TikTok account, Status, Authorization type, Gross revenue, Currency
- **Numeric fields**: Orders (SKU), Product ad impressions/clicks, all rate fields

## Required Database Updates

### Supabase Table Changes
The following columns need to be added to the `gmv_data` table:
1. `campaign_name` (TEXT)
2. `campaign_id` (TEXT)
3. `product_id` (TEXT)
4. `authorization_type` (TEXT)

### Indexes
- Index on `campaign_name`
- Index on `campaign_id`
- Index on `product_id`
- Composite index on `campaign_id, tiktok_account`

## UI Updates Required

### Creator Details Page
1. Add campaign filter dropdown using `campaign_name` field
2. Display campaign information in summary cards
3. Add authorization type to video details table
4. Update grouping logic to handle campaign-based filtering
5. Show product ID in video details