# Oto 🤖

Personal automation framework for Murat Bahar.

Oto connects to any platform — lights, cameras, voice, web services — through a unified, extensible interface. Multiple users and contexts (Julia/Jebwa, Murat/Personal, other companies) can share the same codebase.

## Quick Start

```bash
git clone https://github.com/mbahar/oto.git
cd oto
npm install
```

Add your secrets:
```bash
cp secrets/.gitkeep secrets/lifx.env
# Edit lifx.env: LIFX_TOKEN=your_token_here
```

## Structure

```
oto/
├── lib/
│   ├── browser.js      — Playwright browser utils (connect, sessions)
│   └── secrets.js      — Load/save API keys from secrets/
├── platforms/
│   ├── lifx.js         — LIFX smart lights
│   ├── twilio.js       — Twilio voice & SMS
│   └── ...             — add new platforms here
├── scripts/
│   └── save-session.js — Save browser login sessions
├── sessions/           — Browser sessions (git-ignored)
└── secrets/            — API keys & tokens (git-ignored)
```

## Multi-User / Multi-Context

Oto supports identity switching. Each context (company, personal) can:
- Use different API keys (separate secrets files)
- Have saved browser sessions
- Send from different emails/numbers

## Adding a Platform

1. Create `secrets/platform.env` with credentials
2. Create `platforms/platform.js` (see existing for pattern)
3. Commit and push

## Security

- `secrets/` and `sessions/` are always git-ignored
- All sensitive files are chmod 600
- Never committed — stays local on the Mac mini

---

Built for Jebwa / Siriuslux LLC operations.
