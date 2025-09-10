import * as cron from 'node-cron';
import { TikTokGMVCollector } from '../../lib/gmv-collector/collector';
import { GMVDataParser } from '../../lib/gmv-collector/parser';
import { createServerClient } from '../../lib/supabase';

class GMVCollectionScheduler {
  private collector: TikTokGMVCollector;
  private parser: GMVDataParser;
  private isRunning: boolean = false;

  constructor() {
    this.collector = new TikTokGMVCollector({
      headless: process.env.GMV_COLLECTOR_HEADLESS === 'true',
      sessionPath: process.env.GMV_SESSION_PATH || './tiktok-session',
      downloadPath: process.env.GMV_DOWNLOAD_PATH || './downloads/gmv'
    });
    this.parser = new GMVDataParser();
  }

  async collectYesterdayData() {
    if (this.isRunning) {
      console.log('⚠️ 수집이 이미 진행 중입니다.');
      return;
    }

    this.isRunning = true;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`🚀 ${dateStr} 데이터 수집 시작...`);

    try {
      await this.logCollectionStart(dateStr);

      // 브라우저 초기화
      await this.collector.initialize();
      
      // 세션 검증
      const isValid = await this.collector.validateSession();
      if (!isValid) {
        throw new Error('세션 검증 실패');
      }

      // 데이터 수집
      const filePath = await this.collector.collectDailyData(dateStr);
      if (!filePath) {
        throw new Error('데이터 수집 실패');
      }

      // 데이터 파싱 및 저장
      const records = await this.parser.parseExcelFile(filePath, dateStr);
      await this.parser.saveToDatabase(records);

      // Materialized View 새로고침
      await this.refreshMaterializedViews();

      // 성공 로그
      await this.logCollectionComplete(dateStr, records.length);

      console.log(`✅ ${dateStr} 데이터 수집 완료: ${records.length}개 레코드`);
    } catch (error) {
      console.error(`❌ ${dateStr} 데이터 수집 실패:`, error);
      await this.logCollectionError(dateStr, error);
    } finally {
      await this.collector.close();
      this.isRunning = false;
    }
  }

  async collectDateRange(startDate: string, endDate: string) {
    console.log(`📅 ${startDate} ~ ${endDate} 기간 데이터 수집 시작...`);

    try {
      await this.collector.initialize();
      
      const isValid = await this.collector.validateSession();
      if (!isValid) {
        throw new Error('세션 검증 실패');
      }

      const results = await this.collector.collectDateRange(startDate, endDate);
      
      for (const [date, filePath] of results) {
        try {
          const records = await this.parser.parseExcelFile(filePath, date);
          await this.parser.saveToDatabase(records);
          console.log(`✅ ${date}: ${records.length}개 레코드 저장`);
        } catch (error) {
          console.error(`❌ ${date} 처리 실패:`, error);
        }
      }

      await this.refreshMaterializedViews();
    } finally {
      await this.collector.close();
    }
  }

  private async logCollectionStart(targetDate: string) {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('gmv_collection_logs')
      .insert({
        collection_type: 'scheduled',
        target_date: targetDate,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    return data;
  }

  private async logCollectionComplete(targetDate: string, recordsCount: number) {
    const supabase = createServerClient();
    
    await supabase
      .from('gmv_collection_logs')
      .update({
        status: 'completed',
        records_processed: recordsCount,
        completed_at: new Date().toISOString()
      })
      .eq('target_date', targetDate)
      .eq('status', 'processing');
  }

  private async logCollectionError(targetDate: string, error: any) {
    const supabase = createServerClient();
    
    await supabase
      .from('gmv_collection_logs')
      .update({
        status: 'failed',
        error_message: error.message || String(error),
        completed_at: new Date().toISOString()
      })
      .eq('target_date', targetDate)
      .eq('status', 'processing');
  }

  private async refreshMaterializedViews() {
    const supabase = createServerClient();
    
    // Supabase Edge Function 또는 직접 SQL 실행
    const { error } = await supabase.rpc('refresh_gmv_materialized_views');
    
    if (error) {
      console.error('Materialized View 새로고침 실패:', error);
    }
  }

  startScheduler() {
    // 매일 오전 2시에 실행
    cron.schedule('0 2 * * *', async () => {
      console.log('⏰ 일일 GMV 데이터 수집 스케줄 실행...');
      await this.collectYesterdayData();
    });

    console.log('📅 GMV 수집 스케줄러가 시작되었습니다.');
  }
}

// CLI로 실행할 경우
if (require.main === module) {
  const scheduler = new GMVCollectionScheduler();
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'yesterday':
      scheduler.collectYesterdayData();
      break;
    
    case 'range':
      const startDate = args[1];
      const endDate = args[2];
      if (!startDate || !endDate) {
        console.error('사용법: npm run collect:gmv range YYYY-MM-DD YYYY-MM-DD');
        process.exit(1);
      }
      scheduler.collectDateRange(startDate, endDate);
      break;
    
    case 'schedule':
      scheduler.startScheduler();
      break;
    
    default:
      console.log(`
사용법:
  npm run collect:gmv yesterday              # 어제 데이터 수집
  npm run collect:gmv range START END        # 기간 데이터 수집
  npm run collect:gmv schedule               # 스케줄러 시작
      `);
  }
}

export { GMVCollectionScheduler };