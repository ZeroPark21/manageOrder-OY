// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  // 저장된 설정 로드
  loadConfig();
  
  // 로그 로드
  loadLogs();
  
  // 이벤트 리스너 설정
  document.getElementById('saveConfig').addEventListener('click', saveConfig);
  document.getElementById('collectNow').addEventListener('click', collectNow);
  document.getElementById('collectRange').addEventListener('click', collectRange);
});

// 설정 로드
async function loadConfig() {
  const config = await chrome.storage.local.get([
    'supabaseUrl',
    'supabaseKey',
    'autoCollect',
    'collectTime'
  ]);
  
  if (config.supabaseUrl) {
    document.getElementById('supabaseUrl').value = config.supabaseUrl;
  }
  if (config.supabaseKey) {
    document.getElementById('supabaseKey').value = config.supabaseKey;
  }
  if (config.autoCollect) {
    document.getElementById('autoCollect').checked = config.autoCollect;
  }
  if (config.collectTime) {
    document.getElementById('collectTime').value = config.collectTime;
  }
}

// 설정 저장
async function saveConfig() {
  const config = {
    supabaseUrl: document.getElementById('supabaseUrl').value,
    supabaseKey: document.getElementById('supabaseKey').value,
    autoCollect: document.getElementById('autoCollect').checked,
    collectTime: document.getElementById('collectTime').value
  };
  
  await chrome.storage.local.set(config);
  
  updateStatus('설정이 저장되었습니다', 'success');
  
  // 자동 수집 알람 설정
  if (config.autoCollect) {
    const [hours, minutes] = config.collectTime.split(':');
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const delayInMinutes = Math.floor((scheduledTime - now) / 60000);
    
    chrome.alarms.create('dailyCollection', {
      delayInMinutes,
      periodInMinutes: 1440
    });
  } else {
    chrome.alarms.clear('dailyCollection');
  }
}

// 지금 수집
async function collectNow() {
  updateStatus('데이터 수집 중...', 'collecting');
  
  chrome.runtime.sendMessage({ action: 'collectNow' }, (response) => {
    if (response.success) {
      updateStatus('수집 작업이 시작되었습니다', 'success');
    } else {
      updateStatus('수집 시작 실패', 'error');
    }
  });
}

// 기간 수집
async function collectRange() {
  const startDate = prompt('시작 날짜 (YYYY-MM-DD):');
  const endDate = prompt('종료 날짜 (YYYY-MM-DD):');
  
  if (!startDate || !endDate) return;
  
  updateStatus(`${startDate} ~ ${endDate} 수집 중...`, 'collecting');
  
  chrome.runtime.sendMessage({
    action: 'collectRange',
    startDate,
    endDate
  }, (response) => {
    if (response.success) {
      updateStatus('기간 수집이 시작되었습니다', 'success');
    }
  });
}

// 상태 업데이트
function updateStatus(message, type = 'waiting') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// 로그 로드
async function loadLogs() {
  chrome.runtime.sendMessage({ action: 'getLogs' }, (logs) => {
    const logsEl = document.getElementById('logs');
    logsEl.innerHTML = '';
    
    if (!logs || logs.length === 0) {
      logsEl.innerHTML = '<div class="log-entry">로그가 없습니다</div>';
      return;
    }
    
    logs.slice(0, 10).forEach(log => {
      const logEl = document.createElement('div');
      logEl.className = `log-entry ${log.type}`;
      
      const time = new Date(log.timestamp).toLocaleTimeString();
      logEl.textContent = `[${time}] ${log.message}`;
      
      logsEl.appendChild(logEl);
    });
  });
  
  // 5초마다 로그 새로고침
  setTimeout(loadLogs, 5000);
}