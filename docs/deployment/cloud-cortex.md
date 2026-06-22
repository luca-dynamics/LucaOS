# Deploying Cortex for the Web / Cloud target

The desktop app runs Cortex locally over loopback and needs no extra config.
This doc covers the **web build** (`build:web`, deployed to Vercel/static host),
whose browser bundle has **no local Cortex** and instead reaches one over HTTP.

## How the web build connects to Cortex

The web bundle never compiles Cortex (it is a separate Python process). At
runtime `src/config/api.ts` picks a Cortex base URL by connection tier:

| Tier | When | Cortex URL |
| --- | --- | --- |
| LOCAL | Electron / localhost dev | `http://127.0.0.1:8000` |
| LAN | Web/mobile paired to a desktop via LucaLink | `http://{linkedHostIp}:8000` |
| CLOUD | Public web, no pairing | `VITE_CLOUD_CORTEX_URL` |
| OFFLINE | No URL configured | none — mock DB, degraded |

So a public web deployment must point at a **hosted Cortex** via
`VITE_CLOUD_CORTEX_URL` (a "Light mode brain"), or users pair to their own
desktop (LAN tier).

## Security gate requirements (Phase 1)

Cortex now ships a security gate (`cortex/python/luca_security.py`). Local
desktop (loopback) callers are trusted; **remote callers are gated**. When you
host Cortex for the web, set these on the Cortex process/container:

| Variable | Required for cloud | Purpose |
| --- | --- | --- |
| `ENABLE_REMOTE_ACCESS=true` | **Yes** | Cortex now defaults to loopback-only (`false`). A container must opt in to bind `0.0.0.0`, or it is unreachable. |
| `LUCA_CORTEX_ALLOWED_ORIGINS` | **Yes** | Comma-separated CORS allowlist. Defaults to localhost origins; set to your web domain(s), e.g. `https://app.lucaos.space`. The old wildcard `*` is gone. |
| `LUCA_SECRET` | **Yes** | Shared master token (64 hex chars). Privileged routes require it from remote callers. Keep it consistent across the relay and Cortex. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

Frontend side (build-time):

| Variable | Purpose |
| --- | --- |
| `VITE_CLOUD_CORTEX_URL` | Public Cortex base URL the web bundle calls. |
| `VITE_LUCA_RELEASE_TARGET=web` / `VITE_LUCA_RUNTIME_TARGET=vercel` | Selects the web target. |

## Privileged routes are token-gated

The powerful routers — `osint`, `hacking`, `build`, `agent_tool` — require the
master token for any **non-loopback** caller and **fail closed** when no
`LUCA_SECRET` is configured. Consequences for the web target:

- The frontend already injects `X-LUCA-TOKEN` on Luca calls
  (`src/config/api.ts`), so **LAN-paired** clients (which hold the desktop's
  token) reach privileged routes normally.
- **Public web** clients have no token unless you build an auth flow to issue
  one. Until then, treat privileged routes as **desktop/LAN-only** on the web —
  this is intentional: a public URL must not expose pentest/OSINT endpoints
  unauthenticated.

## Minimal cloud Cortex env

```bash
ENABLE_REMOTE_ACCESS=true
LUCA_CORTEX_ALLOWED_ORIGINS=https://your-web-domain.com
LUCA_SECRET=<64-hex-char shared secret>
CORTEX_PORT=8000
```

## Running the Cortex test harness

```bash
cd cortex/python
python -m pip install -r requirements-dev.txt
python -m pytest            # security-gate tests live in tests/
```
