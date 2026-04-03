/**
 * scripts/delete-session.js
 * Remove a saved session
 * 
 * Usage: node scripts/delete-session.js <platform> [account]
 */

const { deleteSession } = require('../lib/session-manager');

const platform = process.argv[2];
const account = process.argv[3] || 'default';

if (!platform) {
  console.log('Usage: node scripts/delete-session.js <platform> [account]');
  process.exit(1);
}

deleteSession(platform, account);
