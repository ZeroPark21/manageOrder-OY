#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 업데이트할 파일 목록
const filesToUpdate = [
  // Content pages
  'app/[companyId]/content-analysis/page.tsx',
  'app/[companyId]/content/page.tsx',

  // Content components
  'components/matrix/content-daily-matrix-table.tsx',
  'components/matrix/content-weekly-matrix-table.tsx',
  'components/matrix/content-monthly-matrix-table.tsx',
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // 페이지 컴포넌트인 경우 (app 디렉토리)
    if (filePath.includes('app/[companyId]')) {
      // export default function 찾기
      if (content.includes('export default function') && !content.includes('{ params }')) {
        // use import 추가
        if (!content.includes("import { use } from \"react\"")) {
          content = `import { use } from "react"\n` + content;
        }

        // 함수 시그니처 업데이트
        content = content.replace(
          /export default function (\w+)\(\)/g,
          'export default function $1({ params }: { params: Promise<{ companyId: string }> })'
        );

        // 함수 내부에 companyId 추가
        content = content.replace(
          /export default function (\w+)\({ params }\: { params: Promise<{ companyId: string }> }\) {/g,
          'export default function $1({ params }: { params: Promise<{ companyId: string }> }) {\n  const { companyId } = use(params)'
        );

        updated = true;
      }

      // API 호출에 companyId 추가
      // /api/content/content-stats
      content = content.replace(
        /fetch\(`?\/api\/content\/content-stats(\?[^`\s]*)?`?\)/g,
        (match, queryString) => {
          if (queryString && queryString.includes('companyId')) return match;
          const separator = queryString && queryString !== '?' ? '&' : '?';
          return `fetch(\`/api/content/content-stats${queryString || ''}${separator}companyId=\${companyId}\`)`;
        }
      );

      // /api/content/content-all-matrix
      content = content.replace(
        /fetch\(`?\/api\/content\/content-all-matrix(\?[^`\s]*)?`?\)/g,
        (match, queryString) => {
          if (queryString && queryString.includes('companyId')) return match;
          const separator = queryString && queryString !== '?' ? '&' : '?';
          return `fetch(\`/api/content/content-all-matrix${queryString || ''}${separator}companyId=\${companyId}\`)`;
        }
      );

      // /api/content/contents
      content = content.replace(
        /fetch\(`?\/api\/content\/contents(\?[^`\s]*)?`?\)/g,
        (match, queryString) => {
          if (queryString && queryString.includes('companyId')) return match;
          const separator = queryString && queryString !== '?' ? '&' : '?';
          return `fetch(\`/api/content/contents${queryString || ''}${separator}companyId=\${companyId}\`)`;
        }
      );

      updated = true;
    }

    // 컴포넌트인 경우 (components 디렉토리) - props로 companyId 받기
    if (filePath.includes('components/')) {
      // interface 찾아서 companyId 추가
      const interfaceMatch = content.match(/interface \w+Props\s*{[^}]*}/);
      if (interfaceMatch && !interfaceMatch[0].includes('companyId')) {
        const updatedInterface = interfaceMatch[0].replace(
          /interface (\w+Props)\s*{/,
          'interface $1 {\n  companyId: string'
        );
        content = content.replace(interfaceMatch[0], updatedInterface);
        updated = true;
      }

      // 함수 시그니처에서 companyId destructure
      content = content.replace(
        /export (?:default )?function (\w+)\(({[^}]*})\)/g,
        (match, funcName, props) => {
          if (!props.includes('companyId')) {
            // props에 companyId 추가
            const newProps = props.replace('{', '{ companyId,');
            return `export default function ${funcName}(${newProps})`;
          }
          return match;
        }
      );

      // API 호출에 companyId 추가
      content = content.replace(
        /fetch\(`?\/api\/content\/content-all-matrix(\?[^`\s]*)?`?\)/g,
        (match, queryString) => {
          if (queryString && queryString.includes('companyId')) return match;
          const separator = queryString && queryString !== '?' ? '&' : '?';
          return `fetch(\`/api/content/content-all-matrix${queryString || ''}${separator}companyId=\${companyId}\`)`;
        }
      );

      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  Skipped: ${filePath} (already updated or no changes needed)`);
    }

  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// 모든 파일 처리
console.log('🚀 Starting to update files with companyId...\n');

filesToUpdate.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    updateFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✨ Update complete!');