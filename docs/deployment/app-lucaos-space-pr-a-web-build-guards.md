# PR A: Guarded web build and browser-safety preflight

This follow-up implements the first safe foundation from the `app.lucaos.space` deployment audit. It does **not** deploy LucaOS, create a Vercel project, attach `app.lucaos.space`, or claim that the root app is production-ready for public web hosting.

## What changed

- Added `npm run build:web` as an explicit web-targeted build path.
- Added `scripts/verify-web-build-env.mjs`, a hard-fail preflight for provider secrets in the Vite/browser build environment.
- Hardened `vite.config.ts` so it loads only Vite-public variables, removes broad `API_`/`GEMINI_` client prefixes, and stops substituting provider API keys into client-side `process.env` shims.
- Unified the public API origin on `VITE_LUCA_API_URL`.
- Updated API URL resolution so `VITE_LUCA_RELEASE_TARGET=web` or `VITE_LUCA_RUNTIME_TARGET=vercel` does not silently fall back to `localhost`, `127.0.0.1`, local Cortex, or local Ollama defaults.
- Added `scripts/verify-web-import-boundaries.mjs` as a lightweight report-mode guard for risky browser-boundary references in the current root app graph.
- Added `.env.web.example` and updated `.env.vercel.example` to separate client-safe public values from server-only provider credentials.

## How to run

```bash
npm run build:web
```

The script sets:

- `VITE_LUCA_RELEASE_TARGET=web`
- `VITE_LUCA_RUNTIME_TARGET=vercel`

Then it runs, in order:

1. `node scripts/verify-web-build-env.mjs`
2. `node scripts/verify-web-import-boundaries.mjs`
3. `tsc --noEmit`
4. `vite build`

Vite runs only if the secret preflight, import-boundary report, and TypeScript check complete successfully.

## What the secret preflight blocks

The preflight fails closed when provider-secret-like variables are present and non-empty in the build environment. Blocked examples include:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `API_KEY`
- `VITE_OPENAI_API_KEY`
- `VITE_ANTHROPIC_API_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_API_KEY`
- other unprefixed provider key/token/secret names intended for server-side use

Error message shown by the preflight:

> No provider secret may be present in the Vite/browser build environment. Luca-managed provider keys must live server-side behind api.lucaos.space.

Allowed client values are public values such as release/runtime target flags, `VITE_LUCA_API_URL`, documented public cloud endpoints, and non-secret feature flags.

## Public API URL convention

`VITE_LUCA_API_URL` is now the canonical public API origin variable for the web app.

- It is public metadata, not a secret.
- It should remain empty for preview until the hosted API exists.
- It should point to `https://api.lucaos.space` only after that backend exists and is ready for the app.
- Web/Vercel mode must not fall back to a visitor's local machine.

## Import-boundary guard status

`node scripts/verify-web-import-boundaries.mjs` currently runs in report mode because the audited root import graph still contains desktop/local/server assumptions. It reports risky direct references such as Electron IPC/preload globals, Node built-ins, Electron paths, local Ollama operations, Cortex/server paths, and direct provider SDK imports.

To promote the guard to hard-fail later, run it with:

```bash
LUCA_WEB_IMPORT_BOUNDARY_FAIL=1 node scripts/verify-web-import-boundaries.mjs
```

## Remaining blockers from the audit

This PR intentionally does not solve all deployment blockers. Remaining work includes:

- Split or gate the root browser import graph so Electron, filesystem, shell, local model, Ollama, IPC, server, and native runtime paths are unreachable from the public web entrypoint.
- Create a safe unauthenticated preview/login/waitlist gate before exposing `app.lucaos.space`.
- Build the real hosted API/auth/session boundary for `api.lucaos.space`.
- Resolve existing TypeScript and Vite build failures found by the audit.
- Decouple web installs from native desktop dependencies such as `robotjs` and Electron rebuild behavior.
- Decide which large public assets and WASM files are required for web preview and apply production asset policies.

## Why this does not make `app.lucaos.space` ready

The guarded build path prevents known secret exposure patterns and avoids unsafe localhost defaults in web/Vercel mode, but the root app still has a broad mixed desktop/local/cloud architecture. The current static web artifact is not yet proven free of native/runtime imports, does not have production auth, and does not have a hosted Luca-managed API behind it.

## Recommended next PR

PR B should narrow the public web entrypoint behind a minimal unauthenticated preview/login/waitlist shell, with explicit feature gates that prevent importing desktop, local model, Ollama, filesystem, shell, and provider SDK runtime modules into the web bundle.
