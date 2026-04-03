/**
 * scripts/list-sessions.js
 * Show all saved sessions with status
 */

const { listSessions, hasSession } = require('../lib/session-manager');

const sessions = listSessions();

if (sessions.length === 0) {
  console.log('\n No sessions saved yet.\n');
  console.log('  Run: node scripts/save-session.js <platform> <url> [account]\n');
  process.exit(0);
}

console.log('\n📦 Saved Sessions\n');
console.log('  Platform         Account          Saved');
console.log('  ─────────────────────────────────────────────────────');

sessions.forEach(s => {
  const saved = new Date(s.savedAt).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  console.log(`  ${s.platform.padEnd(16)} ${s.account.padEnd(16)} ${saved}`);
});

console.log('');
