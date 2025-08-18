// Background service worker for Chrome Extension
let isCollecting = false;

// 알람 설정 (매일 지정된 시간에 실행)
chrome.alarms.create('dailyCollection', {
  periodInMinutes: 1440 // 24시간마다
});

// 알람 이벤트 리스너
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyCollection') {
    checkAndCollect();
  }
});

// 설정 확인 후 수집
async function checkAndCollect() {
  const config = await chrome.storage.local.get(['autoCollect', 'collectTime']);
  
  if (!config.autoCollect) return;
  
  const now = new Date();
  const [hours, minutes] = config.collectTime.split(':');
  
  if (now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes)) {
    collectYesterdayData();
  }
}

// 어제 데이터 수집
async function collectYesterdayData() {
  if (isCollecting) {
    console.log('이미 수집 중입니다.');
    return;
  }

  isCollecting = true;
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    await addLog(`${dateStr} 데이터 수집 시작`);
    
    // TikTok 탭 찾기 또는 생성
    const tabs = await chrome.tabs.query({ url: '*://*.tiktokglobalshop.com/*' });
    let tab;
    
    if (tabs.length > 0) {
      tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: true });
    } else {
      tab = await chrome.tabs.create({ 
        url: 'https://seller.us.tiktokglobalshop.com/ads-creation/dashboard' 
      });
      // 페이지 로드 대기
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Content script에 수집 명령 전송
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'collectData',
      date: dateStr
    });
    
    if (response.success) {
      await addLog(`${dateStr} 데이터 수집 완료`);
      
      // Supabase에 업로드
      if (response.data) {
        await uploadToSupabase(response.data, dateStr);
      }
    } else {
      throw new Error(response.error || '수집 실패');
    }
    
  } catch (error) {
    await addLog(`오류: ${error.message}`, 'error');
  } finally {
    isCollecting = false;
  }
}

// 날짜 범위 수집
async function collectDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    await collectDataForDate(dateStr);
    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// 특정 날짜 데이터 수집
async function collectDataForDate(dateStr) {
  try {
    await addLog(`${dateStr} 데이터 수집 중...`);
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;
    
    const response = await chrome.tabs.sendMessage(tabs[0].id, {
      action: 'collectData',
      date: dateStr
    });
    
    if (response.success && response.data) {
      await uploadToSupabase(response.data, dateStr);
    }
    
  } catch (error) {
    await addLog(`${dateStr} 수집 실패: ${error.message}`, 'error');
  }
}

// Supabase에 데이터 업로드
async function uploadToSupabase(data, gmvDate) {
  try {
    const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase 설정이 필요합니다');
    }
    
    // 데이터 변환
    const records = data.map(row => ({
      gmv_date: gmvDate,
      campaign_id: row.campaignId || '',
      campaign_name: row.campaignName || '',
      video_id: row.videoId || '',
      video_title: row.videoTitle || '',
      creator_name: row.creatorName || '',
      creator_id: row.creatorId || '',
      gmv: parseFloat(row.gmv) || 0,
      orders: parseInt(row.orders) || 0,
      ad_spend: parseFloat(row.adSpend) || 0,
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      click_rate: parseFloat(row.clickRate) || 0,
      conversion_rate: parseFloat(row.conversionRate) || 0,
      product_name: row.productName || '',
      product_id: row.productId || ''
    }));
    
    // Supabase API 호출
    const response = await fetch(`${config.supabaseUrl}/rest/v1/gmv_daily_raw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(records)
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    await addLog(`${gmvDate}: ${records.length}개 레코드 업로드 완료`, 'success');
    
    // Materialized View 새로고침
    await refreshMaterializedViews(config);
    
  } catch (error) {
    await addLog(`업로드 실패: ${error.message}`, 'error');
  }
}

// Materialized View 새로고침
async function refreshMaterializedViews(config) {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/refresh_gmv_materialized_views`, {
      method: 'POST',
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`
      }
    });
    
    if (response.ok) {
      await addLog('Materialized View 새로고침 완료', 'success');
    }
  } catch (error) {
    console.error('View refresh failed:', error);
  }
}

// 로그 추가
async function addLog(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const log = { timestamp, message, type };
  
  const result = await chrome.storage.local.get(['logs']);
  const logs = result.logs || [];
  logs.unshift(log);
  
  // 최대 50개 로그 유지
  if (logs.length > 50) logs.length = 50;
  
  await chrome.storage.local.set({ logs });
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'collectNow':
      collectTodayData();
      sendResponse({ success: true });
      break;
      
    case 'collectRange':
      collectDateRange(request.startDate, request.endDate);
      sendResponse({ success: true });
      break;
      
    case 'getLogs':
      chrome.storage.local.get(['logs'], (result) => {
        sendResponse(result.logs || []);
      });
      return true; // 비동기 응답
    
    case 'pageLoaded':
      // 페이지 로드 알림
      console.log('Page loaded:', request.url);
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// 오늘 데이터 수집 (6월 17일부터)
async function collectTodayData() {
  if (isCollecting) {
    console.log('이미 수집 중입니다.');
    return;
  }

  isCollecting = true;
  
  try {
    await addLog('GMV 데이터 수집 시작 (2025-06-17 ~ 오늘)');
    
    // TikTok 탭 찾기 또는 생성
    const tabs = await chrome.tabs.query({ url: '*://*.tiktokglobalshop.com/*' });
    let tab;
    
    if (tabs.length > 0) {
      tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: true });
    } else {
      tab = await chrome.tabs.create({ 
        url: 'https://seller.us.tiktokglobalshop.com/ads-creation/dashboard' 
      });
      // 페이지 로드 대기
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Content script에 수집 명령 전송
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'collectData'
    });
    
    if (response.success) {
      await addLog(`데이터 수집 완료: ${response.data.length}개 캠페인`);
      
      // Supabase에 업로드
      if (response.data && response.data.length > 0) {
        await uploadCampaignData(response.data, response.date);
      }
    } else {
      throw new Error(response.error || '수집 실패');
    }
    
  } catch (error) {
    await addLog(`오류: ${error.message}`, 'error');
  } finally {
    isCollecting = false;
  }
}

// 캠페인 데이터 업로드
async function uploadCampaignData(campaigns, date) {
  try {
    const config = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase 설정이 필요합니다');
    }
    
    // 각 캠페인의 상세 데이터를 gmv_daily_raw 형식으로 변환
    const records = [];
    
    campaigns.forEach(campaign => {
      // 각 크리에이티브를 개별 레코드로 변환
      campaign.creatives.forEach(creative => {
        records.push({
          gmv_date: date,
          campaign_id: campaign.campaignName.match(/\d+$/)?.[0] || '',
          campaign_name: campaign.campaignName,
          video_id: creative.id || '',
          video_title: creative.name || '',
          creator_name: '', // 상세 페이지에서 추출 필요
          gmv: parseFloat(creative.revenue?.replace(/[^0-9.-]/g, '')) || 0,
          orders: parseInt(creative.orders?.replace(/[^0-9]/g, '')) || 0,
          impressions: parseInt(creative.impressions?.replace(/[^0-9]/g, '')) || 0,
          clicks: parseInt(creative.clicks?.replace(/[^0-9]/g, '')) || 0,
          click_rate: 0, // 계산 필요
          conversion_rate: 0, // 계산 필요
          ad_spend: 0 // 메트릭에서 추출 필요
        });
      });
    });
    
    // Supabase에 업로드
    const response = await fetch(`${config.supabaseUrl}/rest/v1/gmv_daily_raw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(records)
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    await addLog(`${records.length}개 레코드 업로드 완료`, 'success');
    
  } catch (error) {
    await addLog(`업로드 실패: ${error.message}`, 'error');
  }
}