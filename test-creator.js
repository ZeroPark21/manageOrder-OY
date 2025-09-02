const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/content');
  await page.waitForTimeout(5000);
  
  // Check for creator column
  const creatorHeaders = await page.$$eval('th', headers => 
    headers.filter(h => h.textContent && h.textContent.includes('크리에이터')).length
  );
  
  console.log(`Found ${creatorHeaders} creator column headers`);
  
  // Get all table headers
  const headers = await page.$$eval('th', headers => 
    headers.map(h => h.textContent).filter(t => t)
  );
  
  console.log('Table headers:', headers);
  
  await browser.close();
})();
