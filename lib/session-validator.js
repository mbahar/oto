/**
 * lib/session-validator.js
 * 
 * Session health checks and auto-refresh logic.
 * Validates sessions, detects expiry, and manages session lifecycle.
 */

const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../sessions');
const REGISTRY_FILE = path.join(SESSIONS_DIR, 'registry.json');
const SESSION_METADATA = path.join(SESSIONS_DIR, 'metadata.json');

// Session TTL in hours (default 24 hours = 1 day)
const DEFAULT_SESSION_TTL = 24;

// Common expired session indicators per platform
const EXPIRY_INDICATORS = {
  amazon: [
    'signin',
    'login',
    'session has expired',
    'please sign in',
    're-authenticate'
  ],
  shopify: [
    'admin/auth/login',
    'session expired',
    'sign in'
  ],
  tiktok: [
    '/login',
    'login required',
    'session expired'
  ],
  poshmark: [
    '/login',
    'please log in',
    'session expired'
  ],
  ebay: [
    '/signin',
    'sign in',
    'session expired'
  ],
  paypal: [
    '/signin',
    'log in',
    'session timed out'
  ],
  indeed: [
    '/auth/signin',
    'sign in',
    'session expired'
  ],
};

/**
 * Load session metadata (tracks session age, staleness, etc.)
 */
function loadMetadata() {
  if (!fs.existsSync(SESSION_METADATA)) return {};
  return JSON.parse(fs.readFileSync(SESSION_METADATA, 'utf8'));
}

/**
 * Save session metadata
 */
function saveMetadata(metadata) {
  fs.writeFileSync(SESSION_METADATA, JSON.stringify(metadata, null, 2));
  fs.chmodSync(SESSION_METADATA, 0o600);
}

/**
 * Check if a session file exists
 */
function hasSessionFile(platform, account = 'default') {
  const file = path.join(SESSIONS_DIR, `${platform}--${account}.json`);
  return fs.existsSync(file);
}

/**
 * Get session age in hours
 * Returns null if session doesn't exist
 */
function getSessionAge(platform, account = 'default') {
  if (!hasSessionFile(platform, account)) return null;

  const registry = JSON.parse(
    fs.readFileSync(REGISTRY_FILE, 'utf8')
  );
  const key = `${platform}:${account}`;
  const meta = registry[key];
  
  if (!meta || !meta.savedAt) return null;

  const savedTime = new Date(meta.savedAt).getTime();
  const now = Date.now();
  const ageMs = now - savedTime;
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours;
}

/**
 * Check if session is valid (not expired and not stale)
 * Returns { valid: bool, age: hours, reason?: string }
 */
function isSessionValid(platform, account = 'default', maxAgeTTL = DEFAULT_SESSION_TTL) {
  const age = getSessionAge(platform, account);

  if (age === null) {
    return {
      valid: false,
      age: null,
      reason: 'Session file not found'
    };
  }

  const metadata = loadMetadata();
  const key = `${platform}:${account}`;
  const sessionMeta = metadata[key] || {};

  // Check if explicitly marked as stale
  if (sessionMeta.stale === true) {
    return {
      valid: false,
      age,
      reason: 'Session marked as stale (requires re-authentication)'
    };
  }

  // Check if exceeded TTL
  if (age > maxAgeTTL) {
    return {
      valid: false,
      age,
      reason: `Session expired (${maxAgeTTL}h TTL exceeded, age: ${age.toFixed(1)}h)`
    };
  }

  return {
    valid: true,
    age,
    reason: null
  };
}

/**
 * Mark a session as stale (requires re-authentication)
 * Called when we detect the user has been logged out
 */
function markSessionStale(platform, account = 'default', reason = null) {
  const metadata = loadMetadata();
  const key = `${platform}:${account}`;
  
  metadata[key] = metadata[key] || {};
  metadata[key].stale = true;
  metadata[key].staledAt = new Date().toISOString();
  metadata[key].staleReason = reason;
  metadata[key].lastChecked = new Date().toISOString();

  saveMetadata(metadata);
  console.log(`⚠️  Session marked stale: ${platform}:${account}${reason ? ` (${reason})` : ''}`);
}

/**
 * Mark a session as fresh/healthy after successful re-authentication
 */
function markSessionFresh(platform, account = 'default') {
  const metadata = loadMetadata();
  const key = `${platform}:${account}`;
  
  metadata[key] = metadata[key] || {};
  metadata[key].stale = false;
  metadata[key].freshedAt = new Date().toISOString();
  metadata[key].lastChecked = new Date().toISOString();

  saveMetadata(metadata);
  console.log(`✅ Session marked fresh: ${platform}:${account}`);
}

/**
 * Detect if a page indicates an expired/logged-out session
 * Returns { expired: bool, indicator?: string }
 */
async function detectSessionExpiry(page, platform) {
  if (!page) return { expired: false };

  const indicators = EXPIRY_INDICATORS[platform] || [];
  const url = page.url();
  const title = await page.title().catch(() => '');
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');

  // Check URL
  for (const indicator of indicators) {
    if (url.toLowerCase().includes(indicator.toLowerCase())) {
      return {
        expired: true,
        indicator: `URL contains: ${indicator}`,
        url
      };
    }
  }

  // Check page title
  for (const indicator of indicators) {
    if (title.toLowerCase().includes(indicator.toLowerCase())) {
      return {
        expired: true,
        indicator: `Title contains: ${indicator}`,
        title
      };
    }
  }

  // Check page body (limited to first 5000 chars to avoid huge DOM)
  const limitedText = bodyText.substring(0, 5000);
  for (const indicator of indicators) {
    if (limitedText.toLowerCase().includes(indicator.toLowerCase())) {
      return {
        expired: true,
        indicator: `Page text contains: ${indicator}`
      };
    }
  }

  return { expired: false };
}

/**
 * Attempt auto-refresh of a session by refreshing cookies/localStorage
 * NOTE: This doesn't re-login, it just refreshes the page in case there's a stale cookie
 * For true refresh (new login), the session must be re-captured with save-session.js
 */
async function autoRefreshSession(page, platform, account = 'default') {
  if (!page) {
    return {
      success: false,
      reason: 'No page object provided'
    };
  }

  try {
    // Attempt to reload the page
    await page.reload({ waitUntil: 'networkidle' });
    
    // Check if we're still logged in after reload
    const expiry = await detectSessionExpiry(page, platform);
    
    if (expiry.expired) {
      markSessionStale(platform, account, expiry.indicator);
      return {
        success: false,
        reason: `Session still expired after refresh: ${expiry.indicator}`
      };
    }

    markSessionFresh(platform, account);
    return {
      success: true,
      reason: 'Page reloaded and session appears valid'
    };

  } catch (error) {
    return {
      success: false,
      reason: `Refresh failed: ${error.message}`
    };
  }
}

/**
 * Get all session metadata and health status
 */
function getAllSessionHealth() {
  const registry = JSON.parse(
    fs.readFileSync(REGISTRY_FILE, 'utf8')
  );
  const metadata = loadMetadata();

  const health = {};
  for (const [key, meta] of Object.entries(registry)) {
    const [platform, account] = key.split(':');
    const sessionMeta = metadata[key] || {};
    const age = getSessionAge(platform, account);
    const validity = isSessionValid(platform, account);

    health[key] = {
      platform,
      account,
      age: age ? age.toFixed(1) : null,
      ...validity,
      stale: sessionMeta.stale || false,
      lastChecked: sessionMeta.lastChecked || null,
      savedAt: meta.savedAt
    };
  }

  return health;
}

/**
 * Clean up stale metadata for deleted sessions
 */
function cleanupMetadata() {
  const registry = JSON.parse(
    fs.readFileSync(REGISTRY_FILE, 'utf8')
  );
  const metadata = loadMetadata();

  let removed = 0;
  for (const key of Object.keys(metadata)) {
    if (!registry[key]) {
      delete metadata[key];
      removed++;
    }
  }

  if (removed > 0) {
    saveMetadata(metadata);
    console.log(`🧹 Cleaned up ${removed} stale metadata entries`);
  }
}

module.exports = {
  isSessionValid,
  getSessionAge,
  markSessionStale,
  markSessionFresh,
  detectSessionExpiry,
  autoRefreshSession,
  getAllSessionHealth,
  cleanupMetadata,
  hasSessionFile,
  loadMetadata,
  saveMetadata,
};
