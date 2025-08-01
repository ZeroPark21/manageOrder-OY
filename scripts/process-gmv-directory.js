const fs = require('fs').promises;
const path = require('path');
const { GMVDataParser } = require('../lib/gmv-collector/parser');

async function processGMVDirectory(directoryPath) {
  const parser = new GMVDataParser();
  
  try {
    console.log(`📁 Processing directory: ${directoryPath}`);
    
    // 디렉토리의 모든 Excel 파일 찾기
    const files = await fs.readdir(directoryPath);
    const excelFiles = files.filter(file => 
      file.endsWith('.xlsx') || file.endsWith('.xls')
    );
    
    console.log(`📊 Found ${excelFiles.length} Excel files`);
    
    for (const file of excelFiles) {
      const filePath = path.join(directoryPath, file);
      
      // 파일명에서 날짜 추출 시도 (YYYY-MM-DD 패턴)
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      const gmvDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
      
      console.log(`\n📄 Processing: ${file}`);
      console.log(`📅 Date: ${gmvDate}`);
      
      try {
        // Excel 파일 파싱
        const records = await parser.parseExcelFile(filePath, gmvDate);
        console.log(`   Found ${records.length} records`);
        
        // 데이터베이스에 저장
        await parser.saveToDatabase(records);
        console.log(`   ✅ Saved to database`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error.message);
      }
    }
    
    // Materialized View 새로고침
    console.log('\n🔄 Refreshing materialized views...');
    const { createServerClient } = require('../lib/supabase');
    const supabase = createServerClient();
    
    const { error } = await supabase.rpc('refresh_gmv_materialized_views');
    if (error) {
      console.error('❌ Failed to refresh materialized views:', error);
    } else {
      console.log('✅ Materialized views refreshed');
    }
    
  } catch (error) {
    console.error('❌ Error processing directory:', error);
    process.exit(1);
  }
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node process-gmv-directory.js <directory-path>');
    console.error('Example: node process-gmv-directory.js downloads/gmv/');
    process.exit(1);
  }
  
  const directoryPath = path.resolve(args[0]);
  
  processGMVDirectory(directoryPath);
}