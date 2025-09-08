const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyCreatorAggregation() {
  console.log('Verifying creator data aggregation...\n');

  try {
    // Get all contents data
    const { data: contents, error } = await supabase
      .from('contents')
      .select('*')
      .order('creator_name');

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    console.log('Total records:', contents.length);

    // Group by creator
    const creatorStats = {};
    
    contents.forEach(content => {
      const creator = content.creator_name;
      if (!creator) return;

      if (!creatorStats[creator]) {
        creatorStats[creator] = {
          creator: creator,
          videoCount: 0,
          totalGmv: 0,
          totalCommission: 0,
          totalOrders: 0,
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          videos: []
        };
      }

      creatorStats[creator].videoCount++;
      creatorStats[creator].totalGmv += Number(content.gmv) || 0;
      creatorStats[creator].totalCommission += Number(content.est_commission) || 0;
      creatorStats[creator].totalOrders += Number(content.affiliate_orders) || 0;
      creatorStats[creator].totalImpressions += Number(content.shoppable_impressions) || 0;
      creatorStats[creator].totalLikes += Number(content.like_count) || 0;
      creatorStats[creator].totalComments += Number(content.comment_count) || 0;
      creatorStats[creator].videos.push({
        title: content.content_title,
        gmv: content.gmv,
        commission: content.est_commission,
        ctr: content.affiliate_ctr
      });
    });

    // Sort by total GMV
    const sortedCreators = Object.values(creatorStats)
      .sort((a, b) => b.totalGmv - a.totalGmv);

    // Display top 10 creators
    console.log('\nTop 10 Creators by GMV:');
    console.log('========================\n');
    
    sortedCreators.slice(0, 10).forEach((creator, index) => {
      console.log(`${index + 1}. ${creator.creator}`);
      console.log(`   Videos: ${creator.videoCount}`);
      console.log(`   Total GMV: $${creator.totalGmv.toFixed(2)}`);
      console.log(`   Total Commission: $${creator.totalCommission.toFixed(2)}`);
      console.log(`   Total Orders: ${creator.totalOrders}`);
      console.log(`   Total Impressions: ${creator.totalImpressions.toLocaleString()}`);
      console.log(`   Total Likes: ${creator.totalLikes.toLocaleString()}`);
      console.log(`   Total Comments: ${creator.totalComments.toLocaleString()}`);
      
      // Calculate average CTR
      const validCtrs = creator.videos
        .map(v => Number(v.ctr))
        .filter(ctr => !isNaN(ctr) && ctr > 0);
      const avgCtr = validCtrs.length > 0 
        ? (validCtrs.reduce((sum, ctr) => sum + ctr, 0) / validCtrs.length).toFixed(2)
        : 0;
      console.log(`   Average CTR: ${avgCtr}%`);
      console.log('');
    });

    // Check annekoii specifically
    const annekoii = creatorStats['annekoii'];
    if (annekoii) {
      console.log('\n@annekoii Statistics:');
      console.log('=====================');
      console.log(`Videos: ${annekoii.videoCount}`);
      console.log(`Total GMV: $${annekoii.totalGmv.toFixed(2)}`);
      console.log(`Total Commission: $${annekoii.totalCommission.toFixed(2)}`);
      console.log(`Total Orders: ${annekoii.totalOrders}`);
      console.log(`Total Impressions: ${annekoii.totalImpressions.toLocaleString()}`);
      console.log(`Total Likes: ${annekoii.totalLikes.toLocaleString()}`);
      console.log(`Total Comments: ${annekoii.totalComments.toLocaleString()}`);
      
      console.log('\nIndividual videos:');
      annekoii.videos.forEach((video, i) => {
        console.log(`  ${i + 1}. ${video.title.substring(0, 50)}...`);
        console.log(`     GMV: $${video.gmv}, Commission: $${video.commission}`);
      });
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total creators: ${Object.keys(creatorStats).length}`);
    console.log(`Total videos: ${contents.length}`);
    const totalGmv = Object.values(creatorStats).reduce((sum, c) => sum + c.totalGmv, 0);
    const totalCommission = Object.values(creatorStats).reduce((sum, c) => sum + c.totalCommission, 0);
    console.log(`Total GMV across all creators: $${totalGmv.toFixed(2)}`);
    console.log(`Total Commission across all creators: $${totalCommission.toFixed(2)}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyCreatorAggregation();