const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://mhj-marketing.web.app/');
  
  await page.fill('#staticrypt-password', 'MHJ@ADMIN@INTERN@DISANALAM');
  await page.click('input[type="submit"]');
  
  // wait for the content to decrypt and render
  await page.waitForTimeout(2000);
  
  const content = await page.evaluate(() => document.body.innerText);
  console.log(content);
  
  await browser.close();
})();
