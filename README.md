# Oto 🤖

**Platform-agnostic browser session management for AI automation agents.**

Oto solves the hardest part of browser-based automation: **staying logged in**. It manages authenticated sessions for any website, with full multi-user and multi-account support — so AI agents, scripts, and automation tools can access any platform without re-authenticating.

Built and maintained by **Murat Bahar** ([@mbahar](https://github.com/mbahar)).

---

## The Problem

AI agents and automation scripts constantly hit walls:
- Every site requires login
- Sessions expire unpredictably  
- MFA and OAuth make scripted logins brittle
- Different accounts (personal vs business) need separate sessions
- Re-authenticating breaks automation flows

**Oto handles all of this. You log in once. It handles the rest.**

---

## How It Works

```
1. Run: node scripts/save-session.js amazon https://amazon.com murat
       ↓
2. Browser opens → you log in manually → press Enter
       ↓
3. Session saved to sessions/amazon--murat.json (local only, never committed)
       ↓
4. Any agent loads: launchSession('amazon', 'murat')
       ↓
5. Fully authenticated, no login wall, ready to automate
```

---

## Quick Start

```bash
git clone https://github.com/mbahar/oto.git
cd oto
npm install
```

---

## Session Management

### Save a session (any site, any account)

```bash
node scripts/save-session.js <platform> <url> [account]
```

```bash
# Personal accounts
node scripts/save-session.js amazon    https://www.amazon.com           personal
node scripts/save-session.js poshmark  https://poshmark.com/login       personal

# Business accounts (different identity, same platform)
node scripts/save-session.js amazon    https://www.amazon.com           jebwa
node scripts/save-session.js tiktok    https://www.tiktok.com/login     jebwa
node scripts/save-session.js shopify   https://accounts.shopify.com     jebwa
node scripts/save-session.js indeed    https://employers.indeed.com     jebwa
node scripts/save-session.js paypal    https://www.paypal.com/signin    jebwa
node scripts/save-session.js ebay      https://signin.ebay.com          jebwa
node scripts/save-session.js twilio    https://console.twilio.com       jebwa

# Any other site — completely platform-agnostic
node scripts/save-session.js mysite    https://app.mysite.com/login     myaccount
```

### List all sessions

```bash
node scripts/list-sessions.js
```

```
📦 Saved Sessions

  Platform         Account          Saved
  ─────────────────────────────────────────────────
  amazon           personal         Apr 3, 9:00 AM
  amazon           jebwa            Apr 3, 9:05 AM
  tiktok           jebwa            Apr 3, 9:10 AM
  indeed           jebwa            Apr 3, 9:15 AM
```

### Delete a session

```bash
node scripts/delete-session.js amazon jebwa
```

---

## Using Sessions in Your Agent or Script

```js
const { launchSession } = require('./lib/session-manager');

// Launch with saved session — already authenticated
const { browser, page, save } = await launchSession('amazon', 'jebwa');

// Go straight to authenticated pages — no login wall
await page.goto('https://www.amazon.com/orders');

// If the session was updated (new cookies etc.), save it back
await save();
await browser.close();
```

### Multiple accounts in one script

```js
const { launchSession } = require('./lib/session-manager');

// Personal and business accounts simultaneously
const personal = await launchSession('amazon', 'personal');
const business  = await launchSession('amazon', 'jebwa');

// Each runs independently, fully authenticated
await personal.page.goto('https://www.amazon.com/orders');
await business.page.goto('https://sellercentral.amazon.com');
```

### Check if a session exists before using it

```js
const { launchSession, hasSession } = require('./lib/session-manager');

if (!hasSession('tiktok', 'jebwa')) {
  console.log('No TikTok session — run: node scripts/save-session.js tiktok https://tiktok.com/login jebwa');
  process.exit(1);
}

const { page } = await launchSession('tiktok', 'jebwa');
```

### Connect to a running browser (debug mode)

```js
const { connectDebugBrowser } = require('./lib/session-manager');

// Connect to Chrome running with --remote-debugging-port=9222
const { browser, page } = await connectDebugBrowser();

// Control it — already logged into whatever you have open
await page.goto('https://employers.indeed.com/candidates');
```

---

## Project Structure

```
oto/
├── lib/
│   ├── session-manager.js   # Core — platform-agnostic session management
│   ├── browser.js           # Low-level browser utilities
│   └── secrets.js           # API key management (non-browser platforms)
├── platforms/
│   ├── lifx.js              # LIFX smart lights (API-based example)
│   └── twilio.js            # Twilio voice & SMS (API-based example)
├── scripts/
│   ├── save-session.js      # Save a session interactively
│   ├── list-sessions.js     # List all saved sessions
│   └── delete-session.js    # Remove a session
├── sessions/                # Sessions — LOCAL ONLY, git-ignored
│   └── registry.json        # Session metadata index
└── secrets/                 # API keys — LOCAL ONLY, git-ignored
```

---

## Session ID Format

Sessions are identified as `platform:account`:

| Session ID | Meaning |
|---|---|
| `amazon:personal` | Amazon, personal account |
| `amazon:jebwa` | Amazon, Jebwa business account |
| `tiktok:jebwa` | TikTok, Jebwa account |
| `indeed:murat` | Indeed, Murat's employer account |
| `myapp:alice` | Any app, Alice's account |

You define the naming. Oto doesn't care what the platform is.

---

## API-Based Platforms (No Browser Needed)

For services with direct REST APIs, use the `secrets` system:

```bash
# Create secrets/lifx.env
echo "LIFX_TOKEN=your_token" > secrets/lifx.env

# Control lights
node platforms/lifx.js list
node platforms/lifx.js on
node platforms/lifx.js off "label:Bedroom"
```

```bash
# Create secrets/twilio.env
cat > secrets/twilio.env << EOF
ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=your_auth_token
FROM_NUMBER=+1xxxxxxxxxx
EOF

node platforms/twilio.js sms "+15551234567" "Hello from Oto"
node platforms/twilio.js call "+15551234567" "Automated message"
```

---

## Security

- `sessions/` and `secrets/` are **always git-ignored** — never pushed to GitHub
- All session files are `chmod 600` — owner read/write only
- The `.gitignore` blocks all sensitive filename patterns
- **Safe to fork** — clone the code, bring your own sessions and secrets
- Sessions are stored locally on your machine only

---

## Roadmap

- [ ] Session health check (detect when a session has expired)
- [ ] Auto-refresh prompt (notify when re-login needed)
- [ ] MFA / 2FA helpers
- [ ] Session expiry tracking per platform
- [ ] Web UI for session management
- [ ] More platform adapters

---

## Requirements

- Node.js 18+
- `npm install` (installs Playwright)

---

## License

MIT — free to use, fork, and extend.
