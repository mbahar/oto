/**
 * scripts/save-session.js
 * Login to a website once, save the session for future automation
 * 
 * Usage: node save-session.js <platform> <url>
 * Example: node save-session.js amazon https://www.amazon.com
 *          node save-session.js tiktok https://www.tiktok.com/login
 *          node save-session.js indeed https://employers.indeed.com
 *          node save-session.js twilio https://console.twilio.com
 *          node save-session.js poshmark https://poshmark.com/login
 */

const { chromium } = require('/Users/mike/.nvm/versions/node/v24.14.0/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SESSIONS_DIR = path.join(__dirname, '../sessions');

(async () => {
  const platform = process.argv[2];
  const url = process.argv[3];

  if (!platform || !url) {
    console.log('Usage: node save-session.js <platform> <url>');
    console.log('');
    console.log('Available platforms to save:');
    console.log('  amazon     https://www.amazon.com');
    console.log('  tiktok     https://www.tiktok.com/login');
    console.log('  indeed     https://employers.indeed.com');
    console.log('  twilio     https://console.twilio.com');
    console.log('  poshmark   https://poshmark.com/login');
    console.log('  shopify    https://accounts.shopify.com/store-login');
    console.log('  ebay       https://signin.ebay.com');
    console.log('  paypal     https://www.paypal.com/signin');
    process.exit(1);
  }

  console.log(`🔐 Opening ${platform} — please log in...`);
  
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url);
  console.log('');
  console.log('👆 Log in manually in the browser window.');
  console.log('   When fully logged in and on the dashboard/home page,');
  console.log('   press ENTER here to save the session.');
  console.log('');

  // Wait for user to press Enter
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
    process.stdin.resume();
  });

  const sessionFile = path.join(SESSIONS_DIR, `${platform}.json`);
  await context.storageState({ path: sessionFile });
  fs.chmodSync(sessionFile, 0o600);
  
  console.log(`✅ Session saved to: ${sessionFile}`);
  console.log(`   Next time, automation will use this session automatically.`);
  
  await browser.close();
  process.exit(0);
})();
