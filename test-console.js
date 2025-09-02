const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  console.log('Navigating to content page...');
  await page.goto('http://localhost:3000/content');
  
  // Wait and check network activity
  await page.waitForTimeout(5000);
  
  // Try to get React error boundaries
  const errorBoundary = await page.$$eval('[data-error]', elements => elements.length);
  console.log(`Error boundaries found: ${errorBoundary}`);
  
  // Check network requests
  const failed = await page.evaluate(() => {
    return window.performance.getEntries()
      .filter(entry => entry.name.includes('/api/'))
      .map(entry => ({ name: entry.name, status: entry.responseStatus }));
  });
  
  console.log('API calls:', failed);
  
  await browser.close();
})();
