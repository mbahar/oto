/**
 * lib/secrets.js
 * Load API keys and credentials from secrets/ directory
 */

const path = require('path');
const fs = require('fs');

const SECRETS_DIR = path.join(__dirname, '../secrets');

/**
 * Load secrets for a platform from secrets/platform.env
 * Returns an object of KEY=VALUE pairs
 */
function loadSecrets(platform) {
  const file = path.join(SECRETS_DIR, `${platform}.env`);
  if (!fs.existsSync(file)) {
    throw new Error(`No secrets file found for "${platform}". Create: ${file}`);
  }
  
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    result[key.trim()] = rest.join('=').trim();
  }
  return result;
}

/**
 * Save secrets for a platform
 */
function saveSecrets(platform, data) {
  const file = path.join(SECRETS_DIR, `${platform}.env`);
  const content = Object.entries(data).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o600);
  console.log(`✅ Secrets saved: ${file}`);
}

/**
 * List available platforms (have a secrets file)
 */
function listPlatforms() {
  if (!fs.existsSync(SECRETS_DIR)) return [];
  return fs.readdirSync(SECRETS_DIR)
    .filter(f => f.endsWith('.env'))
    .map(f => f.replace('.env', ''));
}

module.exports = { loadSecrets, saveSecrets, listPlatforms };
