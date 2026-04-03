# Automation Infrastructure

Murat's personal automation stack. Extensible to any platform.

## Structure

```
automation/
├── lib/
│   ├── browser.js      — Playwright browser utils (connect, sessions, etc.)
│   └── secrets.js      — Load/save API keys from secrets/
├── platforms/
│   ├── lifx.js         — LIFX smart lights ✅
│   ├── twilio.js       — Twilio voice & SMS ✅
│   ├── arlo.js         — Arlo cameras (TODO)
│   ├── amazon.js       — Amazon/Alexa (TODO)
│   ├── tiktok.js       — TikTok Shop (TODO)
│   ├── poshmark.js     — Poshmark (TODO)
│   └── shopify.js      — Shopify (TODO)
├── scripts/
│   └── save-session.js — Login once, save browser session for reuse
├── sessions/           — Browser sessions (git-ignored, chmod 600)
└── secrets/            — API keys & tokens (git-ignored, chmod 600)
```

## Adding a New Platform

### API-based (token/key):
1. Create `secrets/platform.env` with your credentials
2. Create `platforms/platform.js` using `lib/secrets.js` to load them
3. Done — callable from any script or assistant task

### Browser-based (login required):
1. Run: `node automation/scripts/save-session.js <platform> <url>`
2. Log in manually in the browser
3. Press Enter — session saved to `sessions/platform.json`
4. Future scripts load this session automatically — no login needed

## Setup Status

| Platform | Type | Status | Setup Needed |
|----------|------|--------|-------------|
| LIFX | API token | ⏳ Needs token | Add `secrets/lifx.env` with `LIFX_TOKEN=xxx` |
| Twilio | API key | ⏳ Needs keys | Add `secrets/twilio.env` with SID/token |
| Amazon/Alexa | Browser | ⏳ Needs session | Run save-session.js |
| TikTok | Browser | ⏳ Needs session | Run save-session.js |
| Indeed | Browser | ⏳ Needs session | Run save-session.js |
| Poshmark | Browser | ⏳ Needs session | Run save-session.js |
| Shopify | Browser | ⏳ Needs session | Run save-session.js |
| Arlo | API | ⏳ TODO | Needs credentials |

## Security Notes
- `secrets/` and `sessions/` are git-ignored — never committed
- All secret files are chmod 600 (only your user can read)
- Sessions are equivalent to passwords — treat them accordingly
- Stored locally on Mac mini only
