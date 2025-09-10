import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
    const { date, data, excelData, fileType } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    let processedData: any[] = [];

    // Handle Excel file processing
    if (fileType === 'excel' && excelData) {
      console.log(`Processing Excel file for date ${date}`);
      
      try {
        // Decode base64 data
        const binaryString = atob(excelData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Parse Excel file
        const workbook = XLSX.read(bytes, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const excelJsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log(`Parsed ${excelJsonData.length} rows from Excel file`);
        
        processedData = excelJsonData;
        
      } catch (error) {
        console.error('Error processing Excel file:', error);
        return NextResponse.json(
          { error: 'Failed to process Excel file', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        );
      }
    }
    // Handle CSV/JSON data
    else if (data && Array.isArray(data)) {
      console.log(`Processing ${data.length} rows for date ${date}`);
      processedData = data;
    }
    else {
      return NextResponse.json(
        { error: 'Invalid request data - either data array or excelData is required' },
        { status: 400 }
      );
    }

    // Transform data for gmv_data table - Updated for actual TikTok data structure
    const transformedData = processedData.map(row => {
      console.log('Processing row:', row);
      
      return {
        // Campaign data - map actual columns from TikTok export
        campaign_name: row['Campaign name'] || '',
        campaign_id: row['Campaign ID'] || '',
        
        // Use Campaign ID as video_id for compatibility with existing structure
        video_id: row['Campaign ID'] || '',
        video_title: row['Campaign name'] || '',
        tiktok_account: 'TikTok Ads Campaign',
        creative_type: 'Campaign',
        status: 'Active',
        
        // Financial metrics from actual TikTok data
        orders: parseInt(row['Orders (SKU)'] || '0'),
        gross_revenue: parseFloat(row['Gross revenue'] || '0'),
        cost: parseFloat(row['Cost'] || '0'),
        net_cost: parseFloat(row['Net Cost'] || '0'),
        cost_per_order: parseFloat(row['Cost per order'] || '0'),
        roi: parseFloat(row['ROI'] || '0'),
        
        // Map to existing columns for compatibility
        ad_impressions: 0, // Not provided in campaign data
        ad_clicks: 0, // Not provided in campaign data
        ad_click_rate: 0, // Not provided in campaign data
        ad_conversion_rate: row['ROI'] ? parseFloat(row['ROI']) * 100 : 0,
        
        // Revenue mapping
        revenue: parseFloat(row['Gross revenue'] || '0'),
        roas: row['ROI'] ? parseFloat(row['ROI']) : 0,
        
        // Additional TikTok-specific fields
        units_sold: parseInt(row['Orders (SKU)'] || '0'),
        
        // Metadata
        currency: row['Currency'] || 'USD',
        download_date: date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_date: date,
        data_source: 'tiktok_ads_campaign',
        
        // Store full row as JSON for reference
        raw_data: JSON.stringify(row)
      };
    });

    console.log('Transformed data sample:', transformedData[0]);

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
        status: 'success',
        file_type: fileType || 'csv'
      });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${transformedData.length} rows for ${date} (${fileType || 'CSV'} file)`,
      rowsInserted: transformedData.length,
      fileType: fileType || 'csv'
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