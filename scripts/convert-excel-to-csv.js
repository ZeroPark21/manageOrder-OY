const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Excel 파일을 CSV로 변환하는 함수
function convertExcelToCSV(inputPath, outputPath) {
  try {
    // Excel 파일 읽기
    const workbook = XLSX.readFile(inputPath);
    
    // 첫 번째 시트 가져오기
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // CSV로 변환
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // CSV 파일 저장
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    
    console.log(`✅ 변환 완료: ${inputPath} -> ${outputPath}`);
    console.log(`📊 데이터 행 수: ${csvContent.split('\n').length - 1}`);
    
    return true;
  } catch (error) {
    console.error(`❌ 변환 실패: ${error.message}`);
    return false;
  }
}

// 메인 실행
const inputFile = path.join(__dirname, '../data/Video_List_20250701-20250722_20250724035301.csv');
const outputFile = path.join(__dirname, '../data/content_data.csv');

if (fs.existsSync(inputFile)) {
  convertExcelToCSV(inputFile, outputFile);
} else {
  console.error(`❌ 입력 파일을 찾을 수 없습니다: ${inputFile}`);
} 