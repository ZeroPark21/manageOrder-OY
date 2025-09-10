const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 데이터 폴더의 엑셀 파일 읽기
const dataDir = path.join(__dirname, '..', 'data');

// Video_List 파일 찾기
const files = fs.readdirSync(dataDir);
const videoListFile = files.find(f => f.startsWith('Video_List') && (f.endsWith('.xlsx') || f.endsWith('.csv')));

if (!videoListFile) {
  console.log('Video_List 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const filePath = path.join(dataDir, videoListFile);
console.log('파일 읽기:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log('전체 데이터 수:', data.length);
  
  // @annekoii 데이터 찾기
  const annekoiiData = data.filter(row => {
    const creatorName = row['Creator username'] || row['creator_name'] || '';
    return creatorName.toLowerCase().includes('annekoii');
  });

  console.log('\n@annekoii 데이터 수:', annekoiiData.length);
  
  if (annekoiiData.length > 0) {
    console.log('\n@annekoii 최근 데이터:');
    // 최근 5개만 표시
    annekoiiData.slice(0, 5).forEach((row, index) => {
      console.log(`\n데이터 ${index + 1}:`);
      console.log('  Creator:', row['Creator username']);
      console.log('  Video name:', row['Video name']?.substring(0, 50) + '...');
      console.log('  Est. commission:', row['Est. commission']);
      console.log('  GMV:', row['GMV']);
      console.log('  Video post date:', row['Video post date']);
    });

    // 모든 commission 값 확인
    const commissions = annekoiiData.map(row => row['Est. commission']);
    const uniqueCommissions = [...new Set(commissions)];
    console.log('\n고유한 commission 값들:', uniqueCommissions);
    
    // $121.79 찾기
    const has12179 = annekoiiData.some(row => {
      const comm = row['Est. commission'];
      return comm === '$121.79' || comm === '121.79' || comm === 121.79;
    });
    
    // $38.14 찾기
    const has3814 = annekoiiData.some(row => {
      const comm = row['Est. commission'];
      return comm === '$38.14' || comm === '38.14' || comm === 38.14;
    });
    
    console.log('\n$121.79 존재:', has12179);
    console.log('$38.14 존재:', has3814);
    
    // 121.79를 가진 데이터 찾기
    const data12179 = annekoiiData.find(row => {
      const comm = row['Est. commission'];
      return comm === '$121.79' || comm === '121.79' || comm === 121.79;
    });
    
    if (data12179) {
      console.log('\n$121.79를 가진 데이터:');
      console.log('  Video name:', data12179['Video name']);
      console.log('  Video link:', data12179['Video link']);
      console.log('  Est. commission:', data12179['Est. commission']);
      console.log('  GMV:', data12179['GMV']);
    }
  }
  
} catch (error) {
  console.error('파일 읽기 오류:', error);
}