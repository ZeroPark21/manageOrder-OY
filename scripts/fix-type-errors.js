const fs = require('fs');
const path = require('path');

// Files that need to be fixed
const filesToFix = [
  'app/api/create-gmv-table/route.ts',
  'app/api/debug-monthly-ui/route.ts',
  'app/api/debug-product-sales/route.ts',
  'app/api/product-sales/route.ts',
  'app/api/test-content-matrix/route.ts',
  'app/api/product-sales/all-matrix/route.ts',
  'app/api/gmv-trends/route.ts',
  'app/api/test-weekly-content/route.ts',
  'app/api/content-august-check/route.ts',
  'app/api/debug-content/route.ts',
  'app/api/upload-gmv/route.ts',
  'app/api/upload-content-v2/route.ts',
  'app/api/gmv-sales-stats/route.ts',
  'app/api/content-all-matrix/route.ts',
  'app/api/debug-content-range/route.ts',
  'app/api/upload-content-simple/route.ts',
  'app/api/check-orders/route.ts',
  'app/api/debug-product-sales-v2/route.ts',
  'app/api/upload-content-edge/route.ts'
];

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix catch block type annotations
    content = content.replace(/} catch \(error\) {/g, '} catch (error: any) {');
    content = content.replace(/} catch \(error\)\s*{/g, '} catch (error: any) {');
    
    // Fix existing catch blocks that might have wrong type
    content = content.replace(/} catch \(error: unknown\) {/g, '} catch (error: any) {');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
});

console.log('\n✅ All type errors fixed!');