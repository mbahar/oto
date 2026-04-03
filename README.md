# Oto 🤖

**Browser session management for AI automation agents.**

Oto solves the hardest part of browser-based automation: **staying logged in**. It manages authenticated browser sessions so AI agents, scripts, and automation tools can access any web platform without re-authenticating on every run.

Built and maintained by **Murat Bahar** ([@mbahar](https://github.com/mbahar)).

---

## The Problem Oto Solves

AI agents and automation scripts constantly hit walls:
- Websites require login
- Sessions expire unpredictably
- Re-authenticating breaks automation flows
- MFA and OAuth make scripted logins brittle

Oto handles all of this. **You log in once. Oto handles the rest.**

---

## How It Works

```
1. Login once manually in a real browser
       ↓
2. Oto captures and saves the full session
       ↓
3. Any agent or script loads the session
       ↓
4. Runs fully authenticated — no login needed
       ↓
5. Session expires? Oto detects it and prompts refresh
```

---

## Quick Start

```bash
git clone https://github.com/mbahar/oto.git
cd oto
npm install
```

**Save your first session:**
```bash
node scripts/save-session.js amazon    https://www.amazon.com
node scripts/save-session.js tiktok    https://www.tiktok.com/login
node scripts/save-session.js indeed    https://employers.indeed.com
node scripts/save-session.js poshmark  https://poshmark.com/login
node scripts/save-session.js shopify   https://accounts.shopify.com
node scripts/save-session.js twilio    https://console.twilio.com
node scripts/save-session.js paypal    https://www.paypal.com/signin
node scripts/save-session.js ebay      https://signin.ebay.com
```

A real browser opens → you log in → press Enter → session saved. That's it.

---

## Using Sessions in Your Agent/Script

```js
const { launchWithSession, saveSession } = require('./lib/browser');

// Launch with saved session — already logged in
const { browser, context, page } = await launchWithSession('amazon');

// Navigate directly to authenticated pages
await page.goto('https://www.amazon.com/orders');
// No login wall. Just content.

// If you make changes that update the session, save it back
await saveSession(context, 'amazon');
await browser.close();
```

---

## Project Structure

```
oto/
├── lib/
│   ├── browser.js        # Core session management
│   └── secrets.js        # API key management (for non-browser platforms)
├── platforms/
│   ├── lifx.js           # LIFX smart lights (API-based)
│   ├── twilio.js         # Twilio voice & SMS (API-based)
│   └── ...               # Add your own
├── scripts/
│   └── save-session.js   # Interactive session capture tool
├── sessions/             # Saved sessions — LOCAL ONLY, git-ignored
└── secrets/              # API keys — LOCAL ONLY, git-ignored
```

---

## Multi-Identity Support

Oto supports multiple accounts per platform — useful for agencies, multi-company setups, or separate personal/business contexts.

```bash
# Save different accounts for the same platform
node scripts/save-session.js amazon-personal  https://www.amazon.com
node scripts/save-session.js amazon-jebwa     https://www.amazon.com
node scripts/save-session.js tiktok-jebwa     https://www.tiktok.com/login
```

```js
// Use the right identity per task
const { launchWithSession } = require('./lib/browser');

const { page } = await launchWithSession('amazon-jebwa');    // business account
const { page } = await launchWithSession('amazon-personal'); // personal account
```

---

## Connecting to an Existing Browser (Debug Mode)

For live automation alongside a running browser session:

```bash
# Launch Chrome with debug port (run once)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/oto-chrome \
  --no-first-run
```

```js
const { connectDebugChrome } = require('./lib/browser');

// Connect to your already-open, already-logged-in Chrome
const { browser, page } = await connectDebugChrome();
await page.goto('https://employers.indeed.com/candidates');
// Uses your existing login — no session file needed
```

---

## API-Based Platforms

For platforms with direct APIs (no browser needed):

### LIFX Smart Lights
```bash
echo "LIFX_TOKEN=your_token" > secrets/lifx.env
node platforms/lifx.js list      # list all lights
node platforms/lifx.js on        # turn all on
node platforms/lifx.js off       # turn all off
```

### Twilio Voice & SMS
```bash
echo -e "ACCOUNT_SID=ACxxx\nAUTH_TOKEN=xxx\nFROM_NUMBER=+1xxx" > secrets/twilio.env
node platforms/twilio.js sms "+15551234567" "Hello from Oto"
node platforms/twilio.js call "+15551234567" "Automated message"
```

---

## Security

- `sessions/` and `secrets/` are **always git-ignored** — never pushed to GitHub
- Session files are `chmod 600` — only your user can read them
- Safe to fork and share — everyone brings their own sessions/secrets
- The `.gitignore` aggressively blocks any sensitive filename patterns

---

## Roadmap

- [ ] Session health checks (detect expired sessions automatically)
- [ ] Session refresh prompts (notify when re-login needed)
- [ ] MFA/2FA helpers
- [ ] Headless session validation
- [ ] More platform adapters (Shopify, Poshmark, eBay, TikTok Shop)
- [ ] Web UI for session management

---

## Requirements

- Node.js 18+
- Playwright (`npm install`)

---

## License

MIT — free to use, fork, and extend.
