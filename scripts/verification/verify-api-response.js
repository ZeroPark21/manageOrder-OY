// Using native fetch in Node 18+

async function verifyApiResponse() {
  console.log('===================================================');
  console.log('  API 응답 검증 - 수정 후 확인');
  console.log('===================================================\n');

  try {
    // API 호출 (로컬 서버가 실행 중이어야 함)
    const response = await fetch('http://localhost:3000/api/contents?groupBy=creator');
    
    if (!response.ok) {
      console.log('⚠️ API 서버가 실행 중이지 않거나 오류가 발생했습니다.');
      console.log('다음 명령으로 서버를 실행하세요: npm run dev');
      return;
    }

    const data = await response.json();
    
    console.log('✅ API 응답 받음\n');
    
    console.log('=== 📊 API가 반환한 최상단 통계 값 ===\n');
    console.log(`1️⃣ 총 영상 수: ${data.totalContents?.toLocaleString() || 0}개`);
    console.log(`2️⃣ 총 GMV: $${data.totalGmv?.toFixed(2).toLocaleString() || 0}`);
    console.log(`3️⃣ 총 수수료: $${data.totalCommission?.toFixed(2).toLocaleString() || 0}`);
    console.log(`4️⃣ 총 주문: ${data.totalOrders?.toLocaleString() || 0}개`);
    console.log(`5️⃣ 크리에이터 수: ${data.uniqueCreators || 0}명`);
    
    console.log('\n=== 추가 통계 ===');
    console.log(`총 노출 수: ${data.totalShoppableImpressions?.toLocaleString() || 0}`);
    console.log(`총 좋아요: ${data.totalLikeCount?.toLocaleString() || 0}`);
    
    console.log('\n=== 예상 값과 비교 ===');
    console.log('데이터베이스 직접 조회 결과:');
    console.log('  총 영상: 2,136개');
    console.log('  총 GMV: $10,435.70');
    console.log('  총 수수료: $1,239.92');
    console.log('  총 주문: 664개');
    console.log('  크리에이터: 570명');
    
    console.log('\n차이:');
    console.log(`  영상 수: ${(data.totalContents || 0) - 2136}개 차이`);
    console.log(`  GMV: $${((data.totalGmv || 0) - 10435.70).toFixed(2)} 차이`);
    console.log(`  수수료: $${((data.totalCommission || 0) - 1239.92).toFixed(2)} 차이`);
    console.log(`  주문: ${(data.totalOrders || 0) - 664}개 차이`);
    console.log(`  크리에이터: ${(data.uniqueCreators || 0) - 570}명 차이`);
    
    // 크리에이터별 데이터 샘플
    if (data.data && Array.isArray(data.data)) {
      console.log('\n=== Top 3 크리에이터 (API 응답) ===');
      data.data.slice(0, 3).forEach((creator, index) => {
        const totalGmv = creator.contents?.reduce((sum, c) => sum + (c.gmv || 0), 0) || 0;
        const totalCommission = creator.contents?.reduce((sum, c) => sum + (c.est_commission || 0), 0) || 0;
        
        console.log(`\n${index + 1}. ${creator.creator}`);
        console.log(`   영상 수: ${creator.totalCount || 0}개`);
        console.log(`   총 GMV: $${totalGmv.toFixed(2)}`);
        console.log(`   총 수수료: $${totalCommission.toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n서버가 실행 중인지 확인하세요: npm run dev');
  }
}

verifyApiResponse();