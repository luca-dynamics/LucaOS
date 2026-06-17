# PR C: Safe public web shell for LucaOS app preview

This PR adds the safe unauthenticated shell required before the LucaOS root app can be considered for a future `app.lucaos.space` preview path. It does **not** deploy LucaOS, create a Vercel project, attach `app.lucaos.space`, or implement the full hosted API/auth/device runtime.

## What was added

- `src/config/webAccessPolicy.ts` centralizes the public web access decision for the browser entrypoint.
- `src/components/web/PublicWebShell.tsx` adds a lightweight, browser-safe public shell for unauthenticated web visitors.
- `src/components/web/PublicWebShell.css` scopes the preview styling to the shell and avoids importing desktop, server, provider, local model, filesystem, shell, or IPC code.
- `src/index.tsx` now checks the web access policy before honoring query-param mode routes.
- `src/config/webAccessPolicy.test.ts` covers the public web preview default, query-param blocking, localhost API rejection, and the future authenticated-web-app path.

## How the web/vercel shell activates

The gate activates only when the browser build is explicitly marked as the public web/Vercel target:

```bash
VITE_LUCA_RELEASE_TARGET=web
VITE_LUCA_RUNTIME_TARGET=vercel
```

In that mode, LucaOS defaults to `web-preview` and renders the public shell unless a future authenticated session and public API boundary are both present. Today there is no implemented browser auth/session boundary, so the safe shell is the expected public behavior.

Local desktop/dev behavior remains unchanged when those explicit web/Vercel signals are absent.

## Query modes blocked in public web mode

In public web preview mode, query parameters cannot bypass the shell. The blocked modes are:

- `?mode=widget`
- `?mode=chat`
- `?mode=hologram`
- `?mode=mobile`
- `?mode=tv`

Those mode components remain available for desktop/local/dev contexts where the public web shell is not active.

## What remains unavailable until api.lucaos.space

The shell labels unavailable capabilities honestly:

- Desktop control requires the LucaOS desktop app.
- Local models/Ollama require the desktop/local runtime.
- Device linking requires future secure pairing.
- Memory/account data requires a future authenticated API.
- Provider/model routing requires a future server-side API boundary.

The shell does not introduce provider secrets, direct provider SDK calls, localhost fallbacks, Electron imports, filesystem access, local model managers, or desktop IPC hooks.

## Why app.lucaos.space still should not be attached immediately

This PR creates a safe unauthenticated preview shell, but it is not a deployment readiness sign-off. The full public app still needs:

- A real `api.lucaos.space` backend.
- Production auth/session handling.
- Secure device pairing.
- Final browser import-boundary hard-fail enforcement.
- Production asset/WASM review.
- A deployment PR that creates/attaches the actual hosting project and domain.

Until those pieces exist, `app.lucaos.space` should remain unattached.

## PR A/B safety preservation

This PR preserves the existing web build guards:

- `scripts/verify-web-build-env.mjs`
- `scripts/verify-web-import-boundaries.mjs`
- `npm run build:web`
- `VITE_LUCA_API_URL` as the canonical public API URL
- Vite env hardening and the no-localhost fallback behavior in web/Vercel mode
- `tsconfig.web.json`

## Recommended next PR

PR D should narrow the public web entrypoint/import graph so privileged desktop/local/server/provider runtime code is unreachable from the web preview bundle, then promote the import-boundary guard from report mode toward hard-fail once the graph is clean.
