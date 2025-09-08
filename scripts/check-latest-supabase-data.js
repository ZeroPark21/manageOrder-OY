const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkLatestSupabaseData() {
  console.log('Checking latest @annekoii data in Supabase...\n');
  console.log('Checking data uploaded at:', new Date().toISOString());
  console.log('\n');

  try {
    // Get all annekoii data from database
    const { data: allData, error } = await supabase
      .from('contents')
      .select('*')
      .ilike('creator_name', '%annekoii%')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    console.log(`Total @annekoii records in database: ${allData.length}`);
    
    // Group by updated_at date to see upload batches
    const uploadBatches = {};
    allData.forEach(record => {
      const uploadDate = record.updated_at?.substring(0, 10) || 'unknown';
      if (!uploadBatches[uploadDate]) {
        uploadBatches[uploadDate] = [];
      }
      uploadBatches[uploadDate].push(record);
    });
    
    console.log('\n=== Upload Batches by Date ===');
    Object.entries(uploadBatches)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([date, records]) => {
        console.log(`${date}: ${records.length} records`);
      });
    
    // Calculate totals
    let totalLikes = 0;
    let totalComments = 0;
    let totalGMV = 0;
    let totalCommission = 0;
    
    console.log('\n=== All @annekoii Records (sorted by update date) ===\n');
    allData.forEach((record, index) => {
      if (index < 10) { // Show first 10 records
        console.log(`${index + 1}. ${record.content_title?.substring(0, 40)}...`);
        console.log(`   Publish Date: ${record.publish_date}`);
        console.log(`   Likes: ${record.like_count}, Comments: ${record.comment_count}`);
        console.log(`   GMV: $${record.gmv}, Commission: $${record.est_commission}`);
        console.log(`   Updated: ${record.updated_at}`);
        console.log('');
      }
      
      totalLikes += Number(record.like_count) || 0;
      totalComments += Number(record.comment_count) || 0;
      totalGMV += Number(record.gmv) || 0;
      totalCommission += Number(record.est_commission) || 0;
    });
    
    if (allData.length > 10) {
      console.log(`... and ${allData.length - 10} more records\n`);
    }
    
    console.log('=== CURRENT TOTALS IN DATABASE ===');
    console.log(`Total Records: ${allData.length}`);
    console.log(`Total Likes: ${totalLikes}`);
    console.log(`Total Comments: ${totalComments}`);
    console.log(`Total GMV: $${totalGMV.toFixed(2)}`);
    console.log(`Total Commission: $${totalCommission.toFixed(2)}`);
    
    console.log('\n=== EXPECTED VALUES (from user) ===');
    console.log('Expected Total Likes: 496');
    console.log('Expected Total Comments: 17');
    
    console.log('\n=== DIFFERENCE ===');
    console.log(`Likes difference: ${496 - totalLikes} (need to add)`);
    console.log(`Comments difference: ${17 - totalComments} (need to add)`);
    
    // Check for most recent upload
    const mostRecent = allData[0];
    if (mostRecent) {
      console.log('\n=== Most Recently Updated Record ===');
      console.log('Title:', mostRecent.content_title);
      console.log('Updated at:', mostRecent.updated_at);
      console.log('Created at:', mostRecent.created_at);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLatestSupabaseData();