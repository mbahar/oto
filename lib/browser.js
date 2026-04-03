/**
 * lib/browser.js
 * Shared browser utilities — connect to debug Chrome or launch fresh
 */

const { chromium } = require('/Users/mike/.nvm/versions/node/v24.14.0/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SESSIONS_DIR = path.join(__dirname, '../sessions');
const CDP_URL = 'http://127.0.0.1:9222';

/**
 * Connect to existing debug Chrome instance
 */
async function connectDebugChrome() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()[0];
  if (!page) throw new Error('No open tab found in debug Chrome');
  return { browser, page };
}

/**
 * Launch a new browser using saved session (stays logged in)
 */
async function launchWithSession(platform, headless = true) {
  const sessionFile = path.join(SESSIONS_DIR, `${platform}.json`);
  const hasSession = fs.existsSync(sessionFile);
  
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(
    hasSession ? { storageState: sessionFile } : {}
  );
  const page = await context.newPage();
  return { browser, context, page, hasSession };
}

/**
 * Save current session to file after login
 */
async function saveSession(context, platform) {
  const sessionFile = path.join(SESSIONS_DIR, `${platform}.json`);
  await context.storageState({ path: sessionFile });
  require('fs').chmodSync(sessionFile, 0o600);
  console.log(`✅ Session saved: ${sessionFile}`);
}

module.exports = { connectDebugChrome, launchWithSession, saveSession };
