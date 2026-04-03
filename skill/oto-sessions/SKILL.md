---
name: oto-sessions
description: Manage browser sessions for any website using the Oto framework. Use when an agent needs to log into a website, reuse a saved login session, save a new session after manual login, list available sessions, or run automation on any platform without re-authenticating. Triggers on phrases like "log into", "open [site] as [account]", "save session", "list sessions", "automate [site]", or any task requiring an authenticated browser.
---

# Oto Sessions

Oto manages authenticated browser sessions for any website. Log in once — reuse forever.

## Setup

```bash
git clone https://github.com/mbahar/oto.git ~/oto
cd ~/oto && npm install
```

Sessions live in `~/oto/sessions/` — local only, git-ignored, chmod 600.

## Commands

**Save a session (opens browser for manual login):**
```bash
node ~/oto/scripts/save-session.js <platform> <url> [account]

# Examples:
node ~/oto/scripts/save-session.js amazon   https://www.amazon.com          jebwa
node ~/oto/scripts/save-session.js tiktok   https://www.tiktok.com/login    jebwa
node ~/oto/scripts/save-session.js indeed   https://employers.indeed.com    murat
node ~/oto/scripts/save-session.js poshmark https://poshmark.com/login      murat
node ~/oto/scripts/save-session.js shopify  https://accounts.shopify.com    jebwa
```

**List saved sessions:**
```bash
node ~/oto/scripts/list-sessions.js
```

**Delete a session:**
```bash
node ~/oto/scripts/delete-session.js <platform> [account]
```

## Using Sessions in Automation Code

```js
const { launchSession, hasSession } = require('~/oto/lib/session-manager');

// Check before using
if (!hasSession('tiktok', 'jebwa')) {
  console.log('Run: node ~/oto/scripts/save-session.js tiktok https://tiktok.com/login jebwa');
  process.exit(1);
}

// Launch — already authenticated
const { browser, page, save } = await launchSession('tiktok', 'jebwa');
await page.goto('https://www.tiktok.com/creator-center');

// Save updated session back
await save();
await browser.close();
```

## Multiple Accounts

```js
// Same platform, different accounts
const personal = await launchSession('amazon', 'personal');
const business  = await launchSession('amazon', 'jebwa');
```

## Session ID Format

`platform:account` — e.g. `amazon:jebwa`, `tiktok:murat`, `indeed:default`

You define the names. Oto doesn't know or care what the platform is.

## Workflow for Agents

1. Check `hasSession(platform, account)`
2. If missing → prompt user: `node ~/oto/scripts/save-session.js <platform> <url> <account>`
3. If exists → `launchSession(platform, account)` and automate
4. After task → call `save()` to persist cookie updates
