// Content script - TikTok 페이지에서 실행
console.log('TikTok GMV Collector content script loaded');

// 페이지 데이터 추출 함수
function extractPageData() {
  const data = [];
  
  // 테이블 데이터 찾기 - 다양한 셀렉터 시도
  const tableSelectors = [
    'table tbody tr',
    '[role="grid"] [role="row"]',
    '.data-table tr',
    '[class*="table"] tr',
    '[class*="Table"] tr'
  ];
  
  let rows = [];
  for (const selector of tableSelectors) {
    rows = document.querySelectorAll(selector);
    if (rows.length > 0) break;
  }
  
  if (rows.length === 0) {
    console.log('테이블 데이터를 찾을 수 없습니다');
    return data;
  }
  
  // 각 행에서 데이터 추출
  rows.forEach((row, index) => {
    if (index === 0) return; // 헤더 스킵
    
    const cells = row.querySelectorAll('td, [role="cell"]');
    if (cells.length < 5) return;
    
    // 셀에서 텍스트 추출
    const getText = (cell) => cell?.textContent?.trim() || '';
    
    const rowData = {
      campaignName: getText(cells[0]),
      videoId: getText(cells[1]),
      creatorName: getText(cells[2]),
      gmv: getText(cells[3]).replace(/[^0-9.-]/g, ''),
      orders: getText(cells[4]).replace(/[^0-9]/g, ''),
      impressions: getText(cells[5]).replace(/[^0-9]/g, ''),
      clicks: getText(cells[6]).replace(/[^0-9]/g, ''),
      clickRate: getText(cells[7]).replace(/[^0-9.]/g, ''),
      conversionRate: getText(cells[8]).replace(/[^0-9.]/g, ''),
      adSpend: getText(cells[9]).replace(/[^0-9.-]/g, '')
    };
    
    data.push(rowData);
  });
  
  console.log(`추출된 데이터: ${data.length}개 행`);
  return data;
}

// 날짜 설정 함수
async function setDateRange(date) {
  try {
    // 날짜 선택기 찾기
    const dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="date"]');
    
    if (dateInputs.length >= 2) {
      // 시작일과 종료일 설정
      dateInputs[0].value = date;
      dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      
      dateInputs[1].value = date;
      dateInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      
      // 적용 버튼 클릭
      const applyButton = document.querySelector('button:contains("Apply"), button:contains("적용")');
      if (applyButton) {
        applyButton.click();
      }
      
      // 데이터 로드 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('날짜 설정 오류:', error);
    return false;
  }
}

// 데이터 다운로드 트리거
async function triggerDownload() {
  const downloadButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Export') || 
    btn.textContent.includes('Download') || 
    btn.textContent.includes('내보내기')
  );
  
  if (downloadButtons.length > 0) {
    downloadButtons[0].click();
    return true;
  }
  
  return false;
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'collectData') {
    // 비동기 작업을 Promise로 래핑
    (async () => {
      try {
        // 1. 날짜 설정 (6월 17일부터 오늘까지)
        const dateSet = await setDatePicker('2025-06-17');
        if (!dateSet) {
          console.log('날짜 설정을 수동으로 진행하세요');
        }
        
        // 데이터 로드 대기
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 2. 모든 캠페인 데이터 수집
        const campaignData = await collectAllCampaignData();
        
        sendResponse({ 
          success: true, 
          data: campaignData,
          date: new Date().toISOString().split('T')[0]
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (request.action === 'collectCurrentPage') {
    // 현재 페이지 데이터만 수집
    const data = extractPageData();
    sendResponse({ success: true, data });
  }
});

// 페이지 로드 완료 시 확장 프로그램에 알림
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ 
    action: 'pageLoaded', 
    url: window.location.href 
  });
});

// DOM 변경 감지 (SPA 대응)
const observer = new MutationObserver((mutations) => {
  // URL 변경 감지
  if (window.location.href.includes('ads-creation/dashboard')) {
    // 대시보드 페이지 로드 완료
    console.log('TikTok Ads Dashboard detected');
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 날짜 설정 함수
async function setDatePicker(startDate) {
  try {
    // 날짜 선택기 찾기
    const datePickerSelector = '.theme-arco-picker-range, .theme-m4b-date-picker-range, [data-testid*="date-picker"]';
    const datePicker = document.querySelector(datePickerSelector);
    
    if (!datePicker) {
      console.log('날짜 선택기를 찾을 수 없습니다');
      return false;
    }
    
    // 날짜 선택기 클릭
    datePicker.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Custom 날짜 옵션 선택 (있는 경우)
    const customOption = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Custom' || el.textContent === '사용자 지정'
    );
    
    if (customOption) {
      customOption.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 시작일 설정 (2025-06-17)
    const startInput = document.querySelector('input[placeholder="Start date"]');
    if (startInput) {
      startInput.value = 'Jun 17, 2025';
      startInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // 종료일을 오늘로 설정
    const endInput = document.querySelector('input[placeholder="End date"]');
    if (endInput) {
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      endInput.value = formattedDate;
      endInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Apply 버튼 클릭
    const applyButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent === 'Apply' || btn.textContent === '적용'
    );
    
    if (applyButton) {
      applyButton.click();
    }
    
    return true;
  } catch (error) {
    console.error('날짜 설정 오류:', error);
    return false;
  }
}

// View details 버튼들 수집
async function collectAllCampaignData() {
  const results = [];
  
  try {
    // 모든 View details 버튼 찾기
    const viewDetailsButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
      btn.textContent.trim() === 'View details'
    );
    
    console.log(`${viewDetailsButtons.length}개의 캠페인을 찾았습니다`);
    
    for (let i = 0; i < viewDetailsButtons.length; i++) {
      const button = viewDetailsButtons[i];
      
      // 캠페인 정보 추출 (같은 행에서)
      const row = button.closest('tr');
      if (!row) continue;
      
      const cells = row.querySelectorAll('td');
      const campaignName = cells[1]?.textContent?.trim() || '';
      
      console.log(`캠페인 ${i + 1}/${viewDetailsButtons.length}: ${campaignName} 처리 중...`);
      
      // View details 클릭
      button.click();
      
      // 페이지 로드 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 데이터 추출 (상세 페이지에서)
      const detailData = extractDetailPageData();
      
      results.push({
        campaignName,
        ...detailData
      });
      
      // 뒤로 가기
      window.history.back();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  } catch (error) {
    console.error('데이터 수집 오류:', error);
    return results;
  }
}

// 상세 페이지에서 데이터 추출
function extractDetailPageData() {
  const data = {
    metrics: {},
    creatives: []
  };
  
  // 메트릭 데이터 추출
  const metricElements = document.querySelectorAll('[class*="metric"], [class*="stat"]');
  metricElements.forEach(el => {
    const label = el.querySelector('[class*="label"]')?.textContent?.trim();
    const value = el.querySelector('[class*="value"]')?.textContent?.trim();
    if (label && value) {
      data.metrics[label] = value;
    }
  });
  
  // 크리에이티브 데이터 추출
  const creativeRows = document.querySelectorAll('tr[class*="creative"], tr[data-testid*="creative"]');
  creativeRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length > 0) {
      data.creatives.push({
        id: cells[0]?.textContent?.trim(),
        name: cells[1]?.textContent?.trim(),
        impressions: cells[2]?.textContent?.trim(),
        clicks: cells[3]?.textContent?.trim(),
        orders: cells[4]?.textContent?.trim(),
        revenue: cells[5]?.textContent?.trim()
      });
    }
  });
  
  return data;
}