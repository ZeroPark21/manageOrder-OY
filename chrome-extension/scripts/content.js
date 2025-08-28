// TikTok Ads Auto Downloader - Content Script
// Prevent duplicate loading
if (window.tiktokAdsAutoDownloaderLoaded) {
  console.log('🚫 Content script already loaded, skipping...');
  throw new Error('Script already loaded');
}
window.tiktokAdsAutoDownloaderLoaded = true;

console.log('🚀 TikTok Ads Auto Downloader content script loaded (fresh)');

// Current download state
let currentDownloadState = {
  isProcessing: false,
  currentDate: null,
  retryCount: 0,
  maxRetries: 3
};

// Enhanced network interception for ALL file types
if (!window.originalFetchBackup) {
  window.originalFetchBackup = window.fetch;
  console.log('💾 Backing up original fetch function');
}

const originalFetch = window.originalFetchBackup;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  // Log ALL fetch requests for debugging
  const url = args[0];
  if (typeof url === 'string') {
    console.log('🌐 Fetch request:', url.substring(0, 100) + '...');
  }
  
  // Check if this is ANY kind of file download
  const contentType = response.headers.get('content-type') || '';
  const contentDisposition = response.headers.get('content-disposition') || '';
  
  // More comprehensive detection patterns
  const isExportRequest = typeof url === 'string' && 
    (url.includes('export') || url.includes('download') || url.includes('blob') || 
     contentDisposition.includes('attachment'));
    
  const isCsv = url?.includes('csv') || contentType.includes('csv') || contentDisposition.includes('csv');
  const isExcel = url?.includes('.xlsx') || url?.includes('.xls') || 
                  contentType.includes('spreadsheet') || contentType.includes('excel') ||
                  contentType.includes('vnd.openxmlformats') ||
                  contentDisposition.includes('.xlsx') || contentDisposition.includes('.xls');
  
  // Check for blob URLs or any binary content that might be a file
  const isBinaryFile = contentType.includes('application/') || url.startsWith('blob:');
  
  // Log potential file downloads for debugging
  if (isExportRequest || isCsv || isExcel || isBinaryFile) {
    console.log('🔍 Potential file download detected:', {
      url: url.substring(0, 100) + '...',
      contentType,
      contentDisposition,
      isExportRequest,
      isCsv,
      isExcel,
      isBinaryFile
    });
  }
  
  if ((isExportRequest || isBinaryFile) && (isCsv || isExcel)) {
    const fileType = isExcel ? 'Excel' : 'CSV';
    console.log(`🎯 ${fileType} export detected:`, url);
    
    // Clone the response so we can read it without affecting the original download
    const clonedResponse = response.clone();
    
    try {
      let fileData;
      
      if (isExcel) {
        // For Excel files, get as ArrayBuffer
        fileData = await clonedResponse.arrayBuffer();
        console.log('📊 Excel data captured, size:', fileData.byteLength, 'bytes');
      } else {
        // For CSV files, get as text
        fileData = await clonedResponse.text();
        console.log('📄 CSV data captured, length:', fileData.length);
      }
      
      // Send file data to background script for processing
      chrome.runtime.sendMessage({
        action: 'csvDataCaptured', // Keep same action name for compatibility
        csvData: fileData,
        date: currentDownloadState.currentDate,
        url: url,
        fileType: fileType.toLowerCase()
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${fileType} data:`, error);
    }
  }
  
  return response;
};

// Also intercept XMLHttpRequest for older implementations
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...args) {
  this._url = url;
  return originalXHROpen.call(this, method, url, ...args);
};

XMLHttpRequest.prototype.send = function(...args) {
  const xhr = this;
  
  // Add event listener for response
  xhr.addEventListener('load', function() {
    const url = xhr._url;
    const contentType = xhr.getResponseHeader('content-type') || '';
    const contentDisposition = xhr.getResponseHeader('content-disposition') || '';
    
    const isExportRequest = typeof url === 'string' && 
      (url.includes('export') || url.includes('download'));
      
    const isCsv = url?.includes('csv') || contentType.includes('csv') || 
                  contentDisposition.includes('csv') || xhr.responseText?.includes(',');
    const isExcel = url?.includes('.xlsx') || url?.includes('.xls') || 
                    contentType.includes('spreadsheet') || contentType.includes('excel') ||
                    contentDisposition.includes('.xlsx') || contentDisposition.includes('.xls');
    
    // Check if this is a CSV or Excel response
    if (isExportRequest && (isCsv || isExcel)) {
      const fileType = isExcel ? 'Excel' : 'CSV';
      console.log(`${fileType} export detected via XHR:`, url);
      
      try {
        let fileData;
        
        if (isExcel) {
          // For Excel files, get response as ArrayBuffer
          fileData = xhr.response; // Should be ArrayBuffer if responseType was set
          if (!fileData || fileData.constructor !== ArrayBuffer) {
            // Fallback: convert responseText to ArrayBuffer
            const encoder = new TextEncoder();
            fileData = encoder.encode(xhr.responseText).buffer;
          }
          console.log('Excel data captured via XHR, size:', fileData.byteLength, 'bytes');
        } else {
          // For CSV files, get as text
          fileData = xhr.responseText;
          console.log('CSV data captured via XHR, length:', fileData.length);
        }
        
        if (fileData && (isExcel || fileData.length > 100)) { // Basic validation
          chrome.runtime.sendMessage({
            action: 'csvDataCaptured', // Keep same action name for compatibility
            csvData: fileData,
            date: currentDownloadState.currentDate,
            url: url,
            fileType: fileType.toLowerCase()
          });
        }
      } catch (error) {
        console.error(`Error processing XHR ${fileType} data:`, error);
      }
    }
  });
  
  return originalXHRSend.apply(this, args);
};

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'Content script is ready' });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'downloadDate') {
    // Start download process
    handleDownloadDate(request.date, request.retries)
      .then(() => {
        console.log('Download process initiated for:', request.date);
      })
      .catch(error => {
        console.error('Failed to initiate download:', error);
      });
    
    // Send immediate response
    sendResponse({ success: true, message: 'Download process started' });
    return true; // Keep channel open
  }
  
  // Unknown action
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// Handle download for a specific date
async function handleDownloadDate(date, maxRetries = 3) {
  if (currentDownloadState.isProcessing) {
    console.log('Already processing a download');
    return;
  }
  
  currentDownloadState = {
    isProcessing: true,
    currentDate: date,
    retryCount: 0,
    maxRetries: maxRetries
  };
  
  try {
    console.log(`Starting download for date: ${date}`);
    
    // Step 1: Click the date picker to open it
    const datePickerClicked = await clickDatePicker();
    if (!datePickerClicked) {
      throw new Error('Failed to open date picker');
    }
    
    // Step 2: Set the specific date (both start and end to same date for daily data)
    const dateSet = await setDateRange(date, date);
    if (!dateSet) {
      throw new Error('Failed to set date');
    }
    
    // Step 3: Wait for data to load
    await waitForDataLoad();
    
    // Step 4: Click the export dropdown button
    const exportDropdownClicked = await clickExportDropdown();
    if (!exportDropdownClicked) {
      throw new Error('Failed to open export dropdown');
    }
    
    // Step 5: Click the Export button
    const exportClicked = await clickExportButton();
    if (!exportClicked) {
      throw new Error('Failed to click export button');
    }
    
    // Step 6: Wait for download to complete (CSV data will be intercepted)
    await waitForDownloadComplete();
    
    // Note: CSV data interception will handle the upload
    // No need to send downloadComplete here as it's handled by network interception
    console.log(`Download process completed for ${date} - waiting for CSV interception`);
    
  } catch (error) {
    console.error(`Download failed for ${date}:`, error);
    
    // Retry if needed
    if (currentDownloadState.retryCount < currentDownloadState.maxRetries) {
      currentDownloadState.retryCount++;
      console.log(`Retrying... (${currentDownloadState.retryCount}/${currentDownloadState.maxRetries})`);
      setTimeout(() => {
        handleDownloadDate(date, maxRetries);
      }, 5000);
    } else {
      // Report error
      chrome.runtime.sendMessage({
        action: 'downloadError',
        date: date,
        error: error.message
      });
    }
  } finally {
    currentDownloadState.isProcessing = false;
  }
}

// Click the date picker
async function clickDatePicker() {
  try {
    console.log('Looking for date picker...');
    
    // Find the date picker element
    const datePickerSelectors = [
      '.theme-arco-picker-range',
      '.theme-m4b-date-picker-range',
      '.picker-component-ytYb',
      '[data-testid*="dashboard-date-picker"]',
      '[data-uid*="dashboarddatepicker"]'
    ];
    
    let datePicker = null;
    for (const selector of datePickerSelectors) {
      datePicker = document.querySelector(selector);
      if (datePicker) {
        console.log(`Found date picker with selector: ${selector}`);
        break;
      }
    }
    
    if (!datePicker) {
      console.error('Date picker not found');
      return false;
    }
    
    // Click the date picker to open it
    datePicker.click();
    console.log('Clicked date picker');
    await sleep(1500);
    
    return true;
    
  } catch (error) {
    console.error('Error clicking date picker:', error);
    return false;
  }
}

// Set date range using TikTok Shop Ads date picker (same date for both start and end)
async function setDateRange(startDate, endDate) {
  try {
    console.log(`Setting single date: ${startDate} (for daily data)`);
    
    // Wait for the date picker popup to appear
    await waitForElement('.theme-arco-picker-container, .arco-picker-container, [class*="picker-container"], .theme-arco-picker-panel', 3000);
    
    // Format date
    const dateObj = new Date(startDate);
    const day = dateObj.getDate();
    const month = dateObj.getMonth(); // 0-11
    const year = dateObj.getFullYear();
    
    console.log(`Looking for date: ${day} in month ${month + 1}/${year}`);
    
    // Find the calendar body
    const calendarBody = document.querySelector('.theme-arco-picker-body');
    
    if (calendarBody) {
      // Find all date cells
      const dateCells = calendarBody.querySelectorAll('.theme-arco-picker-cell');
      
      let targetCell = null;
      
      // Find the cell with our target date
      for (const cell of dateCells) {
        const dateValue = cell.querySelector('.theme-arco-picker-date-value');
        if (dateValue && dateValue.textContent === String(day)) {
          // Check if this cell is in the current month (has theme-arco-picker-cell-in-view class)
          // and not disabled
          if (cell.classList.contains('theme-arco-picker-cell-in-view') && 
              !cell.classList.contains('theme-arco-picker-cell-disabled')) {
            targetCell = cell;
            console.log(`Found target date cell for day ${day}`);
            break;
          }
        }
      }
      
      if (targetCell) {
        // Click the date twice (once for start, once for end)
        console.log('Clicking date for start date...');
        targetCell.click();
        await sleep(500);
        
        console.log('Clicking same date for end date...');
        targetCell.click();
        await sleep(500);
        
        // Look for OK/Apply/Confirm button in the picker footer
        const confirmButtons = [
          '.theme-arco-picker-footer button.theme-arco-btn-primary',
          '.theme-arco-picker-footer button',
          'button.theme-arco-btn-primary',
          'button.arco-btn-primary'
        ];
        
        let confirmButton = null;
        for (const selector of confirmButtons) {
          const buttons = document.querySelectorAll(selector);
          for (const btn of buttons) {
            if (btn.textContent?.includes('OK') || 
                btn.textContent?.includes('Apply') || 
                btn.textContent?.includes('확인')) {
              confirmButton = btn;
              break;
            }
          }
          if (confirmButton) break;
        }
        
        if (confirmButton) {
          console.log('Found confirm button, clicking...');
          confirmButton.click();
          await sleep(2000);
        } else {
          // If no confirm button, click outside to close
          console.log('No confirm button found, clicking outside to close');
          document.body.click();
          await sleep(1000);
        }
        
        console.log('Date set successfully');
        return true;
      } else {
        console.error(`Could not find date cell for day ${day}`);
        // May need to navigate to the correct month
        console.log('Date might be in a different month, need to navigate');
        return false;
      }
    }
    
    console.error('Calendar body not found');
    return false;
    
  } catch (error) {
    console.error('Error setting date:', error);
    return false;
  }
}

// Click the export dropdown button
async function clickExportDropdown() {
  try {
    console.log('🎯 Looking for EXACT button: data-testid="bulk-export-index-fLhhd2"');
    
    // ONLY look for the exact button - NO FALLBACK STRATEGIES
    const exactButton = document.querySelector('button[data-testid="bulk-export-index-fLhhd2"]');
    
    if (exactButton) {
      console.log('✅ FOUND EXACT BUTTON: data-testid="bulk-export-index-fLhhd2"');
      console.log('Button details:', {
        'data-testid': exactButton.getAttribute('data-testid'),
        'data-tid': exactButton.getAttribute('data-tid'),
        'className': exactButton.className,
        'hasLaunchIcon': !!exactButton.querySelector('svg.theme-arco-icon-launch'),
        'hasOrderIcon': !!exactButton.querySelector('svg.theme-arco-icon-order')
      });
      
      try {
        exactButton.click();
        console.log('✅ EXACT BUTTON CLICKED SUCCESSFULLY');
        await sleep(2000);
        return true;
      } catch (clickError) {
        console.log('❌ Direct click failed, trying dispatchEvent...');
        exactButton.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        console.log('✅ EXACT BUTTON DISPATCH CLICK SUCCESSFUL');
        await sleep(2000);
        return true;
      }
    }
    
    // If exact button not found, STOP and debug
    console.error('❌ EXACT BUTTON NOT FOUND: data-testid="bulk-export-index-fLhhd2"');
    console.log('=== DEBUGGING: All buttons with data-testid ===');
    
    const allButtonsWithTestId = document.querySelectorAll('button[data-testid]');
    console.log(`Total buttons with data-testid found: ${allButtonsWithTestId.length}`);
    
    allButtonsWithTestId.forEach((btn, index) => {
      const testId = btn.getAttribute('data-testid');
      const hasLaunchIcon = btn.querySelector('svg.theme-arco-icon-launch') ? '✅' : '❌';
      const hasOrderIcon = btn.querySelector('svg.theme-arco-icon-order') ? '📋' : '';
      const isExactMatch = testId === 'bulk-export-index-fLhhd2' ? '🎯' : '';
      console.log(`Button ${index + 1}: ${isExactMatch} data-testid="${testId}" Launch:${hasLaunchIcon} Order:${hasOrderIcon}`);
    });
    
    console.log('=== END DEBUGGING ===');
    console.error('❌ FUNCTION FAILED - WILL NOT CLICK ANY OTHER BUTTONS');
    return false;
    
  } catch (error) {
    console.error('Error in clickExportDropdown:', error);
    return false;
  }
}

// Click the Export button in the dropdown
async function clickExportButton() {
  try {
    console.log('🎯 Looking for Export button after Real-time campaign data text...');
    
    // Wait for dropdown to appear
    await sleep(2000);
    
    // Find "Real-time campaign data" text and then look for Export button that comes right after it
    console.log('Strategy: Find Real-time campaign data text and the Export button right after it');
    
    // Use XPath to find text nodes containing "Real-time campaign data"
    const xpath = "//text()[contains(., 'Real-time campaign data')]";
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const realTimeTextNode = result.singleNodeValue;
    
    if (realTimeTextNode) {
      console.log('✅ Found Real-time campaign data text node');
      
      // Get the parent element of the text node
      const textParent = realTimeTextNode.parentElement;
      console.log('Text parent element:', textParent);
      
      // Look for the Export button in the same container or next sibling containers
      // Start from the text parent and go up to find the container that has both text and button
      let container = textParent;
      let levels = 0;
      
      while (container && levels < 5) {
        console.log(`Checking container at level ${levels}:`, container);
        
        // Look for Export buttons in this container
        const exportButtons = container.querySelectorAll('button');
        
        for (const btn of exportButtons) {
          const btnText = btn.textContent?.trim();
          const dataUid = btn.getAttribute('data-uid');
          const dataTestId = btn.getAttribute('data-testid');
          
          console.log(`Found button: "${btnText}", data-uid: ${dataUid}, data-testid: ${dataTestId}`);
          
          // Look for button with Export text and matching pattern
          if (btnText === 'Export' && 
              dataUid?.includes('bulkexportoptionsitem:button') &&
              dataTestId?.includes('bulk-export-options-item')) {
            
            console.log('✅ Found EXACT Export button after Real-time campaign data!');
            console.log('Button details:', {
              'data-uid': dataUid,
              'data-testid': dataTestId,
              'text': btnText,
              'className': btn.className
            });
            
            try {
              btn.click();
              console.log('✅ Export button clicked successfully');
              await sleep(3000);
              return true;
            } catch (clickError) {
              console.log('❌ Direct click failed, trying dispatchEvent...');
              btn.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              }));
              console.log('✅ Export button dispatch click successful');
              await sleep(3000);
              return true;
            }
          }
        }
        
        // Move up one level in the DOM
        container = container.parentElement;
        levels++;
      }
    }
    
    // Fallback 1: Look for any Export button with the specific pattern
    console.log('❌ Real-time text method failed. Fallback 1: Looking for Export buttons with specific pattern...');
    
    const allButtons = document.querySelectorAll('button[data-uid*="bulkexportoptionsitem:button"]');
    console.log(`Found ${allButtons.length} buttons with bulkexportoptionsitem pattern`);
    
    for (const btn of allButtons) {
      const btnText = btn.textContent?.trim();
      if (btnText === 'Export') {
        console.log('✅ Found Export button via fallback method');
        console.log('Button details:', {
          'data-uid': btn.getAttribute('data-uid'),
          'data-testid': btn.getAttribute('data-testid'),
          'text': btnText
        });
        
        try {
          btn.click();
          console.log('✅ Export button clicked successfully');
          await sleep(3000);
          return true;
        } catch (clickError) {
          btn.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
          console.log('✅ Export button dispatch click successful');
          await sleep(3000);
          return true;
        }
      }
    }
    
    // Fallback 2: Look for ANY Export button in the page
    console.log('❌ Specific pattern failed. Fallback 2: Looking for ANY Export button...');
    
    const allPageButtons = document.querySelectorAll('button, [role="button"]');
    console.log(`Found ${allPageButtons.length} total buttons/clickable elements`);
    
    const exportCandidates = [];
    
    for (const btn of allPageButtons) {
      const btnText = btn.textContent?.trim();
      const isVisible = window.getComputedStyle(btn).display !== 'none' && 
                       window.getComputedStyle(btn).visibility !== 'hidden';
      
      if (btnText === 'Export' && isVisible) {
        exportCandidates.push({
          button: btn,
          'data-uid': btn.getAttribute('data-uid'),
          'data-testid': btn.getAttribute('data-testid'),
          className: btn.className,
          parentText: btn.closest('div')?.textContent?.substring(0, 100) || 'No parent text'
        });
      }
    }
    
    console.log(`Found ${exportCandidates.length} Export button candidates:`, exportCandidates);
    
    // Try each candidate
    for (const candidate of exportCandidates) {
      console.log('Trying Export button candidate:', candidate);
      
      try {
        candidate.button.click();
        console.log('✅ Export button clicked successfully (generic fallback)');
        await sleep(3000);
        return true;
      } catch (clickError) {
        console.log('Direct click failed, trying dispatch...');
        candidate.button.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        console.log('✅ Export button dispatch clicked (generic fallback)');
        await sleep(3000);
        return true;
      }
    }
    
    // Fallback 3: Look for download-related buttons
    console.log('❌ Export buttons failed. Fallback 3: Looking for download-related buttons...');
    
    const downloadButtons = Array.from(allPageButtons).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      const className = btn.className?.toLowerCase() || '';
      return (text.includes('download') || className.includes('download')) && 
             window.getComputedStyle(btn).display !== 'none';
    });
    
    console.log(`Found ${downloadButtons.length} download-related buttons`);
    downloadButtons.forEach((btn, i) => {
      console.log(`Download button ${i+1}: "${btn.textContent?.trim()}"`, {
        'data-uid': btn.getAttribute('data-uid'),
        'data-testid': btn.getAttribute('data-testid')
      });
    });
    
    if (downloadButtons.length > 0) {
      console.log('Trying first download button...');
      try {
        downloadButtons[0].click();
        console.log('✅ Download button clicked successfully');
        await sleep(3000);
        return true;
      } catch (error) {
        console.log('❌ Download button click failed');
      }
    }
    
    console.error('❌ Export button not found');
    
    // Enhanced Debug info
    console.log('=== DEBUGGING INFO ===');
    console.log('All buttons with data-uid containing "bulkexportoptionsitem":');
    
    const debugButtons = document.querySelectorAll('button[data-uid*="bulkexportoptionsitem"]');
    debugButtons.forEach((btn, i) => {
      console.log(`Button ${i + 1}:`, {
        text: btn.textContent?.trim(),
        'data-uid': btn.getAttribute('data-uid'),
        'data-testid': btn.getAttribute('data-testid'),
        className: btn.className
      });
    });
    
    console.log('=== END DEBUG ===');
    
    return false;
    
  } catch (error) {
    console.error('Error clicking export button:', error);
    return false;
  }
}

// Wait for element to appear
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Element found: ${selector}`);
      return element;
    }
    await sleep(100);
  }
  
  console.log(`Element not found after ${timeout}ms: ${selector}`);
  return null;
}

// Wait for data to load
async function waitForDataLoad() {
  console.log('Waiting for data to load...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    // Check for loading indicators
    const loadingIndicators = document.querySelectorAll(
      '.loading, .spinner, [class*="loading"], [class*="spinner"], [class*="skeleton"], .theme-arco-spin'
    );
    
    // Check if loading indicators are gone
    const hasVisibleLoading = Array.from(loadingIndicators).some(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    if (!hasVisibleLoading) {
      // Check if data is present (look for metrics or table data)
      const hasData = document.querySelector(
        '.cost-section, [class*="metric"], [class*="revenue"], table, [role="table"], [class*="USD"]'
      );
      
      if (hasData) {
        console.log('Data loaded successfully');
        await sleep(1000); // Extra wait to ensure everything is settled
        return true;
      }
    }
    
    await sleep(500);
    attempts++;
  }
  
  console.log('Data load timeout, proceeding anyway');
  return true;
}

// Wait for download to complete
async function waitForDownloadComplete() {
  console.log('Waiting for download to complete...');
  
  // Wait a fixed amount of time for download to start and complete
  // Could be enhanced with Chrome Downloads API monitoring
  await sleep(5000);
  
  return true;
}

// Utility function: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Monitor page changes (for SPA navigation)
const observer = new MutationObserver(() => {
  // Check if we're on the right page
  if (window.location.href.includes('tiktokglobalshop.com/ads-creation') || 
      window.location.href.includes('ads.tiktok.com')) {
    // Page is ready
    console.log('TikTok Shop Ads page detected');
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Alternative: Monitor for direct file downloads using Chrome Downloads API
async function monitorDownloads() {
  console.log('🔍 Setting up download monitoring...');
  
  // Send message to background script to start monitoring downloads
  chrome.runtime.sendMessage({
    action: 'startDownloadMonitoring',
    date: currentDownloadState.currentDate
  });
}

// Enhanced download detection - monitor DOM for download links AND blob URLs
function monitorDownloadLinks() {
  console.log('🔍 Monitoring for download links and blob URLs...');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check for ALL download links including blob URLs
          const downloadLinks = node.querySelectorAll('a[download], a[href*=".xlsx"], a[href*=".xls"], a[href*="export"], a[href*="download"], a[href^="blob:"]');
          
          downloadLinks.forEach((link) => {
            console.log('🔗 Download link detected:', {
              href: link.href,
              download: link.download,
              text: link.textContent?.trim(),
              isBlob: link.href.startsWith('blob:')
            });
            
            // Auto-click if it's an Excel file OR a blob URL
            if (link.href.includes('.xlsx') || link.href.includes('.xls') || 
                link.download?.includes('.xlsx') || link.download?.includes('.xls') ||
                link.href.startsWith('blob:')) {
              
              console.log('📁 Auto-clicking file download link...');
              
              // Try to intercept blob URL before clicking
              if (link.href.startsWith('blob:')) {
                console.log('🧬 Blob URL detected, attempting to read:', link.href);
                interceptBlobUrl(link.href, link.download || 'unknown.xlsx');
              }
              
              setTimeout(() => {
                link.click();
              }, 1000);
            }
          });
          
          // Check for new buttons that might be export buttons
          const newButtons = node.querySelectorAll('button');
          newButtons.forEach((btn) => {
            const text = btn.textContent?.toLowerCase() || '';
            if (text.includes('export') || text.includes('download')) {
              console.log('🆕 New export/download button detected:', {
                text: btn.textContent?.trim(),
                'data-uid': btn.getAttribute('data-uid'),
                'data-testid': btn.getAttribute('data-testid')
              });
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Download link and blob URL monitoring started');
}

// Intercept blob URLs to get file data
async function interceptBlobUrl(blobUrl, filename) {
  try {
    console.log('🧬 Attempting to read blob URL:', blobUrl);
    
    const response = await fetch(blobUrl);
    const contentType = response.headers.get('content-type') || '';
    
    console.log('🧬 Blob response:', {
      contentType,
      size: response.headers.get('content-length'),
      filename
    });
    
    // Check if it's an Excel file
    if (filename?.includes('.xlsx') || filename?.includes('.xls') || 
        contentType.includes('spreadsheet') || contentType.includes('excel')) {
      
      console.log('📊 Excel blob detected, reading data...');
      const arrayBuffer = await response.arrayBuffer();
      
      console.log('📊 Excel blob data captured, size:', arrayBuffer.byteLength, 'bytes');
      
      // Send to background script
      chrome.runtime.sendMessage({
        action: 'csvDataCaptured',
        csvData: arrayBuffer,
        date: currentDownloadState.currentDate,
        url: blobUrl,
        fileType: 'excel'
      });
      
    } else {
      console.log('📄 Non-Excel blob, trying as CSV...');
      const text = await response.text();
      
      if (text.includes(',') && text.includes('\n')) {
        console.log('📄 CSV blob data captured, length:', text.length);
        
        chrome.runtime.sendMessage({
          action: 'csvDataCaptured',
          csvData: text,
          date: currentDownloadState.currentDate,
          url: blobUrl,
          fileType: 'csv'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error reading blob URL:', error);
  }
}

// Start monitoring when content script loads
setTimeout(() => {
  monitorDownloadLinks();
}, 3000);

// Manual trigger function for testing
window.triggerExportMonitoring = function() {
  console.log('🧪 Manual export monitoring triggered');
  monitorDownloadLinks();
  monitorDownloads();
};

// Test network interception immediately
setTimeout(() => {
  console.log('🧪 Testing network interception...');
  fetch('/favicon.ico')
    .then(() => console.log('✅ Network interception working'))
    .catch(() => console.log('❌ Network interception test failed'));
}, 1000);

// Log that content script is ready
console.log('Content script initialized and ready for commands');
console.log('💡 Manual test: triggerExportMonitoring()');
console.log('💡 Manual test: testNetworkMonitoring()');