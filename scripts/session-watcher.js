/**
 * scripts/session-watcher.js
 * 
 * Auto-detects new authenticated sites in debug Chrome and saves sessions.
 * Runs in background — monitors your browser as you navigate.
 * 
 * Usage: node ~/oto/scripts/session-watcher.js [account]
 * Default account: jebwa
 * 
 * Stop: Ctrl+C
 */

const { chromium } = require('/Users/mike/.nvm/versions/node/v24.14.0/lib/node_modules/playwright');
const { saveSession, hasSession } = require('../lib/session-manager');

const ACCOUNT = process.argv[2] || 'jebwa';
const CDP_URL = 'http://127.0.0.1:9222';
const CHECK_INTERVAL = 5000; // check every 5 seconds

// Platform detection rules — hostname → platform name
const PLATFORM_RULES = [
  { match: 'employers.indeed.com',         platform: 'indeed' },
  { match: 'tiktok.com',                   platform: 'tiktok' },
  { match: 'poshmark.com',                 platform: 'poshmark' },
  { match: 'shopify.com',                  platform: 'shopify' },
  { match: 'sellercentral.amazon.com',     platform: 'amazon-seller' },
  { match: 'amazon.com',                   platform: 'amazon' },
  { match: 'console.twilio.com',           platform: 'twilio' },
  { match: 'paypal.com',                   platform: 'paypal' },
  { match: 'ebay.com',                     platform: 'ebay' },
  { match: 'canva.com',                    platform: 'canva' },
  { match: 'cloud.lifx.com',              platform: 'lifx' },
  { match: 'app.hoptub.com',              platform: 'hoptub' },
  { match: 'poshmark.com/closet',         platform: 'poshmark' },
  { match: 'accounts.google.com',         platform: null }, // skip auth pages
  { match: 'login',                        platform: null }, // skip login pages
  { match: 'signin',                       platform: null }, // skip sign-in pages
  { match: 'auth',                         platform: null }, // skip auth pages
];

// Login page indicators — if URL contains these, skip (not yet logged in)
const LOGIN_INDICATORS = [
  '/login', '/signin', '/sign-in', '/auth', '/oauth',
  'accounts.google.com', 'account.indeed.com/auth',
];

function detectPlatform(url) {
  try {
    const u = new URL(url);
    const hostname = u.hostname + u.pathname;
    
    // Skip login pages
    for (const indicator of LOGIN_INDICATORS) {
      if (url.includes(indicator)) return null;
    }
    
    for (const rule of PLATFORM_RULES) {
      if (hostname.includes(rule.match)) {
        return rule.platform; // null means explicitly skip
      }
    }
  } catch(e) {}
  return null;
}

const saved = new Set(); // track what we've saved this session

async function watch() {
  let browser;
  
  console.log(`🔍 Oto Session Watcher started`);
  console.log(`   Account: ${ACCOUNT}`);
  console.log(`   Monitoring debug Chrome at ${CDP_URL}`);
  console.log(`   Auto-saving sessions as you browse...\n`);

  while (true) {
    try {
      if (!browser) {
        browser = await chromium.connectOverCDP(CDP_URL);
        console.log('✅ Connected to debug Chrome');
      }

      const contexts = browser.contexts();
      if (!contexts.length) { await sleep(CHECK_INTERVAL); continue; }

      const pages = contexts[0].pages();
      
      for (const page of pages) {
        const url = page.url();
        const platform = detectPlatform(url);
        
        if (!platform) continue;
        
        const key = `${platform}:${ACCOUNT}`;
        if (saved.has(key)) continue; // already saved this run
        
        console.log(`🌐 Detected: ${platform} (${url.split('/').slice(0,3).join('/')})`);
        
        try {
          await saveSession(contexts[0], platform, ACCOUNT, { url });
          saved.add(key);
          console.log(`✅ Auto-saved session: ${key}\n`);
        } catch(e) {
          console.log(`⚠️  Could not save ${key}: ${e.message.split('\n')[0]}\n`);
        }
      }

    } catch(e) {
      // Chrome not running or disconnected
      if (browser) {
        console.log('⚠️  Lost connection to Chrome — reconnecting...');
        browser = null;
      }
    }

    await sleep(CHECK_INTERVAL);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

watch().catch(console.error);
