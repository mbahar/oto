# Oto 🤖

**Personal automation framework — connect anything, control everything.**

Oto is an extensible automation layer that lets you control smart home devices, web platforms, voice services, and more — all from one place, with multiple user contexts (different companies, personal accounts, etc.).

Built and maintained by **Murat Bahar** ([@mbahar](https://github.com/mbahar)).

---

## What Oto Does

- 💡 **Smart Home** — Control LIFX lights, Arlo cameras
- 📞 **Voice & SMS** — Make calls, send texts via Twilio
- 🌐 **Web Automation** — Log into any website once, automate it forever
- 🔀 **Multi-Context** — Switch between different identities/companies seamlessly
- 🔐 **Secrets Management** — API keys and sessions stay local, never committed

---

## Quick Start

```bash
git clone https://github.com/mbahar/oto.git
cd oto
npm install
```

---

## Project Structure

```
oto/
├── lib/
│   ├── browser.js        # Playwright browser utils (connect, save sessions)
│   └── secrets.js        # Load/save API keys from local secrets/
├── platforms/
│   ├── lifx.js           # LIFX smart lights
│   ├── twilio.js         # Twilio voice & SMS
│   └── ...               # Add your own platforms here
├── scripts/
│   └── save-session.js   # Login once → save browser session for reuse
├── sessions/             # Browser sessions — LOCAL ONLY, git-ignored
└── secrets/              # API keys & tokens — LOCAL ONLY, git-ignored
```

---

## Platforms

### 💡 LIFX Smart Lights

Control any LIFX bulb or group via the LIFX Cloud API.

**Setup:**
1. Get your token at [cloud.lifx.com/settings](https://cloud.lifx.com/settings)
2. Create `secrets/lifx.env`:
```
LIFX_TOKEN=your_token_here
```

**Usage:**
```bash
# List all lights
node platforms/lifx.js list

# Turn all lights on/off
node platforms/lifx.js on
node platforms/lifx.js off

# Target a specific room
node platforms/lifx.js on "label:Living Room"
node platforms/lifx.js off "label:Bedroom"
```

**In your code:**
```js
const { getClient } = require('./platforms/lifx');
const lifx = getClient();

await lifx.turnOn();
await lifx.setBrightness('all', 0.5);        // 50%
await lifx.setColor('label:Kitchen', 'blue');
await lifx.turnOff('label:Bedroom');
```

---

### 📞 Twilio Voice & SMS

Make calls and send texts via Twilio.

**Setup:**
1. Get credentials at [console.twilio.com](https://console.twilio.com)
2. Create `secrets/twilio.env`:
```
ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=your_auth_token
FROM_NUMBER=+1xxxxxxxxxx
```

**Usage:**
```bash
# Send SMS
node platforms/twilio.js sms "+15551234567" "Hello from Oto!"

# Make a voice call
node platforms/twilio.js call "+15551234567" "Hello, this is an automated message."

# List your phone numbers
node platforms/twilio.js numbers
```

**In your code:**
```js
const { getClient } = require('./platforms/twilio');
const twilio = getClient();

await twilio.sendSMS('+15551234567', 'Alert: motion detected!');
await twilio.makeCall('+15551234567', 'Your package has arrived.');
```

---

### 🌐 Browser Session Automation

Login to any website once — Oto saves your session and reuses it automatically.

**Save a session:**
```bash
node scripts/save-session.js amazon    https://www.amazon.com
node scripts/save-session.js tiktok    https://www.tiktok.com/login
node scripts/save-session.js indeed    https://employers.indeed.com
node scripts/save-session.js poshmark  https://poshmark.com/login
node scripts/save-session.js shopify   https://accounts.shopify.com/store-login
```

A browser window opens → log in manually → press Enter → session saved.

**Use saved session in code:**
```js
const { launchWithSession, saveSession } = require('./lib/browser');

const { browser, context, page } = await launchWithSession('amazon');
await page.goto('https://www.amazon.com/orders');
// ...fully logged in, no manual login needed
```

---

## Adding a New Platform

### API-based platform:
```js
// platforms/myplatform.js
const { loadSecrets } = require('../lib/secrets');

function getClient() {
  const { API_KEY } = loadSecrets('myplatform');
  // your API calls here
}

module.exports = { getClient };
```

Create `secrets/myplatform.env`:
```
API_KEY=your_key_here
```

### Browser-based platform:
```js
const { launchWithSession } = require('../lib/browser');

async function doSomething() {
  const { browser, page } = await launchWithSession('mysite');
  await page.goto('https://mysite.com/dashboard');
  // automation code here
}
```

---

## Multi-Context / Multi-Identity

Oto supports switching between different identities (personal, business, etc.):

```js
// Use Jebwa context
const { loadSecrets } = require('./lib/secrets');
const jebwaKeys = loadSecrets('jebwa-twilio');

// Use personal context
const personalKeys = loadSecrets('personal-twilio');
```

Just name your secrets files with a prefix:
```
secrets/jebwa-twilio.env
secrets/personal-twilio.env
secrets/sirius-marine-twilio.env
```

---

## Security

- `secrets/` and `sessions/` are **always git-ignored** — never committed to GitHub
- All sensitive files are `chmod 600` (owner read/write only)
- The `.gitignore` blocks any file containing "secret", "token", "key", "password", or ".env"
- Safe to fork and share — bring your own secrets

---

## Requirements

- Node.js 18+
- Playwright (`npm install`)
- A Mac, Linux, or Windows machine

---

## License

MIT — free to use, fork, and extend.
