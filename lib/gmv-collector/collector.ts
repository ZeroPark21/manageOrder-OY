import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CollectorConfig {
  headless: boolean;
  sessionPath: string;
  downloadPath: string;
  sellerCenterUrl: string;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export class TikTokGMVCollector {
  private config: CollectorConfig;
  private browser: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = {
      headless: false, // 로그인 상태 확인을 위해 기본적으로 헤드리스 모드 비활성화
      sessionPath: './tiktok-session',
      downloadPath: './downloads',
      sellerCenterUrl: 'https://seller.us.tiktokglobalshop.com',
      ...config
    };
  }

  async initialize() {
    // 다운로드 디렉토리 생성
    await fs.mkdir(this.config.downloadPath, { recursive: true });

    // 브라우저 시작
    this.browser = await chromium.launchPersistentContext(this.config.sessionPath, {
      headless: this.config.headless,
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: true,
      downloadsPath: this.config.downloadPath,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    this.page = this.browser.pages()[0] || await this.browser.newPage();
  }

  async validateSession(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(this.config.sellerCenterUrl, { waitUntil: 'networkidle' });
      
      // 로그인 상태 확인
      const isLoggedIn = await this.page.evaluate(() => {
        // 로그인된 상태를 나타내는 요소 확인
        const doc = (globalThis as any).document;
        return !!doc.querySelector('[class*="user-avatar"]') || 
               !!doc.querySelector('[class*="account-info"]') ||
               !!doc.querySelector('[class*="UserAvatar"]') ||
               !!doc.querySelector('.navbar-user-info');
      });

      if (!isLoggedIn) {
        console.log('❌ 로그인이 필요합니다. 자동 로그인을 시도합니다.');
        
        try {
          // 로그인 페이지로 이동
          const loginUrl = `${this.config.sellerCenterUrl}/account/login`;
          console.log(`🌐 로그인 페이지로 이동: ${loginUrl}`);
          await this.page.goto(loginUrl, { waitUntil: 'networkidle' });
          
          // 스크린샷 저장 (디버깅용)
          await this.page.screenshot({ path: 'login-page.png', fullPage: true });
          console.log('📷 로그인 페이지 스크린샷 저장: login-page.png');
          
          // "Log in with email" 버튼 찾기
          console.log('🔍 "Log in with email" 버튼 찾기 시도...');
          
          // 다양한 셀렉터 시도
          const emailLoginSelectors = [
            'button:has-text("Log in with email")',
            'button:has-text("Email")',
            '[data-testid="email-login"]',
            '.login-method-email',
            'button[aria-label*="email"]',
            'div[role="button"]:has-text("email")',
            'span:has-text("Log in with email")'
          ];
          
          let emailButtonClicked = false;
          for (const selector of emailLoginSelectors) {
            try {
              await this.page.waitForSelector(selector, { timeout: 3000 });
              await this.page.click(selector);
              console.log(`✅ 셀렉터 성공: ${selector}`);
              emailButtonClicked = true;
              break;
            } catch (e) {
              console.log(`❌ 셀렉터 실패: ${selector}`);
            }
          }
          
          if (!emailButtonClicked) {
            // 직접 이메일 필드가 있는지 확인
            console.log('🔍 직접 이메일 필드 찾기 시도...');
          }
          
          // 이메일 입력
          await this.delay(1000);
          const emailInput = await this.page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]').first();
          await emailInput.fill('oliveyoung@cosduck.com');
          console.log('✅ 이메일 입력 완료');
          
          // 비밀번호 입력
          const passwordInput = await this.page.locator('input[type="password"], input[name="password"], input[placeholder*="password"], input[placeholder*="Password"]').first();
          await passwordInput.fill('phozphoz1!');
          console.log('✅ 비밀번호 입력 완료');
          
          // 로그인 버튼 클릭
          const loginButton = await this.page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("로그인")').first();
          await loginButton.click();
          console.log('✅ 로그인 버튼 클릭');
          
          // 로그인 완료 대기
          await this.page.waitForURL('**/dashboard/**', { timeout: 30000 });
          console.log('✅ 자동 로그인 완료');
        } catch (error) {
          console.log('⚠️ 자동 로그인 실패. 브라우저에서 수동으로 로그인해주세요.');
          // 사용자가 로그인할 때까지 대기
          await this.page.waitForURL('**/dashboard/**', { timeout: 300000 }); // 5분 대기
          console.log('✅ 수동 로그인 완료');
        }
      }

      return true;
    } catch (error) {
      console.error('세션 검증 실패:', error);
      return false;
    }
  }

  async collectDailyData(date: string): Promise<string | null> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      console.log(`📊 ${date} 데이터 수집 시작...`);

      // TikTok Ads 대시보드로 이동
      await this.page.goto(`${this.config.sellerCenterUrl}/ads-creation/dashboard`, {
        waitUntil: 'networkidle'
      });

      // 날짜 선택기 대기 및 클릭
      await this.page.waitForSelector('.date-picker-trigger, [class*="DatePicker"]', { timeout: 10000 });
      await this.page.click('.date-picker-trigger, [class*="DatePicker"]');
      
      // 날짜 입력 방식 확인 후 처리
      try {
        // Custom 날짜 옵션이 있는지 확인
        const customOption = await this.page.locator('text="Custom"').or(this.page.locator('text="사용자 지정"')).first();
        if (await customOption.isVisible()) {
          await customOption.click();
        }
      } catch (e) {
        console.log('Custom 옵션을 찾을 수 없음, 직접 날짜 입력 시도');
      }
      
      // 날짜 입력 필드 찾기 및 입력
      const dateInputs = await this.page.locator('input[type="date"], input[placeholder*="date"], input[placeholder*="날짜"]').all();
      if (dateInputs.length >= 2) {
        await dateInputs[0].fill(date);
        await dateInputs[1].fill(date);
      } else {
        // 단일 날짜 선택기인 경우
        await dateInputs[0].fill(date);
      }
      
      // 적용/확인 버튼 클릭
      const applyButton = await this.page.locator('button:has-text("Apply"), button:has-text("적용"), button:has-text("확인")').first();
      await applyButton.click();
      
      // 데이터 로딩 대기
      await this.page.waitForLoadState('networkidle');
      await this.delay(2000); // 추가 대기

      // 다운로드/내보내기 버튼 찾기 및 클릭
      const downloadPromise = this.page.waitForEvent('download');
      
      // 다양한 다운로드 버튼 셀렉터 시도
      const exportButton = await this.page.locator(
        'button:has-text("Export"), button:has-text("Download"), button:has-text("내보내기"), button:has-text("다운로드"), [class*="export"], [class*="download"]'
      ).first();
      
      await exportButton.click();
      
      // 다운로드 완료 대기
      const download = await downloadPromise;
      const suggestedFilename = download.suggestedFilename();
      const filePath = path.join(this.config.downloadPath, `gmv_${date}_${suggestedFilename}`);
      
      await download.saveAs(filePath);
      console.log(`✅ ${date} 데이터 다운로드 완료: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error(`❌ ${date} 데이터 수집 실패:`, error);
      return null;
    }
  }

  async collectDateRange(startDate: string, endDate: string): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const dates = this.getDatesBetween(startDate, endDate);

    for (const date of dates) {
      const filePath = await this.collectDailyData(date);
      if (filePath) {
        results.set(date, filePath);
      }
      
      // API 제한을 피하기 위한 딜레이
      await this.delay(5000 + Math.random() * 3000); // 5-8초 랜덤 딜레이
    }

    return results;
  }

  private getDatesBetween(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 수집 작업 큐 관리
export class CollectionQueue {
  private queue: DateRange[] = [];
  private processing = false;
  private collector: TikTokGMVCollector;

  constructor(collector: TikTokGMVCollector) {
    this.collector = collector;
  }

  addToQueue(dateRange: DateRange) {
    this.queue.push(dateRange);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const range = this.queue.shift()!;
      await this.collector.collectDateRange(range.startDate, range.endDate);
    }

    this.processing = false;
  }

  getQueueStatus() {
    return {
      pending: this.queue.length,
      processing: this.processing
    };
  }
}