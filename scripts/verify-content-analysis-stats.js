const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyContentAnalysisStats() {
  console.log('===================================================');
  console.log('  콘텐츠 분석 페이지 최상단 통계 데이터 검증');
  console.log('===================================================\n');

  try {
    // 1. Get all contents data
    const { data: allContents, error } = await supabase
      .from('contents')
      .select('*');

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    console.log(`📊 전체 레코드 수: ${allContents.length}\n`);

    // 2. Calculate statistics from raw data
    
    // Remove duplicates by video_link (same as frontend)
    const uniqueVideosMap = new Map();
    allContents.forEach(content => {
      if (content.video_link && !uniqueVideosMap.has(content.video_link)) {
        uniqueVideosMap.set(content.video_link, content);
      }
    });
    const uniqueVideos = Array.from(uniqueVideosMap.values());

    console.log('=== 중복 제거 ===');
    console.log(`원본 레코드: ${allContents.length}개`);
    console.log(`중복 제거 후: ${uniqueVideos.length}개`);
    console.log(`제거된 중복: ${allContents.length - uniqueVideos.length}개\n`);

    // Calculate totals
    let totalGMV = 0;
    let totalCommission = 0;
    let totalOrders = 0;
    let totalImpressions = 0;
    let totalLikes = 0;
    let totalComments = 0;
    const uniqueCreators = new Set();

    uniqueVideos.forEach(video => {
      totalGMV += Number(video.gmv) || 0;
      totalCommission += Number(video.est_commission) || 0;
      totalOrders += Number(video.affiliate_orders) || 0;
      totalImpressions += Number(video.shoppable_impressions) || 0;
      totalLikes += Number(video.like_count) || 0;
      totalComments += Number(video.comment_count) || 0;
      
      if (video.creator_name) {
        uniqueCreators.add(video.creator_name);
      }
    });

    console.log('=== 📈 최상단 박스에 표시되어야 할 정확한 값 ===\n');
    
    console.log('1️⃣ 총 영상 수 (Total Videos)');
    console.log(`   ✅ ${uniqueVideos.length.toLocaleString()}개`);
    console.log('   (중복 제거된 고유 비디오 수)\n');

    console.log('2️⃣ 총 GMV (Total GMV)');
    console.log(`   ✅ $${totalGMV.toFixed(2).toLocaleString()}`);
    console.log(`   (모든 영상의 GMV 합계)\n`);

    console.log('3️⃣ 총 수수료 (Total Commission)');
    console.log(`   ✅ $${totalCommission.toFixed(2).toLocaleString()}`);
    console.log(`   (모든 영상의 예상 수수료 합계)\n`);

    console.log('4️⃣ 총 주문 (Total Orders)');
    console.log(`   ✅ ${totalOrders.toLocaleString()}개`);
    console.log(`   (모든 영상의 주문 수 합계)\n`);

    console.log('5️⃣ 크리에이터 수 (Unique Creators)');
    console.log(`   ✅ ${uniqueCreators.size}명`);
    console.log(`   (고유 크리에이터 수)\n`);

    // Additional statistics
    console.log('=== 📊 추가 통계 (참고용) ===\n');
    console.log(`총 노출 수: ${totalImpressions.toLocaleString()}`);
    console.log(`총 좋아요: ${totalLikes.toLocaleString()}`);
    console.log(`총 댓글: ${totalComments.toLocaleString()}`);
    
    // Calculate averages
    if (uniqueVideos.length > 0) {
      console.log(`\n평균 GMV/영상: $${(totalGMV / uniqueVideos.length).toFixed(2)}`);
      console.log(`평균 수수료/영상: $${(totalCommission / uniqueVideos.length).toFixed(2)}`);
      console.log(`평균 주문/영상: ${(totalOrders / uniqueVideos.length).toFixed(1)}`);
    }

    // Top 5 creators by GMV
    const creatorStats = {};
    uniqueVideos.forEach(video => {
      const creator = video.creator_name;
      if (!creator) return;
      
      if (!creatorStats[creator]) {
        creatorStats[creator] = {
          videos: 0,
          gmv: 0,
          commission: 0,
          orders: 0
        };
      }
      
      creatorStats[creator].videos++;
      creatorStats[creator].gmv += Number(video.gmv) || 0;
      creatorStats[creator].commission += Number(video.est_commission) || 0;
      creatorStats[creator].orders += Number(video.affiliate_orders) || 0;
    });

    const sortedCreators = Object.entries(creatorStats)
      .sort((a, b) => b[1].gmv - a[1].gmv)
      .slice(0, 5);

    console.log('\n=== 🏆 Top 5 크리에이터 (GMV 기준) ===\n');
    sortedCreators.forEach(([creator, stats], index) => {
      console.log(`${index + 1}. ${creator}`);
      console.log(`   영상: ${stats.videos}개`);
      console.log(`   GMV: $${stats.gmv.toFixed(2)}`);
      console.log(`   수수료: $${stats.commission.toFixed(2)}`);
      console.log(`   주문: ${stats.orders}개\n`);
    });

    // Check for data quality issues
    console.log('=== ⚠️ 데이터 품질 체크 ===\n');
    
    const zeroGMVCount = uniqueVideos.filter(v => !v.gmv || v.gmv === 0).length;
    const zeroCommissionCount = uniqueVideos.filter(v => !v.est_commission || v.est_commission === 0).length;
    const noCreatorCount = uniqueVideos.filter(v => !v.creator_name).length;
    
    console.log(`GMV가 0인 영상: ${zeroGMVCount}개 (${(zeroGMVCount / uniqueVideos.length * 100).toFixed(1)}%)`);
    console.log(`수수료가 0인 영상: ${zeroCommissionCount}개 (${(zeroCommissionCount / uniqueVideos.length * 100).toFixed(1)}%)`);
    console.log(`크리에이터 정보 없는 영상: ${noCreatorCount}개`);

    // Verify API endpoint
    console.log('\n=== 🔍 API 엔드포인트 확인 ===\n');
    console.log('콘텐츠 분석 페이지는 다음 API를 사용합니다:');
    console.log('GET /api/contents?groupBy=creator');
    console.log('\n이 API가 위의 통계와 동일한 값을 반환하는지 확인 필요');

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyContentAnalysisStats();