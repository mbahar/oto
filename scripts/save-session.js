/**
 * scripts/save-session.js
 * 
 * Interactive session capture — any site, any account.
 * 
 * Usage:
 *   node scripts/save-session.js <platform> <url> [account]
 * 
 * Examples:
 *   node scripts/save-session.js amazon https://www.amazon.com murat
 *   node scripts/save-session.js amazon https://www.amazon.com jebwa
 *   node scripts/save-session.js tiktok https://www.tiktok.com/login jebwa
 *   node scripts/save-session.js indeed https://employers.indeed.com murat
 *   node scripts/save-session.js poshmark https://poshmark.com/login murat
 *   node scripts/save-session.js shopify https://accounts.shopify.com jebwa
 * 
 * If account is omitted, defaults to "default"
 */

const { chromium } = require('/Users/mike/.nvm/versions/node/v24.14.0/lib/node_modules/playwright');
const { saveSession, listSessions } = require('../lib/session-manager');
const readline = require('readline');

const platform = process.argv[2];
const url = process.argv[3];
const account = process.argv[4] || 'default';

if (process.argv[2] === 'list') {
  const sessions = listSessions();
  if (sessions.length === 0) {
    console.log('No sessions saved yet.');
  } else {
    console.log('\n📦 Saved Sessions:\n');
    sessions.forEach(s => {
      console.log(`  ${s.platform}:${s.account}`);
      console.log(`    URL: ${s.url || 'unknown'}`);
      console.log(`    Saved: ${s.savedAt}`);
    });
  }
  process.exit(0);
}

if (!platform || !url) {
  console.log('\nUsage: node scripts/save-session.js <platform> <url> [account]');
  console.log('       node scripts/save-session.js list\n');
  console.log('Examples:');
  console.log('  node scripts/save-session.js amazon    https://www.amazon.com          murat');
  console.log('  node scripts/save-session.js amazon    https://www.amazon.com          jebwa');
  console.log('  node scripts/save-session.js tiktok    https://www.tiktok.com/login    jebwa');
  console.log('  node scripts/save-session.js indeed    https://employers.indeed.com    murat');
  console.log('  node scripts/save-session.js poshmark  https://poshmark.com/login      murat');
  console.log('  node scripts/save-session.js shopify   https://accounts.shopify.com    jebwa');
  console.log('  node scripts/save-session.js paypal    https://www.paypal.com/signin   jebwa');
  console.log('  node scripts/save-session.js ebay      https://signin.ebay.com         jebwa');
  console.log('  node scripts/save-session.js twilio    https://console.twilio.com      jebwa');
  process.exit(1);
}

(async () => {
  console.log(`\n🔐 Saving session for: ${platform}:${account}`);
  console.log(`   Opening: ${url}\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url);

  console.log('👆 Log in to the site in the browser window.');
  console.log('   Once you are fully logged in and on the main page,');
  console.log('   press ENTER here to save the session.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('Press ENTER when logged in > ', () => { rl.close(); resolve(); }));

  await saveSession(context, platform, account, { url });

  console.log(`\n✅ Done! Session saved as: ${platform}:${account}`);
  console.log(`   Use it in your code:\n`);
  console.log(`   const { launchSession } = require('./lib/session-manager');`);
  console.log(`   const { page } = await launchSession('${platform}', '${account}');\n`);

  await browser.close();
  process.exit(0);
})();
