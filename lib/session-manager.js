/**
 * lib/session-manager.js
 * 
 * Platform-agnostic session management.
 * Any site. Any account. Multiple users.
 * 
 * Session ID format: "platform:account"
 * Examples:
 *   "amazon:murat"
 *   "amazon:jebwa"
 *   "tiktok:jebwa"
 *   "indeed:murat"
 *   "poshmark:murat"
 */

const { chromium } = require('/Users/mike/.nvm/versions/node/v24.14.0/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SESSIONS_DIR = path.join(__dirname, '../sessions');
const REGISTRY_FILE = path.join(SESSIONS_DIR, 'registry.json');

// Ensure sessions dir exists
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

/**
 * Load the session registry (metadata about all saved sessions)
 */
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) return {};
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
}

/**
 * Save registry
 */
function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  fs.chmodSync(REGISTRY_FILE, 0o600);
}

/**
 * Get session file path for platform:account
 */
function sessionPath(platform, account = 'default') {
  return path.join(SESSIONS_DIR, `${platform}--${account}.json`);
}

/**
 * Check if a session exists
 */
function hasSession(platform, account = 'default') {
  return fs.existsSync(sessionPath(platform, account));
}

/**
 * List all saved sessions
 */
function listSessions() {
  const registry = loadRegistry();
  return Object.entries(registry).map(([key, meta]) => ({
    key,
    platform: meta.platform,
    account: meta.account,
    url: meta.url,
    savedAt: meta.savedAt,
    label: meta.label || `${meta.platform}:${meta.account}`,
  }));
}

/**
 * Launch browser with saved session — fully authenticated
 * Usage: launchSession('amazon', 'murat')
 */
async function launchSession(platform, account = 'default', headless = true) {
  const file = sessionPath(platform, account);
  const hasExisting = fs.existsSync(file);

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(
    hasExisting ? { storageState: file } : {}
  );
  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    platform,
    account,
    isAuthenticated: hasExisting,
    // Save current session state back to disk
    save: async () => saveSession(context, platform, account),
  };
}

/**
 * Save a browser context's session
 */
async function saveSession(context, platform, account = 'default', meta = {}) {
  const file = sessionPath(platform, account);
  await context.storageState({ path: file });
  fs.chmodSync(file, 0o600);

  // Update registry
  const registry = loadRegistry();
  const key = `${platform}:${account}`;
  registry[key] = {
    platform,
    account,
    savedAt: new Date().toISOString(),
    file: path.basename(file),
    ...meta,
  };
  saveRegistry(registry);

  console.log(`✅ Session saved: ${key}`);
  return file;
}

/**
 * Delete a session
 */
function deleteSession(platform, account = 'default') {
  const file = sessionPath(platform, account);
  if (fs.existsSync(file)) fs.unlinkSync(file);

  const registry = loadRegistry();
  delete registry[`${platform}:${account}`];
  saveRegistry(registry);
  console.log(`🗑️  Session deleted: ${platform}:${account}`);
}

/**
 * Connect to an already-running Chrome with debug port
 */
async function connectDebugBrowser(port = 9222) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const contexts = browser.contexts();
  const pages = contexts[0]?.pages() || [];
  return { browser, context: contexts[0], page: pages[0] };
}

module.exports = {
  launchSession,
  saveSession,
  deleteSession,
  hasSession,
  listSessions,
  connectDebugBrowser,
  sessionPath,
};
