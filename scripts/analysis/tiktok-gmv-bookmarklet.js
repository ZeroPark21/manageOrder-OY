// TikTok GMV 데이터 수집 북마클릿
// 이 코드를 Chrome 북마크에 추가하여 사용하세요

javascript:(function(){
  // 현재 페이지가 TikTok Seller Center인지 확인
  if (!window.location.href.includes('tiktokglobalshop.com')) {
    alert('TikTok Seller Center 페이지에서 실행해주세요!');
    return;
  }

  // 날짜 입력 받기
  const targetDate = prompt('수집할 날짜를 입력하세요 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (!targetDate) return;

  console.log('🚀 GMV 데이터 수집 시작:', targetDate);

  // 다운로드 버튼 찾기
  const downloadButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Export') || 
    btn.textContent.includes('Download') || 
    btn.textContent.includes('내보내기')
  );

  if (downloadButtons.length > 0) {
    console.log('✅ 다운로드 버튼 발견:', downloadButtons.length);
    
    // 클립보드에 명령어 복사
    const command = `node scripts/process-gmv-file.js downloads/gmv/[다운로드된파일명].xlsx ${targetDate}`;
    navigator.clipboard.writeText(command).then(() => {
      alert(`다음 단계:\n\n1. Export/Download 버튼을 클릭하세요\n2. 파일을 downloads/gmv/ 폴더에 저장\n3. 터미널에서 실행 (클립보드에 복사됨):\n${command}`);
    });
  } else {
    alert('다운로드 버튼을 찾을 수 없습니다.\n수동으로 Export 버튼을 찾아 클릭하세요.');
  }

  // 페이지 정보 콘솔에 출력
  console.log('📊 페이지 정보:');
  console.log('- URL:', window.location.href);
  console.log('- 타이틀:', document.title);
  console.log('- 날짜:', targetDate);
})();