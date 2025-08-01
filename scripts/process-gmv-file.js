const { GMVDataParser } = require('../lib/gmv-collector/parser');
const path = require('path');

async function processGMVFile(filePath, gmvDate) {
  const parser = new GMVDataParser();
  
  try {
    console.log(`📄 Processing file: ${filePath}`);
    console.log(`📅 GMV Date: ${gmvDate}`);
    
    // Excel 파일 파싱
    const records = await parser.parseExcelFile(filePath, gmvDate);
    console.log(`📊 Found ${records.length} records`);
    
    // 데이터베이스에 저장
    await parser.saveToDatabase(records);
    console.log(`✅ Successfully saved to database`);
    
    // Materialized View 새로고침
    const { createServerClient } = require('../lib/supabase');
    const supabase = createServerClient();
    
    const { error } = await supabase.rpc('refresh_gmv_materialized_views');
    if (error) {
      console.error('❌ Failed to refresh materialized views:', error);
    } else {
      console.log('✅ Materialized views refreshed');
    }
    
  } catch (error) {
    console.error('❌ Error processing file:', error);
    process.exit(1);
  }
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node process-gmv-file.js <file-path> <gmv-date>');
    console.error('Example: node process-gmv-file.js downloads/gmv/data.xlsx 2025-07-28');
    process.exit(1);
  }
  
  const filePath = path.resolve(args[0]);
  const gmvDate = args[1];
  
  processGMVFile(filePath, gmvDate);
}