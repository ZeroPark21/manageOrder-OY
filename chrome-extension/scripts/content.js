// TikTok Ads Auto Downloader - Content Script
console.log('TikTok Ads Auto Downloader content script loaded');

// Current download state
let currentDownloadState = {
  isProcessing: false,
  currentDate: null,
  retryCount: 0,
  maxRetries: 3
};

// Intercept network requests to catch CSV downloads
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  // Check if this is a CSV export request
  const url = args[0];
  if (typeof url === 'string' && 
      (url.includes('export') || url.includes('download')) &&
      (url.includes('csv') || response.headers.get('content-type')?.includes('csv') || 
       response.headers.get('content-disposition')?.includes('csv'))) {
    
    console.log('CSV export detected:', url);
    
    // Clone the response so we can read it without affecting the original download
    const clonedResponse = response.clone();
    
    try {
      const csvData = await clonedResponse.text();
      console.log('CSV data captured, length:', csvData.length);
      
      // Send CSV data to background script for processing
      chrome.runtime.sendMessage({
        action: 'csvDataCaptured',
        csvData: csvData,
        date: currentDownloadState.currentDate,
        url: url
      });
      
    } catch (error) {
      console.error('Error processing CSV data:', error);
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
    
    // Check if this is a CSV response
    if (typeof url === 'string' && 
        (url.includes('export') || url.includes('download')) &&
        (contentType.includes('csv') || contentDisposition.includes('csv') || xhr.responseText?.includes(','))) {
      
      console.log('CSV export detected via XHR:', url);
      
      try {
        const csvData = xhr.responseText;
        if (csvData && csvData.length > 100) { // Basic validation
          console.log('CSV data captured via XHR, length:', csvData.length);
          
          chrome.runtime.sendMessage({
            action: 'csvDataCaptured',
            csvData: csvData,
            date: currentDownloadState.currentDate,
            url: url
          });
        }
      } catch (error) {
        console.error('Error processing XHR CSV data:', error);
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
    console.log('🎯 Looking for EXACT export dropdown button: bulk-export-index-fLhhd2');
    
    // ONLY look for the exact button - no other methods
    const correctButton = document.querySelector('button[data-testid="bulk-export-index-fLhhd2"]');
    
    if (correctButton) {
      console.log('✅ FOUND CORRECT EXPORT BUTTON: data-testid="bulk-export-index-fLhhd2"');
      console.log('Button element:', correctButton);
      
      try {
        correctButton.click();
        console.log('✅ Export dropdown clicked successfully');
        await sleep(2000);
        return true;
      } catch (clickError) {
        console.log('❌ Direct click failed, trying dispatchEvent...');
        correctButton.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        console.log('✅ Export dropdown dispatch click successful');
        await sleep(2000);
        return true;
      }
    }
    
    // If exact button not found, log all buttons for debugging
    console.error('❌ EXACT BUTTON NOT FOUND: data-testid="bulk-export-index-fLhhd2"');
    console.log('=== DEBUGGING: All buttons with data-testid ===');
    
    const allButtonsWithTestId = document.querySelectorAll('button[data-testid]');
    allButtonsWithTestId.forEach((btn, index) => {
      const testId = btn.getAttribute('data-testid');
      console.log(`Button ${index + 1}: data-testid="${testId}"`);
    });
    
    console.log('=== END DEBUGGING ===');
    return false;
    
  } catch (error) {
    console.error('Error clicking export dropdown:', error);
    return false;
  }
}

// Click the Export button in the dropdown
async function clickExportButton() {
  try {
    console.log('🎯 Looking for Export button in Real-time campaign data container...');
    
    // Wait for dropdown to appear
    await sleep(2000);
    
    // Priority 1: Find by exact data-uid first  
    const exactButton = document.querySelector('button[data-uid="bulkexportoptionsitem:button:b1c07"]');
    if (exactButton) {
      console.log('✅ FOUND EXACT Export button by data-uid="bulkexportoptionsitem:button:b1c07"');
      exactButton.click();
      console.log('✅ Export button clicked successfully');
      await sleep(3000);
      return true;
    }
    
    // Priority 2: Find container with "Real-time campaign data" text
    console.log('Looking for Real-time campaign data container...');
    
    // Get all elements and find the one containing "Real-time campaign data"
    const allDivs = document.querySelectorAll('div');
    let exportButton = null;
    
    for (const div of allDivs) {
      // Check if this div contains "Real-time campaign data" text
      if (div.textContent?.includes('Real-time campaign data')) {
        // Look for button within this container
        const buttons = div.querySelectorAll('button');
        for (const btn of buttons) {
          // Check if button has Export text
          if (btn.textContent?.trim() === 'Export' || 
              btn.querySelector('span')?.textContent?.trim() === 'Export') {
            // Make sure it's not the dropdown trigger (no SVG icon)
            if (!btn.querySelector('svg')) {
              exportButton = btn;
              console.log('✅ Found Export button in Real-time campaign data container');
              console.log('Button data-uid:', btn.getAttribute('data-uid'));
              console.log('Button text:', btn.textContent);
              break;
            }
          }
        }
        if (exportButton) break;
      }
    }
    
    if (exportButton) {
      console.log('🎯 Clicking Export button...');
      try {
        exportButton.click();
        console.log('✅ Export button clicked successfully');
      } catch (e) {
        console.log('Direct click failed, using dispatchEvent...');
        exportButton.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        console.log('✅ Export button clicked via dispatchEvent');
      }
      await sleep(3000);
      return true;
    }
    
    // Priority 3: Fallback - look for any button with specific class pattern
    console.log('Trying fallback method...');
    const fallbackButton = document.querySelector('button[data-uid*="bulkexportoptionsitem:button"]');
    if (fallbackButton && fallbackButton.textContent?.includes('Export')) {
      console.log('✅ Found Export button by fallback method');
      console.log('Button data-uid:', fallbackButton.getAttribute('data-uid'));
      fallbackButton.click();
      await sleep(3000);
      return true;
    }
    
    console.error('❌ Export button not found after all attempts');
    
    // Debug info
    console.log('=== DEBUGGING INFO ===');
    const debugButtons = document.querySelectorAll('button');
    let exportCount = 0;
    debugButtons.forEach(btn => {
      if (btn.textContent?.includes('Export')) {
        exportCount++;
        console.log(`Export button ${exportCount}:`, {
          'data-uid': btn.getAttribute('data-uid'),
          'data-testid': btn.getAttribute('data-testid'),
          'text': btn.textContent?.trim(),
          'has-svg': !!btn.querySelector('svg')
        });
      }
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
const observer = new MutationObserver((mutations) => {
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

// Log that content script is ready
console.log('Content script initialized and ready for commands');