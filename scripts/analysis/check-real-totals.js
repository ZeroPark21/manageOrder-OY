const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRealTotals() {
  console.log('===================================================');
  console.log('  REAL DATABASE CHECK - 실제 데이터베이스 확인');
  console.log('===================================================\n');

  try {
    // 1. Get total count using count API
    const { count: totalCount, error: countError } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
      return;
    }

    console.log(`📊 총 레코드 수 (COUNT API): ${totalCount}개\n`);

    // 2. Get all data in batches to handle large datasets
    let allData = [];
    let offset = 0;
    const limit = 1000;
    
    console.log('Fetching all data in batches...');
    while (true) {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Fetch error:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allData = [...allData, ...data];
      console.log(`  Batch ${Math.floor(offset/limit) + 1}: ${data.length} records fetched (Total: ${allData.length})`);
      
      if (data.length < limit) break;
      offset += limit;
    }

    console.log(`\n✅ 실제로 가져온 레코드 수: ${allData.length}개`);

    // 3. Remove duplicates by video_link
    const uniqueMap = new Map();
    const duplicateLinks = new Set();
    
    allData.forEach(item => {
      if (item.video_link) {
        if (uniqueMap.has(item.video_link)) {
          duplicateLinks.add(item.video_link);
        } else {
          uniqueMap.set(item.video_link, item);
        }
      } else {
        // Handle items without video_link
        uniqueMap.set(`no_link_${item.id}`, item);
      }
    });

    const uniqueContents = Array.from(uniqueMap.values());
    
    console.log('\n=== 중복 제거 분석 ===');
    console.log(`원본 레코드: ${allData.length}개`);
    console.log(`중복된 video_link 수: ${duplicateLinks.size}개`);
    console.log(`중복 제거 후: ${uniqueContents.length}개`);
    console.log(`제거된 중복: ${allData.length - uniqueContents.length}개\n`);

    // 4. Calculate real totals
    let totalGMV = 0;
    let totalCommission = 0;
    let totalOrders = 0;
    let totalImpressions = 0;
    let totalLikes = 0;
    let totalComments = 0;
    const creators = new Set();

    uniqueContents.forEach(item => {
      totalGMV += Number(item.gmv) || 0;
      totalCommission += Number(item.est_commission) || 0;
      totalOrders += Number(item.affiliate_orders) || 0;
      totalImpressions += Number(item.shoppable_impressions) || 0;
      totalLikes += Number(item.like_count) || 0;
      totalComments += Number(item.comment_count) || 0;
      
      if (item.creator_name) {
        creators.add(item.creator_name);
      }
    });

    console.log('=== 🎯 실제 통계 값 (REAL VALUES) ===\n');
    console.log(`1️⃣ 총 영상 수: ${uniqueContents.length.toLocaleString()}개`);
    console.log(`2️⃣ 총 GMV: $${totalGMV.toFixed(2).toLocaleString()}`);
    console.log(`3️⃣ 총 수수료: $${totalCommission.toFixed(2).toLocaleString()}`);
    console.log(`4️⃣ 총 주문: ${totalOrders.toLocaleString()}개`);
    console.log(`5️⃣ 크리에이터 수: ${creators.size}명`);
    
    console.log('\n=== 추가 통계 ===');
    console.log(`총 노출 수: ${totalImpressions.toLocaleString()}`);
    console.log(`총 좋아요: ${totalLikes.toLocaleString()}`);
    console.log(`총 댓글: ${totalComments.toLocaleString()}`);

    // 5. Check data quality
    const nonZeroGMV = uniqueContents.filter(item => item.gmv > 0);
    const nonZeroCommission = uniqueContents.filter(item => item.est_commission > 0);
    
    console.log('\n=== 데이터 품질 ===');
    console.log(`GMV > 0인 영상: ${nonZeroGMV.length}개 (${(nonZeroGMV.length/uniqueContents.length*100).toFixed(1)}%)`);
    console.log(`수수료 > 0인 영상: ${nonZeroCommission.length}개 (${(nonZeroCommission.length/uniqueContents.length*100).toFixed(1)}%)`);

    // 6. Sample check - show first few records
    console.log('\n=== 샘플 데이터 (처음 3개) ===');
    uniqueContents.slice(0, 3).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.content_title?.substring(0, 50)}...`);
      console.log(`   Creator: ${item.creator_name}`);
      console.log(`   GMV: $${item.gmv}, Commission: $${item.est_commission}`);
      console.log(`   Video Link: ${item.video_link}`);
    });

    // 7. Date range check
    const dates = uniqueContents
      .map(item => item.publish_date)
      .filter(date => date)
      .sort();
    
    if (dates.length > 0) {
      console.log('\n=== 날짜 범위 ===');
      console.log(`최초 게시일: ${dates[0]}`);
      console.log(`최근 게시일: ${dates[dates.length - 1]}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRealTotals();