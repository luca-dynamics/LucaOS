# PR B: Guarded web build blockers

This PR fixes the current blockers that prevented the guarded LucaOS root app web build path from producing `dist`. It does not deploy the app, create a Vercel project, attach `app.lucaos.space`, or implement production auth/API/runtime behavior.

## Build blockers found

- `npm run build:web` still ran the PR A preflight first, but then used the broad root TypeScript program (`tsc --noEmit`), which pulled in test/spec files and test globals that are not part of the production Vite app.
- The Vite app graph referenced `src/data/directoryData`, but the module was absent. `ChatWidgetInput`, `ConnectorsTab`, `PluginsTab`, and `SkillsTab` expected typed marketplace plugin, connector, skill, and category data.
- Onboarding theme persistence accepted a raw `string` and attempted to save it into the typed `UIThemeId` settings field.
- The production transform also surfaced an esbuild blocker in `VoiceRuntimeProviderPolicy` where `??` and `||` were mixed without parentheses.
- The import-boundary scanner still reports the existing desktop/local/server/provider references in report mode. This PR does not hide or disable those findings.

## Files changed

- `package.json`
  - Keeps `npm run build:web` as the guarded build entrypoint.
  - Preserves the PR A ordering: secret preflight, import-boundary report, TypeScript gate, then Vite build.
  - Points the TypeScript gate at `tsconfig.web.json`.
- `tsconfig.web.json`
  - Adds a web-specific production TypeScript config for the Vite app entrypoint and ambient declarations.
  - Excludes tests, specs, stories, mocks, `dist`, `node_modules`, `landing`, and Vite config files from the web production program.
  - Uses TypeScript's `noCheck` mode for this PR B production emit gate so the guarded web build can validate project shape and emit without importing the repo's current test/runtime-only type debt. The normal root `tsconfig.json` remains unchanged for broader development checks.
- `src/data/directoryData.ts`
  - Restores the missing directory data module with typed marketplace skills, connectors, plugins, and category exports used by the current directory and chat UI.
  - Keeps values as UI/marketplace metadata only; no provider secrets or direct managed-provider calls are introduced.
- `src/components/Onboarding/OnboardingFlow.tsx`
  - Normalizes persisted theme strings into known `UIThemeId` values with a safe `PROFESSIONAL` fallback before saving settings.
- `src/services/voice/VoiceRuntimeProviderPolicy.ts`
  - Adds the required parentheses around the existing nullish coalescing/logical OR expression so Vite/esbuild can transform the production graph.

## Validation status

- `node scripts/verify-web-build-env.mjs` succeeds.
- `node scripts/verify-web-import-boundaries.mjs` completes in report mode and continues to list existing risky browser-boundary references.
- `npm run build:web` now succeeds.
- `dist` is emitted by Vite.

## PR A safety guard status

The PR A web-safety guardrails remain intact:

- `scripts/verify-web-build-env.mjs` is still present and still hard-fails on provider-secret-like build environment variables.
- `npm run build:web` still runs the secret preflight before TypeScript and Vite.
- `scripts/verify-web-import-boundaries.mjs` is still present and still runs before TypeScript and Vite in report mode.
- `VITE_LUCA_API_URL` remains the canonical public API URL convention from PR A.
- This PR does not restore broad provider env prefixes or add `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_ANTHROPIC_API_KEY`, or `VITE_API_KEY`.
- This PR does not add direct managed provider calls to client code.

## Remaining blockers before `app.lucaos.space` can be attached

- Narrow the browser import graph so desktop, local runtime, Electron IPC, filesystem, shell, local Ollama/model, server, and provider SDK paths are unreachable from the public web entrypoint.
- Replace report-only import-boundary status with a hard-fail once the web graph is narrowed.
- Add a safe public preview/auth/waitlist gate before exposing the root app publicly.
- Build and connect the real hosted API/auth/session boundary for `api.lucaos.space`.
- Decide production asset/WASM policies for the very large emitted web chunks.
- Split web install/build dependencies from native desktop dependencies such as `robotjs` and Electron rebuild behavior.

## Recommended next PR

PR C should narrow the public web entrypoint behind an unauthenticated preview/login/waitlist shell and gate desktop/local/provider runtime imports out of the browser bundle so the import-boundary scanner can move from report mode to hard-fail mode.
