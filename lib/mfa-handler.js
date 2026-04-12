/**
 * lib/mfa-handler.js
 * 
 * MFA / 2FA handling for automated session management.
 * Detects 2FA screens and handles TOTP, SMS, and email codes.
 */

const fs = require('fs');
const path = require('path');
const { sleep } = require('./utils');

const SESSIONS_DIR = path.join(__dirname, '../sessions');
const MFA_REGISTRY = path.join(SESSIONS_DIR, 'mfa-config.json');

// MFA detection patterns for common platforms
const MFA_PATTERNS = {
  totp: [
    'authenticator',
    'authentication code',
    'one-time',
    'otp',
    'verify code',
    'enter code',
    '6-digit',
    'totp'
  ],
  sms: [
    'text',
    'sms',
    'text message',
    'mobile number',
    'phone',
    'code sent to'
  ],
  email: [
    'email code',
    'code sent to email',
    'verify email',
    'check your email'
  ],
  backup: [
    'backup code',
    'recovery code',
    'backup codes'
  ]
};

/**
 * Load MFA configuration (stores TOTP secrets, phone numbers, etc.)
 */
function loadMFAConfig() {
  if (!fs.existsSync(MFA_REGISTRY)) return {};
  const content = fs.readFileSync(MFA_REGISTRY, 'utf8');
  return JSON.parse(content);
}

/**
 * Save MFA configuration
 */
function saveMFAConfig(config) {
  fs.writeFileSync(MFA_REGISTRY, JSON.stringify(config, null, 2));
  fs.chmodSync(MFA_REGISTRY, 0o600);
}

/**
 * Detect if a page shows an MFA prompt
 * Returns { hasMFA: bool, type?: 'totp'|'sms'|'email'|'backup', indicators?: string[] }
 */
async function detectMFAPrompt(page) {
  if (!page) return { hasMFA: false };

  try {
    const url = page.url();
    const title = await page.title();
    const bodyText = await page.evaluate(() => 
      document.body.innerText.toLowerCase().substring(0, 10000)
    );

    // Check each MFA type
    const detected = {
      totp: [],
      sms: [],
      email: [],
      backup: []
    };

    // Check TOTP indicators
    for (const indicator of MFA_PATTERNS.totp) {
      if (bodyText.includes(indicator)) {
        detected.totp.push(indicator);
      }
    }

    // Check SMS indicators
    for (const indicator of MFA_PATTERNS.sms) {
      if (bodyText.includes(indicator)) {
        detected.sms.push(indicator);
      }
    }

    // Check Email indicators
    for (const indicator of MFA_PATTERNS.email) {
      if (bodyText.includes(indicator)) {
        detected.email.push(indicator);
      }
    }

    // Check Backup indicators
    for (const indicator of MFA_PATTERNS.backup) {
      if (bodyText.includes(indicator)) {
        detected.backup.push(indicator);
      }
    }

    // Determine primary MFA type (order of precedence)
    let primaryType = null;
    if (detected.totp.length > 0) primaryType = 'totp';
    else if (detected.sms.length > 0) primaryType = 'sms';
    else if (detected.email.length > 0) primaryType = 'email';
    else if (detected.backup.length > 0) primaryType = 'backup';

    if (primaryType) {
      return {
        hasMFA: true,
        type: primaryType,
        indicators: detected[primaryType],
        all: detected,
        url
      };
    }

    return { hasMFA: false };

  } catch (error) {
    return {
      hasMFA: false,
      error: error.message
    };
  }
}

/**
 * Handle TOTP (Time-based One-Time Password) input
 * Requires a TOTP secret already saved in MFA config
 */
async function handleTOTP(page, platform, account = 'default', secret = null) {
  if (!page) throw new Error('No page object provided');

  // Use provided secret or try to load from config
  const actualSecret = secret || getStoredMFASecret(platform, account);
  
  if (!actualSecret) {
    throw new Error(
      `No TOTP secret for ${platform}:${account}. ` +
      `Save during session setup with: saveMFASettings(platform, account, 'totp', secret)`
    );
  }

  try {
    // Generate TOTP code using speakeasy or similar
    // For now, we'll require manual input or a pre-shared secret
    const totp = require('speakeasy');
    const code = totp.totp({
      secret: actualSecret,
      encoding: 'base32'
    });

    // Find the input field for the code
    const inputSelectors = [
      'input[name*="code"]',
      'input[name*="otp"]',
      'input[placeholder*="code"]',
      'input[placeholder*="Code"]',
      'input[type="text"]',
      'input[type="number"]'
    ];

    let foundInput = null;
    for (const selector of inputSelectors) {
      const element = await page.$(selector);
      if (element) {
        foundInput = element;
        break;
      }
    }

    if (!foundInput) {
      throw new Error('Could not locate TOTP input field');
    }

    // Fill the code
    await foundInput.fill(code);
    console.log(`✅ TOTP code entered for ${platform}:${account}`);

    // Look for submit button and click if found
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Verify")',
      'button:has-text("Continue")',
      'button:has-text("Submit")'
    ];

    for (const selector of submitSelectors) {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
        break;
      }
    }

    return { success: true, method: 'TOTP' };

  } catch (error) {
    throw new Error(`TOTP handling failed: ${error.message}`);
  }
}

/**
 * Handle SMS code input
 * Waits for user to receive SMS and enter code manually
 */
async function handleSMS(page, platform, account = 'default', promptUser = null) {
  if (!page) throw new Error('No page object provided');

  try {
    console.log(`\n📱 SMS code required for ${platform}:${account}`);
    console.log('   Check your phone for a text message with a verification code.\n');

    // If a promptUser function is provided, use it (for interactive sessions)
    if (promptUser && typeof promptUser === 'function') {
      const code = await promptUser('Enter the SMS code: ');
      if (!code) throw new Error('No code provided');

      const inputSelectors = [
        'input[name*="code"]',
        'input[name*="sms"]',
        'input[placeholder*="code"]',
        'input[type="text"]'
      ];

      let foundInput = null;
      for (const selector of inputSelectors) {
        const element = await page.$(selector);
        if (element) {
          foundInput = element;
          break;
        }
      }

      if (foundInput) {
        await foundInput.fill(code);
      }

      // Try to submit
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      }

      return { success: true, method: 'SMS' };
    }

    throw new Error('SMS handling requires user interaction (promptUser callback)');

  } catch (error) {
    throw new Error(`SMS handling failed: ${error.message}`);
  }
}

/**
 * Handle email code input
 * Similar to SMS but for email-based verification
 */
async function handleEmail(page, platform, account = 'default', promptUser = null) {
  if (!page) throw new Error('No page object provided');

  try {
    console.log(`\n📧 Email verification code required for ${platform}:${account}`);
    console.log('   Check your email for a verification code.\n');

    if (promptUser && typeof promptUser === 'function') {
      const code = await promptUser('Enter the email code: ');
      if (!code) throw new Error('No code provided');

      const inputSelectors = [
        'input[name*="code"]',
        'input[name*="email"]',
        'input[placeholder*="code"]',
        'input[type="text"]'
      ];

      let foundInput = null;
      for (const selector of inputSelectors) {
        const element = await page.$(selector);
        if (element) {
          foundInput = element;
          break;
        }
      }

      if (foundInput) {
        await foundInput.fill(code);
      }

      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      }

      return { success: true, method: 'Email' };
    }

    throw new Error('Email handling requires user interaction (promptUser callback)');

  } catch (error) {
    throw new Error(`Email handling failed: ${error.message}`);
  }
}

/**
 * Save MFA settings for a session
 * Stores TOTP secret, phone number, email, etc.
 */
function saveMFASettings(platform, account = 'default', mfaType = 'totp', secret = null, metadata = {}) {
  const config = loadMFAConfig();
  const key = `${platform}:${account}`;

  config[key] = {
    platform,
    account,
    mfaType,
    savedAt: new Date().toISOString(),
    ...metadata
  };

  // Store secret securely (only for TOTP)
  if (mfaType === 'totp' && secret) {
    config[key].secret = secret;
  }

  // Store phone/email for SMS/Email methods
  if ((mfaType === 'sms' || mfaType === 'email') && metadata.contact) {
    config[key].contact = metadata.contact;
  }

  saveMFAConfig(config);
  console.log(`✅ MFA settings saved for ${platform}:${account} (type: ${mfaType})`);
}

/**
 * Get stored MFA secret for a session
 */
function getStoredMFASecret(platform, account = 'default') {
  const config = loadMFAConfig();
  const key = `${platform}:${account}`;
  return config[key]?.secret || null;
}

/**
 * Get MFA settings for a session
 */
function getMFASettings(platform, account = 'default') {
  const config = loadMFAConfig();
  const key = `${platform}:${account}`;
  return config[key] || null;
}

/**
 * Delete MFA settings for a session
 */
function deleteMFASettings(platform, account = 'default') {
  const config = loadMFAConfig();
  const key = `${platform}:${account}`;
  delete config[key];
  saveMFAConfig(config);
  console.log(`🗑️  MFA settings deleted for ${platform}:${account}`);
}

/**
 * List all MFA-enabled sessions
 */
function listMFASessions() {
  const config = loadMFAConfig();
  return Object.entries(config).map(([key, settings]) => ({
    key,
    platform: settings.platform,
    account: settings.account,
    mfaType: settings.mfaType,
    savedAt: settings.savedAt,
    contact: settings.contact || 'not specified'
  }));
}

module.exports = {
  detectMFAPrompt,
  handleTOTP,
  handleSMS,
  handleEmail,
  saveMFASettings,
  getMFASettings,
  getStoredMFASecret,
  deleteMFASettings,
  listMFASessions,
  loadMFAConfig,
  saveMFAConfig,
};
