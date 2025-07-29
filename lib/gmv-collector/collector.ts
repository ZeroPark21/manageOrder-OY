import { chromium, Browser, Page } from 'playwright';
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
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = {
      headless: false, // 로그인 상태 확인을 위해 기본적으로 헤드리스 모드 비활성화
      sessionPath: './tiktok-session',
      downloadPath: './downloads',
      sellerCenterUrl: 'https://seller-us.tiktok.com',
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

    this.page = await this.browser.newPage();
  }

  async validateSession(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      await this.page.goto(this.config.sellerCenterUrl, { waitUntil: 'networkidle' });
      
      // 로그인 상태 확인 (셀렉터는 실제 TikTok Seller Center에 맞게 조정 필요)
      const isLoggedIn = await this.page.evaluate(() => {
        // 로그인된 상태를 나타내는 요소 확인
        return !!document.querySelector('[data-testid="user-menu"]') || 
               !!document.querySelector('.seller-header-user-info');
      });

      if (!isLoggedIn) {
        console.log('❌ 로그인이 필요합니다. 브라우저에서 수동으로 로그인해주세요.');
        // 로그인 페이지로 이동
        await this.page.goto(`${this.config.sellerCenterUrl}/account/login`);
        
        // 사용자가 로그인할 때까지 대기
        await this.page.waitForURL('**/dashboard/**', { timeout: 300000 }); // 5분 대기
        console.log('✅ 로그인 완료');
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

      // GMV Max 분석 페이지로 이동
      await this.page.goto(`${this.config.sellerCenterUrl}/campaign/gmv-max/analytics`, {
        waitUntil: 'networkidle'
      });

      // 날짜 선택기 클릭
      await this.page.click('[data-testid="date-range-picker"]');
      
      // Custom 날짜 범위 선택
      await this.page.click('[data-testid="custom-date-range"]');
      
      // 시작일과 종료일을 동일하게 설정 (일별 데이터)
      await this.page.fill('[data-testid="start-date-input"]', date);
      await this.page.fill('[data-testid="end-date-input"]', date);
      
      // 적용 버튼 클릭
      await this.page.click('[data-testid="apply-date-range"]');
      
      // 데이터 로딩 대기
      await this.page.waitForLoadState('networkidle');
      await this.delay(2000); // 추가 대기

      // 다운로드 버튼 클릭
      const downloadPromise = this.page.waitForEvent('download');
      await this.page.click('[data-testid="export-button"]');
      
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