const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to content page...');
  await page.goto('http://localhost:3000/content');
  
  console.log('Waiting for table to load...');
  // Wait for table to appear
  try {
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('Table found!');
  } catch (e) {
    console.log('No table found after 10 seconds');
  }
  
  // Check if loading spinner is still visible
  const loading = await page.$$eval('.animate-spin', elements => elements.length);
  console.log(`Loading spinners found: ${loading}`);
  
  // Get page content
  const bodyText = await page.textContent('body');
  if (bodyText.includes('데이터를 불러오는 중')) {
    console.log('Page is still loading data...');
  }
  
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
