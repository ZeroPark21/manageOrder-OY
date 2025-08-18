// TikTok Ads Auto Downloader - Popup Controller
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize
  await loadSettings();
  updateUI();
  loadLogs();
  
  // Event listeners
  document.getElementById('startDownload').addEventListener('click', startDownload);
  document.getElementById('stopDownload').addEventListener('click', stopDownload);
  document.getElementById('clearLogs').addEventListener('click', clearLogs);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('helpLink').addEventListener('click', showHelp);
  
  // Date inputs - Set default values and constraints
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  // Set max date to yesterday
  const maxDate = yesterday.toISOString().split('T')[0];
  startDateInput.max = maxDate;
  endDateInput.max = maxDate;
  
  // Set default dates
  const defaultStartDate = new Date(yesterday);
  defaultStartDate.setDate(defaultStartDate.getDate() - 6); // 7 days ago
  startDateInput.value = defaultStartDate.toISOString().split('T')[0];
  endDateInput.value = maxDate;
  
  // Validate date range
  startDateInput.addEventListener('change', validateDateRange);
  endDateInput.addEventListener('change', validateDateRange);
  
  // Check if download is in progress
  checkDownloadStatus();
});

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'downloadInterval',
    'maxRetries',
    'autoSaveProgress'
  ]);
  
  if (settings.downloadInterval) {
    document.getElementById('downloadInterval').value = settings.downloadInterval;
  }
  if (settings.maxRetries) {
    document.getElementById('maxRetries').value = settings.maxRetries;
  }
  if (settings.autoSaveProgress !== undefined) {
    document.getElementById('autoSaveProgress').checked = settings.autoSaveProgress;
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    downloadInterval: parseInt(document.getElementById('downloadInterval').value),
    maxRetries: parseInt(document.getElementById('maxRetries').value),
    autoSaveProgress: document.getElementById('autoSaveProgress').checked
  };
  
  await chrome.storage.local.set(settings);
  
  updateStatus('설정이 저장되었습니다', 'success');
  
  // Clear status after 3 seconds
  setTimeout(() => {
    updateStatus('준비됨 - TikTok Shop Ads 페이지에서 실행하세요', 'info');
  }, 3000);
}

// Validate date range
function validateDateRange() {
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);
  
  if (startDate > endDate) {
    document.getElementById('endDate').value = document.getElementById('startDate').value;
  }
  
  // Check if range exceeds 90 days
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 90) {
    updateStatus('날짜 범위는 최대 90일까지 가능합니다', 'warning');
    
    // Adjust end date
    const maxEndDate = new Date(startDate);
    maxEndDate.setDate(maxEndDate.getDate() + 89);
    document.getElementById('endDate').value = maxEndDate.toISOString().split('T')[0];
  }
}

// Start download process
async function startDownload() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (!startDate || !endDate) {
    updateStatus('시작일과 종료일을 선택해주세요', 'error');
    return;
  }
  
  // Check if current tab is TikTok Shop Ads
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!activeTab.url || 
      (!activeTab.url.includes('tiktokglobalshop.com/ads-creation') && 
       !activeTab.url.includes('ads.tiktok.com'))) {
    updateStatus('TikTok Shop Ads 페이지에서 실행해주세요', 'error');
    return;
  }
  
  // Disable start button, enable stop button
  document.getElementById('startDownload').disabled = true;
  document.getElementById('stopDownload').disabled = false;
  
  // Update status
  updateStatus('다운로드 시작 중...', 'info');
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'startDownload',
    startDate,
    endDate,
    tabId: activeTab.id
  }, (response) => {
    if (response && response.success) {
      updateStatus('다운로드가 시작되었습니다', 'success');
      addLog('info', `다운로드 시작: ${startDate} ~ ${endDate}`);
    } else {
      updateStatus(response?.error || '다운로드 시작 실패', 'error');
      document.getElementById('startDownload').disabled = false;
      document.getElementById('stopDownload').disabled = true;
    }
  });
  
  // Start monitoring progress
  monitorProgress();
}

// Stop download process
function stopDownload() {
  chrome.runtime.sendMessage({ action: 'stopDownload' }, (response) => {
    if (response && response.success) {
      updateStatus('다운로드가 중지되었습니다', 'warning');
      addLog('warning', '사용자가 다운로드를 중지했습니다');
      
      // Reset buttons
      document.getElementById('startDownload').disabled = false;
      document.getElementById('stopDownload').disabled = true;
      
      // Clear progress
      updateProgress(0, 0);
    }
  });
}

// Monitor download progress
function monitorProgress() {
  const interval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getProgress' }, (progress) => {
      if (!progress || !progress.isRunning) {
        clearInterval(interval);
        
        // Reset UI
        document.getElementById('startDownload').disabled = false;
        document.getElementById('stopDownload').disabled = true;
        
        if (progress && progress.completed === progress.total && progress.total > 0) {
          updateStatus('다운로드 완료!', 'success');
          addLog('success', `모든 다운로드 완료 (${progress.completed}/${progress.total})`);
        }
        
        return;
      }
      
      // Update progress
      updateProgress(progress.completed, progress.total);
      
      // Update current processing date
      if (progress.currentDate) {
        document.getElementById('currentProcessing').textContent = 
          `처리 중: ${progress.currentDate}`;
        document.getElementById('progressStatus').textContent = '다운로드 중';
      }
      
      // Update status based on progress
      if (progress.lastError) {
        updateStatus(`오류: ${progress.lastError}`, 'error');
      } else {
        updateStatus(`다운로드 진행 중 (${progress.completed}/${progress.total})`, 'info');
      }
    });
  }, 1000);
}

// Update progress bar
function updateProgress(completed, total) {
  const progressCount = document.getElementById('progressCount');
  const progressFill = document.getElementById('progressFill');
  
  progressCount.textContent = `${completed}/${total}`;
  
  if (total > 0) {
    const percentage = (completed / total) * 100;
    progressFill.style.width = `${percentage}%`;
  } else {
    progressFill.style.width = '0%';
  }
}

// Update status message
function updateStatus(message, type = 'info') {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  
  // Remove all status classes
  statusMessage.classList.remove('error', 'success', 'warning');
  
  // Add appropriate class
  if (type !== 'info') {
    statusMessage.classList.add(type);
  }
}

// Add log entry
function addLog(type, message) {
  const logsContainer = document.getElementById('logs');
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  
  const time = new Date().toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  logEntry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-${type}">${message}</span>
  `;
  
  // Add to top of logs
  logsContainer.insertBefore(logEntry, logsContainer.firstChild);
  
  // Keep only last 20 logs
  while (logsContainer.children.length > 20) {
    logsContainer.removeChild(logsContainer.lastChild);
  }
  
  // Save log to storage
  chrome.storage.local.get(['logs'], (result) => {
    const logs = result.logs || [];
    logs.unshift({ timestamp: Date.now(), type, message });
    
    // Keep only last 100 logs in storage
    if (logs.length > 100) {
      logs.length = 100;
    }
    
    chrome.storage.local.set({ logs });
  });
}

// Load logs from storage
async function loadLogs() {
  const result = await chrome.storage.local.get(['logs']);
  const logs = result.logs || [];
  
  const logsContainer = document.getElementById('logs');
  logsContainer.innerHTML = '';
  
  // Display last 20 logs
  logs.slice(0, 20).forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const time = new Date(log.timestamp).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    logEntry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-${log.type}">${log.message}</span>
    `;
    
    logsContainer.appendChild(logEntry);
  });
  
  if (logs.length === 0) {
    logsContainer.innerHTML = '<div class="log-entry">로그가 없습니다</div>';
  }
}

// Clear logs
function clearLogs() {
  document.getElementById('logs').innerHTML = '<div class="log-entry">로그가 비워졌습니다</div>';
  chrome.storage.local.set({ logs: [] });
}

// Check download status on load
async function checkDownloadStatus() {
  chrome.runtime.sendMessage({ action: 'getProgress' }, (progress) => {
    if (progress && progress.isRunning) {
      // Download is in progress
      document.getElementById('startDownload').disabled = true;
      document.getElementById('stopDownload').disabled = false;
      
      updateProgress(progress.completed, progress.total);
      updateStatus(`다운로드 진행 중 (${progress.completed}/${progress.total})`, 'info');
      
      // Start monitoring
      monitorProgress();
    }
  });
}

// Update UI based on state
function updateUI() {
  // Add any initial UI updates here
}

// Show help
function showHelp(e) {
  e.preventDefault();
  
  const helpMessage = `
TikTok Ads Auto Downloader 사용법:

1. TikTok Shop Ads 페이지 열기
2. 다운로드할 기간 선택
3. "다운로드 시작" 클릭
4. 자동으로 일별 데이터 다운로드

주의사항:
- 브라우저를 닫지 마세요
- 다운로드 중 페이지를 이동하지 마세요
- 최대 90일까지 선택 가능

문의: support@cosduck.com
  `.trim();
  
  alert(helpMessage);
}