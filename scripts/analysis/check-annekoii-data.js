const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAnnekoiiData() {
  console.log('Checking @annekoii data in database...\n');

  try {
    // First, check table structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('contents')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('Available columns:', Object.keys(sampleData[0]));
      console.log('\n');
    }

    // Check in contents table - searching in all text fields
    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .select('*')
      .or('creator_name.ilike.%annekoii%,content_title.ilike.%annekoii%')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (contentsError) {
      console.error('Error fetching from contents:', contentsError);
    } else {
      console.log('Found', contents.length, 'records for @annekoii in contents table:');
      contents.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log('  Creator:', record.creator_name || 'N/A');
        console.log('  Content Title:', record.content_title || 'N/A');
        console.log('  Commission: $' + (record.est_commission || 'N/A'));
        console.log('  GMV: $' + (record.gmv || 'N/A'));
        console.log('  Publish Date:', record.publish_date);
        console.log('  Updated At:', record.updated_at);
        console.log('  Video Link:', record.video_link);
      });
    }

    // Check for different commission values
    const { data: uniqueCommissions, error: commError } = await supabase
      .from('contents')
      .select('*')
      .or('creator_name.ilike.%annekoii%,content_title.ilike.%annekoii%');

    if (!commError && uniqueCommissions) {
      const commissionValues = [...new Set(uniqueCommissions.map(r => r.commission || r.est_commission))];
      console.log('\n\nUnique commission values for @annekoii:', commissionValues);
      
      // Check if $121.79 exists
      const has12179 = commissionValues.some(val => parseFloat(val) === 121.79);
      const has3814 = commissionValues.some(val => parseFloat(val) === 38.14);
      
      console.log('\nHas $121.79:', has12179);
      console.log('Has $38.14:', has3814);
    }

    // Check the most recent upload
    const { data: latestUpload, error: latestError } = await supabase
      .from('contents')
      .select('*')
      .or('creator_name.ilike.%annekoii%,content_title.ilike.%annekoii%')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestError && latestUpload) {
      console.log('\n\nMost recent @annekoii record:');
      console.log('  Updated At:', latestUpload.updated_at);
      console.log('  Commission:', '$' + (latestUpload.est_commission));
      console.log('  GMV:', '$' + latestUpload.gmv);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAnnekoiiData();