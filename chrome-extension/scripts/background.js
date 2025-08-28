// TikTok Ads Auto Downloader - Background Service Worker

// Download state management
let downloadState = {
  isRunning: false,
  startDate: null,
  endDate: null,
  currentDate: null,
  completed: 0,
  total: 0,
  failed: [],
  tabId: null,
  lastError: null,
  lastDownloadId: null
};

// Settings defaults
const defaultSettings = {
  downloadInterval: 3,
  maxRetries: 3,
  autoSaveProgress: true
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('TikTok Ads Auto Downloader installed');
  
  // Set default settings
  chrome.storage.local.get(Object.keys(defaultSettings), (result) => {
    const settings = { ...defaultSettings, ...result };
    chrome.storage.local.set(settings);
  });
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);
  
  if (request.action === 'startDownload') {
    handleStartDownload(request, sendResponse);
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'stopDownload') {
    handleStopDownload(sendResponse);
    return false;
  }
  
  if (request.action === 'getProgress') {
    sendResponse(downloadState);
    return false;
  }
  
  if (request.action === 'downloadComplete') {
    handleDownloadComplete(request);
    return false;
  }
  
  if (request.action === 'downloadError') {
    handleDownloadError(request);
    return false;
  }
  
  if (request.action === 'contentScriptReady') {
    console.log('Content script ready on:', request.url);
    return false;
  }
  
  if (request.action === 'csvDataCaptured') {
    handleCsvDataCaptured(request);
    return false;
  }
  
  if (request.action === 'startDownloadMonitoring') {
    handleStartDownloadMonitoring(request);
    return false;
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// Start download process
async function handleStartDownload(request, sendResponse) {
  try {
    if (downloadState.isRunning) {
      sendResponse({ success: false, error: '다운로드가 이미 진행 중입니다' });
      return;
    }
    
    // First, try to inject content script if needed
    await ensureContentScriptInjected(request.tabId);
    
    // Check if we can communicate with the tab
    const canCommunicate = await checkTabCommunication(request.tabId);
    if (!canCommunicate) {
      sendResponse({ 
        success: false, 
        error: 'TikTok Shop Ads 페이지를 새로고침한 후 다시 시도해주세요' 
      });
      return;
    }
    
    // Initialize download state
    downloadState = {
      isRunning: true,
      startDate: request.startDate,
      endDate: request.endDate,
      currentDate: null,
      completed: 0,
      total: 0,
      failed: [],
      tabId: request.tabId,
      lastError: null
    };
    
    // Calculate total days
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    downloadState.total = diffDays;
    
    // Log start
    await addLog('info', `다운로드 시작: ${request.startDate} ~ ${request.endDate} (${diffDays}일)`);
    
    // Start download process
    setTimeout(() => processNextDate(), 2000);
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Failed to start download:', error);
    sendResponse({ success: false, error: error.message });
    downloadState.isRunning = false;
  }
}

// Ensure content script is injected
async function ensureContentScriptInjected(tabId) {
  try {
    // First check if content script is already injected
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' }).catch(() => null);
    if (response && response.success) {
      console.log('Content script already injected');
      return true;
    }
    
    // If not, inject it programmatically
    console.log('Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['scripts/content.js']
    });
    
    // Also inject CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles/content.css']
    });
    
    console.log('Content script injected successfully');
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
}

// Check if we can communicate with the tab
async function checkTabCommunication(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Cannot communicate with tab:', chrome.runtime.lastError.message);
        resolve(false);
      } else {
        console.log('Communication successful:', response);
        resolve(true);
      }
    });
  });
}

// Stop download process
function handleStopDownload(sendResponse) {
  if (!downloadState.isRunning) {
    sendResponse({ success: false, error: '진행 중인 다운로드가 없습니다' });
    return;
  }
  
  downloadState.isRunning = false;
  downloadState.lastError = '사용자가 중지함';
  
  addLog('warning', '다운로드가 중지되었습니다');
  
  sendResponse({ success: true });
}

// Process next date in the range
async function processNextDate() {
  if (!downloadState.isRunning) {
    return;
  }
  
  try {
    const settings = await chrome.storage.local.get(['downloadInterval', 'maxRetries']);
    const downloadInterval = settings.downloadInterval || 3;
    const maxRetries = settings.maxRetries || 3;
    
    // Determine next date to process
    let dateToProcess;
    if (!downloadState.currentDate) {
      dateToProcess = new Date(downloadState.startDate);
    } else {
      dateToProcess = new Date(downloadState.currentDate);
      dateToProcess.setDate(dateToProcess.getDate() + 1);
    }
    
    // Check if we've reached the end
    const endDate = new Date(downloadState.endDate);
    if (dateToProcess > endDate) {
      // Download complete
      downloadState.isRunning = false;
      await addLog('success', `모든 다운로드 완료! (성공: ${downloadState.completed}, 실패: ${downloadState.failed.length})`);
      
      if (downloadState.failed.length > 0) {
        await addLog('warning', `실패한 날짜: ${downloadState.failed.join(', ')}`);
      }
      
      return;
    }
    
    // Update current date
    const dateStr = dateToProcess.toISOString().split('T')[0];
    downloadState.currentDate = dateStr;
    
    console.log(`Processing date: ${dateStr}`);
    await addLog('info', `처리 중: ${dateStr}`);
    
    // Send message to content script to trigger download
    chrome.tabs.sendMessage(downloadState.tabId, {
      action: 'downloadDate',
      date: dateStr,
      retries: maxRetries
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send message:', chrome.runtime.lastError.message);
        downloadState.lastError = 'Content script와 통신할 수 없습니다. 페이지를 새로고침해주세요.';
        downloadState.failed.push(dateStr);
        downloadState.isRunning = false;
        addLog('error', downloadState.lastError);
        return;
      }
      
      console.log('Message sent successfully, response:', response);
    });
    
  } catch (error) {
    console.error('Error processing date:', error);
    downloadState.lastError = error.message;
    downloadState.isRunning = false;
    await addLog('error', `처리 오류: ${error.message}`);
  }
}

// Handle download complete for a date
async function handleDownloadComplete(request) {
  downloadState.completed++;
  await addLog('success', `${request.date} 다운로드 완료`);
  
  // Save progress if enabled
  const settings = await chrome.storage.local.get(['autoSaveProgress']);
  if (settings.autoSaveProgress) {
    saveProgress();
  }
  
  // Continue to next date
  if (downloadState.isRunning) {
    setTimeout(() => processNextDate(), 3000);
  }
}

// Handle download error for a date
async function handleDownloadError(request) {
  downloadState.failed.push(request.date);
  downloadState.lastError = request.error;
  await addLog('error', `${request.date} 다운로드 실패: ${request.error}`);
  
  // Continue to next date even if failed
  if (downloadState.isRunning) {
    setTimeout(() => processNextDate(), 3000);
  }
}

// Handle CSV data captured from network requests (supports both CSV and Excel formats)
async function handleCsvDataCaptured(request) {
  const { csvData, date, url } = request;
  
  console.log('File data captured in background:', {
    dataLength: csvData?.length,
    date,
    url: url?.substring(0, 100) + '...',
    isExcel: url?.includes('.xlsx') || url?.includes('.xls')
  });
  
  try {
    const fileType = (url?.includes('.xlsx') || url?.includes('.xls')) ? 'Excel' : 'CSV';
    await addLog('info', `${fileType} 데이터 캐치됨 (${date}): ${(csvData.length / 1024).toFixed(2)} KB`);
    
    // Process and upload data to Supabase
    if (url?.includes('.xlsx') || url?.includes('.xls')) {
      await uploadExcelToSupabase(csvData, date || downloadState.currentDate);
    } else {
      await uploadCsvToSupabase(csvData, date || downloadState.currentDate);
    }
    
    // Mark download as complete
    if (downloadState.isRunning && downloadState.currentDate === date) {
      downloadState.completed++;
      await addLog('success', `${date} 다운로드 및 업로드 완료`);
      
      // Continue to next date
      setTimeout(() => processNextDate(), 2000);
    }
    
  } catch (error) {
    console.error('Error processing captured file data:', error);
    await addLog('error', `파일 데이터 처리 실패: ${error.message}`);
    
    if (downloadState.isRunning) {
      downloadState.failed.push(date || downloadState.currentDate);
      setTimeout(() => processNextDate(), 3000);
    }
  }
}

// Upload captured Excel data to Supabase
async function uploadExcelToSupabase(excelContent, date) {
  console.log('Uploading captured Excel to Supabase for date:', date);
  
  try {
    // Parse Excel content using a simple base64 approach
    // Since we're in a service worker, we need to use external libraries carefully
    // For now, we'll send the binary data to the API and let the server parse it
    
    // Convert ArrayBuffer/binary data to base64
    let base64Data;
    if (typeof excelContent === 'string') {
      // If it's already a string, encode to base64
      base64Data = btoa(excelContent);
    } else {
      // If it's binary data, convert to base64
      const bytes = new Uint8Array(excelContent);
      const binary = bytes.reduce((data, byte) => data + String.fromCharCode(byte), '');
      base64Data = btoa(binary);
    }
    
    console.log('Excel data converted to base64, length:', base64Data.length);
    
    // Send to Supabase API with Excel data
    const apiUrl = 'https://manage-order-oliveyoung.vercel.app/api/tiktok-ads-upload';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        excelData: base64Data,
        fileType: 'excel'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Excel upload failed: ${response.statusText} - ${errorData.error || ''}`);
    }
    
    const result = await response.json();
    console.log('Excel upload successful:', result);
    
    await addLog('success', `${date} Excel 데이터가 Supabase에 저장되었습니다 (${result.rowsInserted || 0}행)`);
    
    return result;
    
  } catch (error) {
    console.error('Error uploading Excel to Supabase:', error);
    throw error;
  }
}

// Upload captured CSV data to Supabase
async function uploadCsvToSupabase(csvContent, date) {
  console.log('Uploading captured CSV to Supabase for date:', date);
  
  // Parse CSV content
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('No data in CSV');
  }
  
  // Simple CSV parsing (can be enhanced)
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  console.log(`Parsed ${data.length} rows from CSV`);
  
  // Send to Supabase API
  const apiUrl = 'https://manage-order-oliveyoung.vercel.app/api/tiktok-ads-upload';
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      date: date,
      data: data,
      fileType: 'csv'
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Upload failed: ${response.statusText} - ${errorData.error || ''}`);
  }
  
  const result = await response.json();
  console.log('Upload successful:', result);
  
  await addLog('success', `${date} 데이터가 Supabase에 저장되었습니다 (${result.rowsInserted || data.length}행)`);
  
  return result;
}

// Save progress to storage
async function saveProgress() {
  const progress = {
    startDate: downloadState.startDate,
    endDate: downloadState.endDate,
    currentDate: downloadState.currentDate,
    completed: downloadState.completed,
    failed: downloadState.failed,
    savedAt: Date.now()
  };
  
  await chrome.storage.local.set({ downloadProgress: progress });
}

// Add log entry
async function addLog(type, message) {
  const timestamp = Date.now();
  const log = { timestamp, type, message };
  
  const result = await chrome.storage.local.get(['logs']);
  const logs = result.logs || [];
  logs.unshift(log);
  
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.length = 100;
  }
  
  await chrome.storage.local.set({ logs });
  
  // Also log to console
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Handle tab close/update
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === downloadState.tabId && downloadState.isRunning) {
    downloadState.isRunning = false;
    downloadState.lastError = 'TikTok Shop Ads 탭이 닫혔습니다';
    addLog('error', downloadState.lastError);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === downloadState.tabId && changeInfo.url) {
    // Check if user navigated away from TikTok Shop Ads
    if (!changeInfo.url.includes('tiktokglobalshop.com/ads-creation') && 
        !changeInfo.url.includes('ads.tiktok.com')) {
      if (downloadState.isRunning) {
        downloadState.isRunning = false;
        downloadState.lastError = 'TikTok Shop Ads 페이지를 벗어났습니다';
        addLog('warning', downloadState.lastError);
      }
    }
  }
});

// Chrome Downloads API monitoring for fallback
let downloadMonitoringActive = false;
let monitoringDate = null;

function handleStartDownloadMonitoring(request) {
  const { date } = request;
  console.log('Starting download monitoring for date:', date);
  
  monitoringDate = date;
  downloadMonitoringActive = true;
  
  // Set up chrome.downloads listener
  if (chrome.downloads && chrome.downloads.onCreated) {
    chrome.downloads.onCreated.removeListener(onDownloadCreated); // Remove if already exists
    chrome.downloads.onCreated.addListener(onDownloadCreated);
    console.log('✅ Chrome Downloads API listener set up');
  }
  
  // Set up chrome.downloads.onChanged listener for completion
  if (chrome.downloads && chrome.downloads.onChanged) {
    chrome.downloads.onChanged.removeListener(onDownloadChanged);
    chrome.downloads.onChanged.addListener(onDownloadChanged);
    console.log('✅ Chrome Downloads change listener set up');
  }
}

// Handle new downloads
async function onDownloadCreated(downloadItem) {
  if (!downloadMonitoringActive) return;
  
  console.log('📥 New download detected:', {
    filename: downloadItem.filename,
    url: downloadItem.url,
    fileSize: downloadItem.fileSize
  });
  
  // Check if it's an Excel file
  const filename = downloadItem.filename?.toLowerCase() || '';
  const url = downloadItem.url?.toLowerCase() || '';
  
  if (filename.includes('.xlsx') || filename.includes('.xls') || 
      url.includes('.xlsx') || url.includes('.xls')) {
    
    console.log('🎯 Excel file download detected via Chrome Downloads API');
    await addLog('info', `Excel 파일 다운로드 감지: ${downloadItem.filename}`);
    
    // Store download info for processing when complete
    downloadItem._monitoringDate = monitoringDate;
    downloadItem._isExcelFile = true;
  }
}

// Handle download completion
async function onDownloadChanged(downloadDelta) {
  if (!downloadMonitoringActive) return;
  
  // Check if download completed
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('📦 Download completed:', downloadDelta.id);
    
    // Get full download info
    try {
      const [downloadItem] = await chrome.downloads.search({ id: downloadDelta.id });
      
      if (downloadItem && downloadItem._isExcelFile) {
        console.log('✅ Excel download completed:', downloadItem.filename);
        await addLog('success', `Excel 다운로드 완료: ${downloadItem.filename}`);
        
        // Try to read the downloaded file
        try {
          await processDownloadedExcelFile(downloadItem);
        } catch (error) {
          console.error('Error processing downloaded Excel file:', error);
          await addLog('error', `Excel 파일 처리 실패: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error getting download info:', error);
    }
  }
}

// Process downloaded Excel file
async function processDownloadedExcelFile(downloadItem) {
  console.log('🔍 Processing downloaded Excel file:', downloadItem.filename);
  
  // Note: Chrome extensions can't directly read downloaded files from disk
  // This would require additional permissions and file system access
  // For now, we'll log this event and rely on network interception
  
  await addLog('info', `Excel 파일이 다운로드되었습니다: ${downloadItem.filename}`);
  
  // Mark as complete for current date
  if (downloadState.isRunning && downloadState.currentDate === monitoringDate) {
    downloadState.completed++;
    await addLog('success', `${monitoringDate} 다운로드 완료 (Downloads API)`);
    
    // Continue to next date
    setTimeout(() => processNextDate(), 2000);
  }
  
  // Stop monitoring after successful download
  downloadMonitoringActive = false;
  monitoringDate = null;
}

// Note: Network interception is still the primary method
// Downloads API monitoring is a fallback for cases where network interception fails