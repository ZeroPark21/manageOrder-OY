#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// API 파일 목록
const apiFiles = [
  // Matrix APIs
  'app/api/matrix/weekly-matrix/route.ts',
  'app/api/matrix/monthly-matrix/route.ts',
  'app/api/matrix/all-matrix/route.ts',

  // Sales APIs
  'app/api/sales-analysis/route.ts',

  // Content APIs
  'app/api/content/contents/route.ts',
  'app/api/content/content-stats/route.ts',
  'app/api/content/content-all-matrix/route.ts',

  // Upload APIs (다르게 처리 필요)
  'app/api/upload/upload-csv/route.ts',
  'app/api/upload/upload-content/route.ts',
];

function addCompanyIdToAPI(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 이미 companyId 처리가 있는지 확인
    if (content.includes('companyId')) {
      console.log(`⏭️  ${filePath} - 이미 companyId 처리됨`);
      return;
    }

    // GET 함수에 companyId 파라미터 추가
    if (content.includes('export async function GET')) {
      // searchParams 추출 부분 찾기
      if (content.includes('searchParams') && !content.includes("companyId = searchParams.get('companyId')")) {
        // searchParams 선언 다음에 companyId 추가
        content = content.replace(
          /(const \{ searchParams \} = new URL\(request\.url\)[\s\S]*?)(\n)/,
          `$1\n    const companyId = searchParams.get('companyId')\n\n    if (!companyId) {\n      return NextResponse.json({ error: "companyId is required" }, { status: 400 })\n    }$2`
        );
      }

      // Supabase 쿼리에 company_id 필터 추가
      // orders 테이블
      if (content.includes('.from("orders")')) {
        content = content.replace(
          /\.from\("orders"\)([\s\S]*?)\.select/g,
          '.from("orders")$1.select'
        );

        // .eq("sku_unit_original_price", 0) 다음에 company_id 필터 추가
        content = content.replace(
          /\.eq\("sku_unit_original_price", 0\)(?![\s\S]*\.eq\("company_id")/g,
          '.eq("sku_unit_original_price", 0)\n      .eq("company_id", companyId)'
        );
      }

      // contents 테이블
      if (content.includes('.from("contents")')) {
        content = content.replace(
          /\.from\("contents"\)([\s\S]*?)\.select/g,
          '.from("contents")$1.select'
        );

        // select 다음에 company_id 필터 추가
        const selectPattern = /\.select\([^)]*\)(?![\s\S]*\.eq\("company_id")/g;
        if (selectPattern.test(content)) {
          content = content.replace(
            selectPattern,
            (match) => `${match}\n      .eq("company_id", companyId)`
          );
        }
      }
    }

    // POST 함수 (업로드 API)
    if (content.includes('export async function POST')) {
      console.log(`📤 ${filePath} - POST API는 별도 처리 필요`);
      // POST API는 데이터 삽입 시 company_id 추가 필요
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath} - company_id 필터링 추가 완료`);

  } catch (error) {
    console.error(`❌ ${filePath} - 에러:`, error.message);
  }
}

// 모든 API 파일 처리
console.log('🚀 API 업데이트 시작...\n');
apiFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    addCompanyIdToAPI(fullPath);
  } else {
    console.log(`⚠️  ${file} - 파일 없음`);
  }
});

console.log('\n✨ 완료!');
console.log('\n📌 POST API들은 수동으로 처리 필요:');
console.log('   - upload-csv: 데이터 삽입 시 company_id 추가');
console.log('   - upload-content: 데이터 삽입 시 company_id 추가');