// Test script to verify export dropdown button finding (with launch icon)
// Run this in the browser console on the TikTok Ads page

console.log('🧪 Testing Export Dropdown Button Finder (Launch Icon Version)...');

function testButtonFinder() {
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
    console.log('Button element:', exactButton);
    return { success: true, button: exactButton, strategy: 'exact-match' };
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
    const allSvgClasses = Array.from(btn.querySelectorAll('svg')).map(svg => svg.className).join(', ');
    console.log(`Button ${index + 1}: ${isExactMatch} data-testid="${testId}" Launch:${hasLaunchIcon} Order:${hasOrderIcon}`);
    console.log(`    SVG Classes: ${allSvgClasses}`);
  });
  
  console.log('=== END DEBUGGING ===');
  console.error('❌ TEST FAILED - EXACT BUTTON NOT FOUND');
  return { success: false, button: null, strategy: null };
}

// Run the test
const result = testButtonFinder();

if (result.success) {
  console.log(`🎉 SUCCESS! Found button using strategy ${result.strategy}`);
  console.log('Button details:', {
    'data-testid': result.button.getAttribute('data-testid'),
    'data-tid': result.button.getAttribute('data-tid'),
    'classes': result.button.className,
    'text': result.button.textContent?.trim(),
    'hasLaunchIcon': !!result.button.querySelector('svg.theme-arco-icon-launch')
  });
} else {
  console.log('❌ FAILED to find the correct export button');
}

// Test function for the second Export button (in dropdown)
function testExportButtonInDropdown() {
  console.log('🎯 Testing Export button in dropdown (after Real-time campaign data)...');
  
  // Find "Real-time campaign data" text
  const xpath = "//text()[contains(., 'Real-time campaign data')]";
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const realTimeTextNode = result.singleNodeValue;
  
  if (realTimeTextNode) {
    console.log('✅ Found Real-time campaign data text');
    
    // Look up the DOM tree to find Export buttons
    let container = realTimeTextNode.parentElement;
    let levels = 0;
    
    while (container && levels < 5) {
      const exportButtons = container.querySelectorAll('button');
      
      for (const btn of exportButtons) {
        const btnText = btn.textContent?.trim();
        const dataUid = btn.getAttribute('data-uid');
        const dataTestId = btn.getAttribute('data-testid');
        
        if (btnText === 'Export' && 
            dataUid?.includes('bulkexportoptionsitem:button') &&
            dataTestId?.includes('bulk-export-options-item')) {
          
          console.log('✅ Found Export button in dropdown!');
          console.log('Button details:', {
            'data-uid': dataUid,
            'data-testid': dataTestId,
            'text': btnText,
            'className': btn.className
          });
          
          return { success: true, button: btn };
        }
      }
      
      container = container.parentElement;
      levels++;
    }
  }
  
  // Fallback method
  console.log('🎯 Fallback: Looking for Export buttons with specific pattern...');
  const allButtons = document.querySelectorAll('button[data-uid*="bulkexportoptionsitem:button"]');
  
  for (const btn of allButtons) {
    const btnText = btn.textContent?.trim();
    if (btnText === 'Export') {
      console.log('✅ Found Export button via fallback');
      console.log('Button details:', {
        'data-uid': btn.getAttribute('data-uid'),
        'data-testid': btn.getAttribute('data-testid'),
        'text': btnText
      });
      
      return { success: true, button: btn };
    }
  }
  
  console.error('❌ Export button in dropdown not found');
  
  // Debug info
  console.log('=== DEBUG: All bulkexportoptionsitem buttons ===');
  const debugButtons = document.querySelectorAll('button[data-uid*="bulkexportoptionsitem"]');
  debugButtons.forEach((btn, i) => {
    console.log(`Button ${i + 1}:`, {
      text: btn.textContent?.trim(),
      'data-uid': btn.getAttribute('data-uid'),
      'data-testid': btn.getAttribute('data-testid')
    });
  });
  
  return { success: false, button: null };
}

// Manual click functions
window.clickExportDropdownButton = function() {
  console.log('🎯 Manual click attempt on export dropdown button...');
  
  const testResult = testButtonFinder();
  
  if (testResult.success) {
    console.log('✅ Found button, attempting click...');
    try {
      testResult.button.click();
      console.log('✅ Button clicked successfully!');
      return true;
    } catch (error) {
      console.log('❌ Direct click failed, trying dispatchEvent...');
      testResult.button.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      console.log('✅ Dispatch click completed!');
      return true;
    }
  }
  
  console.log('❌ Manual click failed - button not found');
  return false;
};

window.clickExportButtonInDropdown = function() {
  console.log('🎯 Manual click attempt on Export button in dropdown...');
  
  const testResult = testExportButtonInDropdown();
  
  if (testResult.success) {
    console.log('✅ Found Export button, attempting click...');
    try {
      testResult.button.click();
      console.log('✅ Export button clicked successfully!');
      return true;
    } catch (error) {
      console.log('❌ Direct click failed, trying dispatchEvent...');
      testResult.button.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      console.log('✅ Export button dispatch click completed!');
      return true;
    }
  }
  
  console.log('❌ Manual click failed - Export button not found');
  return false;
};

// Export the test functions for manual use
window.testButtonFinder = testButtonFinder;
window.testExportButtonInDropdown = testExportButtonInDropdown;

// Test comprehensive export button detection
window.testAllExportButtons = function() {
  console.log('🔍 전체 Export 버튼 탐색 시작...');
  
  // 1. 먼저 드롭다운 열기
  const dropdownBtn = document.querySelector('button[data-testid="bulk-export-index-fLhhd2"]');
  if (dropdownBtn) {
    console.log('✅ 드롭다운 버튼 발견, 클릭 중...');
    dropdownBtn.click();
    
    setTimeout(() => {
      console.log('=== 드롭다운 열린 후 전체 분석 ===');
      
      // 2. 모든 버튼 검색
      const allButtons = document.querySelectorAll('button, [role="button"], a');
      console.log(`총 ${allButtons.length}개 클릭 가능한 요소 발견`);
      
      // 3. Export 관련 요소들 찾기
      const exportRelated = [];
      
      allButtons.forEach((btn, i) => {
        const text = btn.textContent?.trim().toLowerCase() || '';
        const className = btn.className?.toLowerCase() || '';
        const dataUid = btn.getAttribute('data-uid') || '';
        const dataTestId = btn.getAttribute('data-testid') || '';
        
        if (text.includes('export') || text.includes('download') || 
            className.includes('export') || className.includes('download') ||
            dataUid.includes('export') || dataTestId.includes('export')) {
          
          const isVisible = window.getComputedStyle(btn).display !== 'none' && 
                           window.getComputedStyle(btn).visibility !== 'hidden';
          
          exportRelated.push({
            index: i,
            element: btn,
            text: btn.textContent?.trim(),
            visible: isVisible,
            'data-uid': dataUid,
            'data-testid': dataTestId,
            className: btn.className,
            tagName: btn.tagName
          });
        }
      });
      
      console.log(`🎯 Export/Download 관련 요소 ${exportRelated.length}개 발견:`);
      exportRelated.forEach((item, i) => {
        console.log(`${i+1}. ${item.text} (${item.visible ? '✅ 보임' : '❌ 숨김'})`, item);
      });
      
      // 4. 각 요소를 테스트할 수 있는 함수 제공
      window.testClickExportButton = function(index) {
        if (index < exportRelated.length) {
          const item = exportRelated[index];
          console.log(`🧪 Export 버튼 ${index+1} 클릭 테스트:`, item.text);
          
          try {
            item.element.click();
            console.log('✅ 클릭 성공!');
            return true;
          } catch (error) {
            console.log('❌ 클릭 실패:', error);
            return false;
          }
        } else {
          console.log('❌ 잘못된 인덱스');
          return false;
        }
      };
      
      console.log('💡 테스트 방법: testClickExportButton(0) ~ testClickExportButton(' + (exportRelated.length-1) + ')');
      
    }, 2000);
  } else {
    console.log('❌ 드롭다운 버튼을 찾을 수 없습니다');
  }
};

// Test Excel file detection
window.testExcelDetection = function() {
  console.log('🧪 Testing Excel file detection...');
  
  // Simulate network requests to test detection
  console.log('Checking current network activity...');
  
  // Monitor for Excel downloads
  const originalFetch = window.fetch;
  let interceptCount = 0;
  
  window.fetch = async function(...args) {
    interceptCount++;
    console.log(`Intercepted request ${interceptCount}:`, args[0]);
    
    const response = await originalFetch.apply(this, args);
    
    // Check if this matches Excel patterns
    const url = args[0];
    const contentType = response.headers.get('content-type') || '';
    const contentDisposition = response.headers.get('content-disposition') || '';
    
    const isExcel = url?.includes('.xlsx') || url?.includes('.xls') || 
                    contentType.includes('spreadsheet') || contentType.includes('excel') ||
                    contentDisposition.includes('.xlsx') || contentDisposition.includes('.xls');
    
    if (isExcel) {
      console.log('🎯 Excel file detected!', {
        url,
        contentType,
        contentDisposition
      });
    }
    
    return response;
  };
  
  console.log('Excel detection monitoring enabled. Download a file to test.');
  
  // Restore original fetch after 30 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('Excel detection test completed.');
  }, 30000);
  
  return true;
};

// Test network monitoring
window.testNetworkMonitoring = function() {
  console.log('🧪 Testing network monitoring...');
  
  let requestCount = 0;
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    requestCount++;
    const url = args[0];
    console.log(`🌐 Request ${requestCount}: ${typeof url === 'string' ? url.substring(0, 100) : url}...`);
    
    const response = await originalFetch.apply(this, args);
    
    // Log response details for debugging
    const contentType = response.headers.get('content-type') || '';
    const contentDisposition = response.headers.get('content-disposition') || '';
    
    if (contentType || contentDisposition) {
      console.log(`📝 Response ${requestCount}:`, {
        contentType,
        contentDisposition,
        status: response.status,
        url: typeof url === 'string' ? url.substring(0, 50) : 'non-string'
      });
    }
    
    return response;
  };
  
  console.log('✅ Network monitoring test active for 60 seconds');
  
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log(`🏁 Network test completed. Intercepted ${requestCount} requests.`);
  }, 60000);
  
  return true;
};

// Diagnostic function to check content script status
window.checkContentScriptStatus = function() {
  console.log('🔍 Content Script Status Check:');
  console.log('  - Loaded:', !!window.tiktokAdsAutoDownloaderLoaded);
  console.log('  - Original fetch backed up:', !!window.originalFetchBackup);
  console.log('  - Current fetch function:', window.fetch.toString().substring(0, 100) + '...');
  console.log('  - Download monitoring active:', !!window.monitorDownloadLinks);
  
  // Test if network interception works
  console.log('🧪 Testing network interception...');
  let testPassed = false;
  
  const originalLog = console.log;
  console.log = function(...args) {
    if (args[0] && args[0].includes('🌐 Fetch request')) {
      testPassed = true;
      console.log = originalLog;
      originalLog('✅ Network interception is working!');
    }
    originalLog.apply(this, args);
  };
  
  fetch('/favicon.ico').then(() => {
    setTimeout(() => {
      if (!testPassed) {
        console.log = originalLog;
        console.log('❌ Network interception is NOT working');
      }
    }, 1000);
  });
  
  return {
    loaded: !!window.tiktokAdsAutoDownloaderLoaded,
    fetchBacked: !!window.originalFetchBackup,
    monitoringActive: !!window.monitorDownloadLinks
  };
};

console.log('💡 Available functions:');
console.log('  - checkContentScriptStatus() - 🔥 NEW: Check if content script is working properly');
console.log('  - testButtonFinder() - Test dropdown button detection');
console.log('  - testExportButtonInDropdown() - Test Export button in dropdown');
console.log('  - clickExportDropdownButton() - Click the dropdown button');
console.log('  - clickExportButtonInDropdown() - Click the Export button in dropdown');
console.log('  - testAllExportButtons() - 🔥 NEW: Find all export/download buttons');
console.log('  - testNetworkMonitoring() - 🔥 NEW: Monitor all network requests for 60s');
console.log('  - testExcelDetection() - Test Excel file detection and processing');