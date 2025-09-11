import * as XLSX from 'xlsx';
import { createServerClient } from '../database/supabase';
import * as fs from 'fs/promises';

export interface GMVDailyRecord {
  gmv_date: string;
  campaign_id: string;
  campaign_name: string;
  video_id: string;
  video_title: string;
  creator_name: string;
  creator_id: string;
  gmv: number;
  orders: number;
  ad_spend: number;
  impressions: number;
  clicks: number;
  click_rate: number;
  conversion_rate: number;
  product_name?: string;
  product_id?: string;
  raw_file_name: string;
}

export class GMVDataParser {
  async parseExcelFile(filePath: string, gmvDate: string): Promise<GMVDailyRecord[]> {
    try {
      // Excel 파일 읽기
      const buffer = await fs.readFile(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // 첫 번째 시트 선택
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        throw new Error('Excel 파일에 데이터가 없습니다.');
      }

      // 헤더 매핑
      const headers = jsonData[0];
      const headerMap = this.createHeaderMap(headers);
      
      // 데이터 파싱
      const records: GMVDailyRecord[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const record = this.parseRow(row, headerMap, gmvDate, filePath);
        if (record) {
          records.push(record);
        }
      }

      console.log(`✅ ${filePath} 파싱 완료: ${records.length}개 레코드`);
      return records;
    } catch (error) {
      console.error(`❌ Excel 파싱 실패 (${filePath}):`, error);
      throw error;
    }
  }

  private createHeaderMap(headers: any[]): Map<string, number> {
    const map = new Map<string, number>();
    
    // 예상되는 헤더 매핑 (실제 Excel 파일에 맞게 조정 필요)
    const headerMappings: { [key: string]: string[] } = {
      'campaign_id': ['Campaign ID', 'campaign_id', '캠페인 ID'],
      'campaign_name': ['Campaign Name', 'campaign_name', '캠페인명'],
      'video_id': ['Video ID', 'video_id', '동영상 ID'],
      'video_title': ['Video Title', 'video_title', '동영상 제목'],
      'creator_name': ['Creator Name', 'creator_name', '크리에이터명'],
      'creator_id': ['Creator ID', 'creator_id', '크리에이터 ID'],
      'gmv': ['GMV', 'Total GMV', '총 GMV'],
      'orders': ['Orders', 'Total Orders', '주문수'],
      'ad_spend': ['Ad Spend', 'Cost', '광고비'],
      'impressions': ['Impressions', '노출수'],
      'clicks': ['Clicks', '클릭수'],
      'ctr': ['CTR', 'Click Rate', '클릭률'],
      'cvr': ['CVR', 'Conversion Rate', '전환율'],
      'product_name': ['Product Name', 'product_name', '상품명'],
      'product_id': ['Product ID', 'product_id', '상품 ID']
    };

    headers.forEach((header, index) => {
      const headerStr = String(header).trim();
      
      for (const [key, variations] of Object.entries(headerMappings)) {
        if (variations.some(v => headerStr.toLowerCase().includes(v.toLowerCase()))) {
          map.set(key, index);
          break;
        }
      }
    });

    return map;
  }

  private parseRow(
    row: any[], 
    headerMap: Map<string, number>, 
    gmvDate: string,
    fileName: string
  ): GMVDailyRecord | null {
    try {
      // 필수 필드 확인
      const campaignId = this.getValue(row, headerMap, 'campaign_id');
      const videoId = this.getValue(row, headerMap, 'video_id');
      
      if (!campaignId || !videoId) {
        return null;
      }

      return {
        gmv_date: gmvDate,
        campaign_id: String(campaignId),
        campaign_name: this.getValue(row, headerMap, 'campaign_name') || '',
        video_id: String(videoId),
        video_title: this.getValue(row, headerMap, 'video_title') || '',
        creator_name: this.getValue(row, headerMap, 'creator_name') || '',
        creator_id: this.getValue(row, headerMap, 'creator_id') || '',
        gmv: this.parseNumber(this.getValue(row, headerMap, 'gmv')),
        orders: this.parseNumber(this.getValue(row, headerMap, 'orders')),
        ad_spend: this.parseNumber(this.getValue(row, headerMap, 'ad_spend')),
        impressions: this.parseNumber(this.getValue(row, headerMap, 'impressions')),
        clicks: this.parseNumber(this.getValue(row, headerMap, 'clicks')),
        click_rate: this.parseNumber(this.getValue(row, headerMap, 'ctr')),
        conversion_rate: this.parseNumber(this.getValue(row, headerMap, 'cvr')),
        product_name: this.getValue(row, headerMap, 'product_name'),
        product_id: this.getValue(row, headerMap, 'product_id'),
        raw_file_name: fileName.split('/').pop() || fileName
      };
    } catch (error) {
      console.error('행 파싱 오류:', error);
      return null;
    }
  }

  private getValue(row: any[], headerMap: Map<string, number>, key: string): any {
    const index = headerMap.get(key);
    if (index === undefined) return null;
    return row[index];
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    // 문자열인 경우 숫자가 아닌 문자 제거
    if (typeof value === 'string') {
      value = value.replace(/[^\d.-]/g, '');
    }
    
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  async saveToDatabase(records: GMVDailyRecord[]): Promise<void> {
    const supabase = createServerClient();
    
    try {
      // 배치로 삽입 (충돌 시 업데이트)
      const { error } = await supabase
        .from('gmv_daily_raw')
        .upsert(records, {
          onConflict: 'gmv_date,campaign_id,video_id',
          ignoreDuplicates: false
        });

      if (error) {
        throw error;
      }

      console.log(`✅ ${records.length}개 레코드 DB 저장 완료`);
    } catch (error) {
      console.error('❌ DB 저장 실패:', error);
      throw error;
    }
  }
}