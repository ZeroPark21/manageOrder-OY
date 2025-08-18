import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, data } = body;

    if (!date || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.log(`Processing ${data.length} rows for date ${date}`);

    // Transform data for gmv_data table
    const transformedData = data.map(row => {
      return {
        // Map CSV columns to database columns - TikTok Ads specific
        campaign_name: row['Campaign name'] || row['campaign_name'] || '',
        campaign_id: row['Campaign ID'] || row['campaign_id'] || '',
        ad_group_name: row['Ad group name'] || row['ad_group_name'] || '',
        ad_group_id: row['Ad group ID'] || row['ad_group_id'] || '',
        ad_name: row['Ad name'] || row['ad_name'] || '',
        ad_id: row['Ad ID'] || row['ad_id'] || '',
        
        // Map to existing gmv_data columns
        video_id: row['Ad ID'] || row['ad_id'] || '', // Use ad_id as video_id
        video_title: row['Ad name'] || row['ad_name'] || '',
        tiktok_account: row['Account'] || row['account'] || 'TikTok Ads',
        creative_type: row['Creative type'] || row['creative_type'] || 'Ad',
        status: row['Status'] || row['status'] || 'Active',
        
        // Metrics - map to existing columns
        orders: parseInt(row['Orders'] || row['orders'] || '0'),
        gross_revenue: parseFloat(row['GMV'] || row['Revenue'] || row['revenue'] || '0'),
        ad_impressions: parseInt(row['Impressions'] || row['impressions'] || '0'),
        ad_clicks: parseInt(row['Clicks'] || row['clicks'] || '0'),
        ad_click_rate: parseFloat(row['CTR (%)'] || row['ctr'] || '0'),
        ad_conversion_rate: parseFloat(row['CVR (%)'] || row['conversion_rate'] || '0'),
        
        // New columns for TikTok Ads
        impressions: parseInt(row['Impressions'] || row['impressions'] || '0'),
        clicks: parseInt(row['Clicks'] || row['clicks'] || '0'),
        ctr: parseFloat(row['CTR (%)'] || row['ctr'] || '0'),
        conversions: parseInt(row['Conversions'] || row['conversions'] || '0'),
        conversion_rate: parseFloat(row['CVR (%)'] || row['conversion_rate'] || '0'),
        
        // Cost and Revenue
        cost: parseFloat(row['Cost'] || row['cost'] || '0'),
        cpc: parseFloat(row['CPC'] || row['cpc'] || '0'),
        cpm: parseFloat(row['CPM'] || row['cpm'] || '0'),
        revenue: parseFloat(row['GMV'] || row['Revenue'] || row['revenue'] || '0'),
        roas: parseFloat(row['ROAS'] || row['roas'] || '0'),
        
        // Additional fields
        units_sold: parseInt(row['Units sold'] || row['units_sold'] || '0'),
        
        // Metadata
        currency: row['Currency'] || 'USD',
        download_date: date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_date: date, // The date this data represents
        data_source: 'tiktok_ads', // Identify this as TikTok Ads data
        
        // Store full row as JSON for reference
        raw_data: JSON.stringify(row)
      };
    });

    // Delete existing data for this date (to avoid duplicates)
    const { error: deleteError } = await supabase
      .from('gmv_data')
      .delete()
      .eq('data_date', date)
      .eq('data_source', 'tiktok_ads');

    if (deleteError) {
      console.error('Error deleting existing data:', deleteError);
    }

    // Insert new data
    const { data: insertedData, error: insertError } = await supabase
      .from('gmv_data')
      .insert(transformedData);

    if (insertError) {
      console.error('Error inserting data:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert data', details: insertError },
        { status: 500 }
      );
    }

    // Log the upload
    await supabase
      .from('tiktok_ads_upload_logs')
      .insert({
        upload_date: new Date().toISOString(),
        data_date: date,
        rows_count: transformedData.length,
        status: 'success'
      });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${transformedData.length} rows for ${date}`,
      rowsInserted: transformedData.length
    });

  } catch (error) {
    console.error('Error in tiktok-ads-upload:', error);
    
    // Log the error
    try {
      await supabase
        .from('tiktok_ads_upload_logs')
        .insert({
          upload_date: new Date().toISOString(),
          data_date: body?.date || 'unknown',
          rows_count: 0,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (logError) {
      console.error('Error logging upload error:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check upload status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!date) {
      // Return recent upload logs
      const { data, error } = await supabase
        .from('tiktok_ads_upload_logs')
        .select('*')
        .order('upload_date', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ logs: data });
    }

    // Check if data exists for specific date
    const { data, error, count } = await supabase
      .from('gmv_data')
      .select('*', { count: 'exact', head: true })
      .eq('data_date', date)
      .eq('data_source', 'tiktok_ads');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      date,
      hasData: count && count > 0,
      rowCount: count || 0
    });

  } catch (error) {
    console.error('Error in GET tiktok-ads-upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}