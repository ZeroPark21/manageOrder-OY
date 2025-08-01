#!/usr/bin/env node

const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
const fs = require('fs').promises;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 TikTok GMV 데이터 수집 도구');
  console.log('================================\n');

  console.log('📌 사용 방법:');
  console.log('1. Chrome 브라우저에서 TikTok Seller Center에 로그인');
  console.log('2. Ads Dashboard 페이지 열기');
  console.log('3. 이 도구의 안내를 따라 진행\n');

  const choice = await question('진행 방법을 선택하세요:\n1) 자동 수집 (Chrome 디버그 모드)\n2) 수동 다운로드 후 처리\n선택 (1 또는 2): ');

  if (choice === '1') {
    await autoCollect();
  } else if (choice === '2') {
    await manualProcess();
  } else {
    console.log('잘못된 선택입니다.');
  }

  rl.close();
}

async function autoCollect() {
  console.log('\n🔧 Chrome 디버그 모드 연결 시도...');
  console.log('Chrome을 디버그 모드로 실행하려면:');
  console.log('1. 모든 Chrome 창을 닫습니다');
  console.log('2. 터미널에서 실행:');
  console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n');

  const ready = await question('Chrome이 디버그 모드로 실행 중입니까? (y/n): ');
  
  if (ready.toLowerCase() !== 'y') {
    console.log('Chrome을 디버그 모드로 실행한 후 다시 시도해주세요.');
    return;
  }

  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Chrome에 연결되었습니다!');

    // TikTok 페이지 찾기
    const pages = await browser.contexts()[0].pages();
    let targetPage = null;

    for (const page of pages) {
      if (page.url().includes('tiktokglobalshop.com')) {
        targetPage = page;
        break;
      }
    }

    if (!targetPage) {
      console.log('❌ TikTok Seller Center 페이지를 찾을 수 없습니다.');
      console.log('브라우저에서 https://seller.us.tiktokglobalshop.com/ads-creation/dashboard 를 열어주세요.');
      return;
    }

    console.log('✅ TikTok 페이지를 찾았습니다!');
    
    const dateStr = await question('\n수집할 날짜를 입력하세요 (YYYY-MM-DD): ');
    
    console.log('\n📌 다음 단계를 수동으로 진행해주세요:');
    console.log(`1. 날짜를 ${dateStr}로 설정`);
    console.log('2. Export/Download 버튼 클릭');
    console.log('3. 파일 다운로드 완료 대기\n');

    await question('완료되면 Enter를 누르세요...');

    // 다운로드 폴더 확인
    const downloadDir = path.join(process.cwd(), 'downloads', 'gmv');
    await fs.mkdir(downloadDir, { recursive: true });

    console.log(`\n📁 다운로드된 파일을 ${downloadDir} 폴더로 이동해주세요.`);
    await question('파일 이동 후 Enter를 누르세요...');

    // 파일 처리
    await processDownloadedFiles(downloadDir, dateStr);

  } catch (error) {
    console.error('오류:', error.message);
  }
}

async function manualProcess() {
  console.log('\n📥 수동 다운로드 프로세스');
  console.log('1. TikTok Seller Center에서 데이터를 다운로드하세요');
  console.log('2. 다운로드한 파일을 ./downloads/gmv/ 폴더에 저장하세요\n');

  const dateStr = await question('다운로드한 데이터의 날짜 (YYYY-MM-DD): ');
  const fileName = await question('파일명 (예: data.xlsx): ');

  const filePath = path.join(process.cwd(), 'downloads', 'gmv', fileName);

  try {
    await fs.access(filePath);
    console.log('\n✅ 파일을 찾았습니다. 처리를 시작합니다...');
    
    // 파일 처리
    const { spawn } = require('child_process');
    const proc = spawn('node', ['scripts/process-gmv-file.js', filePath, dateStr]);
    
    proc.stdout.on('data', (data) => console.log(data.toString()));
    proc.stderr.on('data', (data) => console.error(data.toString()));
    
    await new Promise((resolve) => proc.on('close', resolve));
    
    console.log('\n✅ 처리 완료!');
  } catch (error) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
  }
}

async function processDownloadedFiles(directory, dateStr) {
  const files = await fs.readdir(directory);
  const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

  if (excelFiles.length === 0) {
    console.log('❌ Excel 파일을 찾을 수 없습니다.');
    return;
  }

  console.log(`\n📊 ${excelFiles.length}개의 파일을 찾았습니다.`);

  for (const file of excelFiles) {
    console.log(`\n처리 중: ${file}`);
    const filePath = path.join(directory, file);
    
    const { spawn } = require('child_process');
    const proc = spawn('node', ['scripts/process-gmv-file.js', filePath, dateStr]);
    
    await new Promise((resolve) => {
      proc.stdout.on('data', (data) => console.log(data.toString()));
      proc.stderr.on('data', (data) => console.error(data.toString()));
      proc.on('close', resolve);
    });
  }

  console.log('\n✅ 모든 파일 처리 완료!');
}

// 실행
main().catch(console.error);