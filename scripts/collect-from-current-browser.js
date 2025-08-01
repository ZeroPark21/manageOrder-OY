const { chromium } = require('playwright');

async function collectFromCurrentBrowser() {
  console.log('🌐 현재 브라우저에 연결을 시도합니다...');
  console.log('📌 다음 단계를 따라주세요:');
  console.log('');
  console.log('1. Chrome 브라우저에서 다음 명령을 실행하세요:');
  console.log('   Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
  console.log('   또는 이미 열려있는 Chrome에서 chrome://version 접속 후 명령줄 확인');
  console.log('');
  console.log('2. TikTok Seller Center Ads Dashboard 페이지로 이동');
  console.log('   https://seller.us.tiktokglobalshop.com/ads-creation/dashboard');
  console.log('');
  console.log('3. 이 스크립트를 다시 실행하세요');
  console.log('');

  try {
    // Chrome DevTools Protocol로 연결
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ 브라우저에 연결되었습니다!');

    // 현재 열려있는 페이지들 확인
    const contexts = browser.contexts();
    console.log(`📄 ${contexts.length}개의 컨텍스트 발견`);

    for (const context of contexts) {
      const pages = context.pages();
      console.log(`📑 ${pages.length}개의 탭 발견`);

      for (const page of pages) {
        const url = page.url();
        console.log(`🔍 탭 URL: ${url}`);

        // TikTok Seller Center 페이지 찾기
        if (url.includes('tiktokglobalshop.com')) {
          console.log('✅ TikTok Seller Center 페이지를 찾았습니다!');
          
          // 현재 페이지에서 데이터 수집
          await collectDataFromPage(page);
          return;
        }
      }
    }

    console.log('❌ TikTok Seller Center 페이지를 찾을 수 없습니다.');
    console.log('브라우저에서 해당 페이지를 열어주세요.');

  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.log('❌ Chrome이 디버그 모드로 실행되지 않았습니다.');
      console.log('위의 안내를 참고하여 Chrome을 디버그 모드로 실행해주세요.');
    } else {
      console.error('오류 발생:', error);
    }
  }
}

async function collectDataFromPage(page) {
  try {
    console.log('📊 데이터 수집을 시작합니다...');
    
    // 날짜 입력을 위한 대화형 프롬프트
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const targetDate = await new Promise((resolve) => {
      rl.question('수집할 날짜를 입력하세요 (YYYY-MM-DD): ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    console.log(`📅 ${targetDate} 데이터를 수집합니다...`);

    // 날짜 선택기 찾기 및 클릭
    try {
      // 다양한 날짜 선택기 셀렉터 시도
      const datePickerSelectors = [
        '.date-picker-trigger',
        '[class*="DatePicker"]',
        '[class*="date-range"]',
        'button:has-text("Date")',
        'input[type="date"]'
      ];

      let datePickerFound = false;
      for (const selector of datePickerSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          console.log('✅ 날짜 선택기를 찾았습니다');
          datePickerFound = true;
          break;
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }

      if (!datePickerFound) {
        console.log('⚠️ 날짜 선택기를 자동으로 찾을 수 없습니다.');
        console.log('📌 수동으로 날짜를 선택해주세요:');
        console.log(`   1. 날짜 범위를 ${targetDate} ~ ${targetDate}로 설정`);
        console.log('   2. Enter 키를 눌러 계속 진행');
        
        await new Promise((resolve) => {
          rl.question('날짜 설정 완료 후 Enter: ', () => {
            resolve();
          });
        });
      }

    } catch (error) {
      console.log('날짜 선택 중 오류:', error.message);
    }

    // 다운로드 버튼 찾기
    console.log('📥 다운로드 버튼을 찾고 있습니다...');
    
    const downloadSelectors = [
      'button:has-text("Export")',
      'button:has-text("Download")',
      'button:has-text("내보내기")',
      '[class*="export"]',
      '[class*="download"]',
      'button[aria-label*="export"]',
      'button[aria-label*="download"]'
    ];

    // 다운로드 대기
    const downloadPath = './downloads/gmv';
    await page.context().browser().newContext({
      acceptDownloads: true,
      downloadsPath: downloadPath
    });

    let downloadStarted = false;
    for (const selector of downloadSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          console.log('✅ 다운로드 버튼을 찾았습니다');
          
          // 다운로드 이벤트 대기
          const downloadPromise = page.waitForEvent('download');
          await button.click();
          
          const download = await downloadPromise;
          const fileName = `gmv_${targetDate}_${download.suggestedFilename()}`;
          const filePath = `${downloadPath}/${fileName}`;
          
          await download.saveAs(filePath);
          console.log(`✅ 파일 다운로드 완료: ${filePath}`);
          
          // 자동으로 파싱 및 업로드
          const { spawn } = require('child_process');
          const processFile = spawn('node', ['scripts/process-gmv-file.js', filePath, targetDate]);
          
          processFile.stdout.on('data', (data) => {
            console.log(data.toString());
          });
          
          processFile.stderr.on('data', (data) => {
            console.error(data.toString());
          });
          
          downloadStarted = true;
          break;
        }
      } catch (e) {
        // 다음 셀렉터 시도
      }
    }

    if (!downloadStarted) {
      console.log('⚠️ 다운로드 버튼을 찾을 수 없습니다.');
      console.log('📌 수동으로 Export/Download 버튼을 클릭해주세요.');
      console.log('   다운로드된 파일은 downloads/gmv 폴더에 저장하세요.');
    }

  } catch (error) {
    console.error('데이터 수집 중 오류:', error);
  }
}

// 실행
if (require.main === module) {
  collectFromCurrentBrowser();
}