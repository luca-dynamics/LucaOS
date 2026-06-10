# `app.lucaos.space` web deployment audit

**Audit date:** June 10, 2026
**Scope:** LucaOS repository root web application, its desktop/mobile/server boundaries, and a future Vercel project for `app.lucaos.space`
**Change type:** Audit and deployment planning only. This document does not deploy, create a Vercel project, change DNS/domains, or modify runtime code or deployment configuration.

## Executive decision

### Can the current root app deploy safely to Vercel as-is?

**No. Do not create or promote the root LucaOS Vercel project from the current branch as-is.**

The repository root is structurally a Vite + React single-page application and already contains a plausible static-host configuration (`vercel.json`, `dist`, SPA rewrite, and explicit web release flags). However, the current root is **not yet a safe or reproducible production browser deployment** for these reasons:

1. **The default clean install fails before the build.** `npm ci` attempts to build the native desktop dependency `robotjs` and fails in the audited Linux/Node 24 environment. The root `postinstall` also runs `electron-rebuild`, so a browser-only Vercel install is coupled to Electron/native packages it does not need.
2. **The production build does not pass its TypeScript gate.** After installing packages with lifecycle scripts suppressed solely for diagnosis, the exact web-targeted `npm run build` fails with existing application/test type errors and missing source modules before Vite can emit `dist`.
3. **The Vite configuration can compile server/provider secrets into the browser.** `vite.config.ts` loads all environment variables, accepts non-`VITE_` `API_` and `GEMINI_` prefixes, and explicitly maps `GEMINI_API_KEY`, `API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY` into `process.env` replacements. Any such value present during a Vercel build must be treated as public.
4. **The web capability gate is incomplete.** `src/config/lucaReleaseTarget.ts` defines the right high-level direction, but production usage is currently narrow: the principal UI enforcement found in the audit is the settings brain/Ollama surface. The main application import graph still includes services and tools that assume filesystem, shell, local processes, desktop IPC, local model runtimes, or the local Node/Cortex services.
5. **Browser runtime defaults still point at loopback services.** `src/config/api.ts` defaults to `127.0.0.1` ports for the Node API, Cortex, auth, and Ollama. On `app.lucaos.space`, those addresses refer to the visitor's device, not LucaOS infrastructure.
6. **The production API environment contract is inconsistent.** `.env.vercel.example` declares `VITE_LUCA_API_URL`, while `src/config/api.ts` reads `VITE_API_URL` (plus separate `VITE_CLOUD_API_URL` and `VITE_CLOUD_CORTEX_URL`). A deployment following the example would not configure the primary API URL used by the app.
7. **Cloud model calls and BYOK can execute directly in the browser.** The root import graph contains browser-enabled OpenAI and Anthropic adapters (`dangerouslyAllowBrowser: true`), Gemini client initialization, provider-key lookup, and direct provider endpoints. This is not acceptable for Luca-managed provider keys and needs an explicit product/security decision for user-supplied BYOK.
8. **There is no production authentication/session gate for the public app origin.** The current boot/onboarding flow is not the same as a web identity/session boundary. A visitor can reach the application shell without a defined login, waitlist, or intentionally limited preview state.
9. **Local persistence is not a production account data model.** Settings, chat history, model state, linked-host IP, and memory use browser storage in multiple paths. That storage is per browser profile, is clearable, is not cross-device, and should not hold durable account records or sensitive provider credentials.
10. **The browser artifact is large and broad.** `public/` is approximately 112 MB in the audited checkout and includes multiple large VAD/ONNX WASM artifacts plus an avatar model. Vite copies public assets to `dist`; this is deployable in principle but requires intentional asset/performance review.
11. **The current CSP is desktop/local oriented.** `index.html` permits unsafe inline/eval execution, loopback connections, and multiple direct model-provider origins, but does not define `https://api.lucaos.space` as the production application API boundary.

### What is possible now?

A **guarded root web build** is the minimum-change deployment target, but only after a dedicated browser-safety PR. The root already owns the Vite entrypoint and shared dashboard UI, so creating `web/`, `app/`, or `apps/web/` immediately would duplicate or move a large application before its runtime seams are understood.

The first production goal should be **Mode A — Web Preview**: a browser-only shell with native/local/tool-execution capabilities disabled by default, no Luca-managed secrets in the client, no dependency on localhost services, and a safe unauthenticated preview/login/waitlist state. Mode C can follow after `api.lucaos.space` exists. Mode B is not realistic yet.

## Non-negotiable domain boundary

| Hostname | Responsibility | Expected public behavior | Must not do |
| --- | --- | --- | --- |
| `lucaos.space` | Public marketing/product site from the separate `landing/` deployment | Render the public landing site | Render the LucaOS dashboard or own app sessions |
| `www.lucaos.space` | Landing alias/redirect | Redirect to or alias the marketing site according to the landing project's policy | Become the dashboard origin |
| `app.lucaos.space` | LucaOS browser app/dashboard | Render a safe preview, login/waitlist gate, or authenticated dashboard | Point to the landing deployment except as an explicitly documented temporary placeholder |
| `api.lucaos.space` | Future backend/runtime API | Return API responses/health metadata and enforce API authentication/CORS | Render or mirror the landing page; expose a local-core control plane anonymously |
| `docs.lucaos.space` | Future documentation site | Render product/developer documentation | Mirror the landing or app deployment accidentally |

Each hostname should be attached to its intended project/service only. A DNS record being present does not establish the deployment boundary; Vercel project-domain assignment and application routing must also be verified.

## 1. Current architecture

### Root application classification

**Yes: the repository root is a Vite React application.** Evidence includes:

- `package.json` uses `vite` for `dev`/`start`, `tsc && vite build` for production, React 18, and `@vitejs/plugin-react`.
- `index.html` loads `/src/index.tsx` into `#root`.
- `src/index.tsx` creates a React root and selects the main dashboard or query-parameter modes.
- `vite.config.ts` supplies the React plugin, development proxies, browser shims, and build rules.
- The default Vite output directory is `dist`; `capacitor.config.ts` and root `vercel.json` also identify `dist` as the web artifact.

The root is not *only* a web app package. Its dependency and script surface also acts as the umbrella for Electron, Capacitor, the local Node server, Cortex/Python, native integrations, and operations scripts. That mixed package boundary is the main deployment problem.

### Browser/web entrypoints

| Entry/path | Role | Browser assessment |
| --- | --- | --- |
| `index.html` | Browser document, CSP, fonts, loader, and `/src/index.tsx` module | Browser entrypoint, but CSP and desktop-transparent styling need production review |
| `src/index.tsx` | React bootstrap and query-parameter mode switch | Browser-safe primitives; imports all mode components eagerly |
| `src/App.tsx` | Primary LucaOS dashboard/application composition root | Web-capable UI, but has a very broad service/tool import graph and assumes local services in many flows |
| `?mode=widget` | `WidgetMode` | Primarily a desktop auxiliary-window mode; should not be a public production route without a web policy |
| `?mode=chat` | `ChatWidgetMode` | Desktop/widget-oriented; needs explicit web gating |
| `?mode=hologram` | `HologramMode` | Native/ambient capabilities are implied; disable or preview-only on web |
| `?mode=mobile` | `MobileCastReceiver` | Browser receiver surface, separate from the native mobile package |
| `?mode=tv` | `TVReceiver` | Browser receiver surface; requires a defined pairing/auth model |
| `public/*` | Static files copied by Vite | Browser assets; large WASM/model payloads require review |

The app does not currently use a conventional browser router for these top-level modes; it selects them using query parameters. The root `vercel.json` catch-all rewrite is still useful for future client-side routes and refreshes.

### Electron-specific files and paths

The desktop runtime is centered in:

- `platforms/electron/main.cjs`: Electron main process, window/tray management, native modules, filesystem state, process spawning, local server/Cortex lifecycle, OS control, screen/clipboard/window integration, and IPC handlers.
- `platforms/electron/preload.cjs`: privileged bridge exposed to the renderer as `window.electron` and `window.luca`.
- `platforms/electron/services/*.cjs`: desktop mission control, window watching, and recovery/medic functions.
- `platforms/electron/pentesting/wifiScanner.cjs`: native Wi-Fi scanning.
- `platforms/electron/phoenix.cjs`, `boot.html`, `recovery.html`, and desktop snippets.
- `ops/scripts/start-electron.cjs` and Electron scripts in `package.json`.
- Renderer code that calls `window.electron.ipcRenderer`, `window.luca`, or `window.require`, including `src/hooks/app/useAppIPC.ts`, `src/services/ModelManagerService.ts`, `src/services/nativeControlService.ts`, `src/services/agent/cognitive/CheckpointManager.ts`, and multiple components/tools.

These files are not deployable as static Vercel browser code. Their capabilities must remain behind a desktop runtime adapter and must never be simulated as successful privileged operations in production web mode.

### Mobile-specific files and paths

- `capacitor.config.ts` defines `com.luca.app` and uses `dist` as the native web bundle.
- `android/` and `ios/` are Capacitor native projects.
- `src/mobile/` contains mobile integration examples.
- `src/hooks/useMobile.ts`, `src/services/mobilePermissionManager.ts`, `src/services/lucaNativePlugin.ts`, QR/barcode/app-launcher integrations, and Capacitor checks in `src/App.tsx`/`src/hooks/app/useAppSystem.ts` are mobile-specific or mobile-aware.
- `public/mobile/` contains a separate static mobile receiver/control surface.

Capacitor's embedded web assets benefit from the current relative Vite base outside the Vercel target. Any root web-build work must preserve that difference.

### Server/backend-specific files and paths

- `server.js` is a long-running Express application and local control plane, not the Vite frontend and not a static Vercel output.
- `cortex/server/` contains Express routes, authentication middleware, local/runtime services, tool execution, device/system control, connectors, schedulers, memory, sockets, and orchestration.
- `cortex/python/` contains the Python agent/runtime, local model, STT, automation, file operations, security/recon tools, and platform adapters.
- `relay-server/` is a separate service/package boundary.
- `mcp-servers/` contains separate MCP server code.
- Files named `*.server.js` under `src/services/` are not browser modules even though they live under `src`.

The root `npm run server` command starts `server.js`. Vercel running `npm run build` does not deploy that process, and a static Vite deployment cannot satisfy its runtime assumptions.

### Browser-safe code paths

The following categories are generally suitable for a web release when their data sources are safe:

- React layout, visual components, themes, error boundary, loading UI, and pure state/view-model code.
- Pure audit, policy, type, fixture, and decision modules under areas such as `src/services/runtime/`, `src/experience/`, and `src/operation-center/` when they do not import runtime executors.
- Standard browser media APIs with explicit user permission (microphone, camera, screen share), provided the UI clearly distinguishes browser permission from desktop control.
- IndexedDB/browser storage for non-sensitive preview preferences and caches.
- `@mlc-ai/web-llm`, MediaPipe, TensorFlow.js, Web Audio, Web Workers, and WASM paths that are intentionally browser-targeted and performance-tested.
- HTTP calls to a production HTTPS API with authenticated sessions, constrained CORS, timeouts, and safe error handling.
- Optional no-op/unavailable states that report a capability as unavailable rather than claiming success.

### Local/desktop assumptions in the root import graph

The main root application directly or indirectly reaches code for:

- Electron IPC and preload bridges.
- Filesystem/path/os/process operations.
- Shell execution and child processes.
- Screen capture and OS-level input control.
- Local model discovery, Ollama installation/start/delete, and loopback model requests.
- MCP stdio/config checks.
- Local Node/Cortex endpoints on ports 3001, 3002, 3003, 8000, and 11434.
- Local memory/filesystem stores and local settings.
- Device discovery, mDNS/LAN linking, and linked-host IP persistence.
- Direct cloud-provider SDK use with browser-held keys.

Vite aliases some Node built-ins to `src/mocks/node_polyfills.js` and `src/mocks/child_process.js`. Those mocks may help bundling, but they are **not a security or product boundary**. Several methods silently return fake data/no-op results, and `child_process` mocks reference `Buffer`, which is not guaranteed in browsers. A production web build must exclude or explicitly gate the feature, not merely substitute a permissive mock.

## 2. Root Vercel deployability assessment

### Package scripts and install behavior

| Item | Finding | Deployment effect |
| --- | --- | --- |
| `npm run build` | Runs `tsc && vite build` | Correct shape for a typed Vite build if dependencies install and the graph compiles |
| `npm run preview` | Runs Vite preview server | Useful for local artifact validation, not a production server command |
| `npm run server` | Runs `node server.js` | Separate local backend; not included in static Vercel hosting |
| `postinstall` | Runs `electron-rebuild -v 40.7.0` | Unnecessary and risky for a web-only deployment |
| Root dependencies | Include `robotjs`, `better-sqlite3`, Electron, Playwright, server packages, and desktop integrations | Makes clean web installs slow, large, and native-build-sensitive |
| `engines` | Not declared | Vercel will use its selected/default Node major, which can change independently of the repo |

Audit command result:

- `npm ci` failed while building `robotjs` under Node `v24.15.0` on Linux. Therefore the current default Vercel install command is not reproducible as audited.
- A follow-up `npm ci --ignore-scripts` was used only to isolate frontend compilation from native install scripts. `--ignore-scripts` must not be adopted blindly as the production fix because it suppresses all lifecycle scripts and leaves the oversized mixed dependency boundary unresolved.
- With dependencies present, `VITE_LUCA_RELEASE_TARGET=web VITE_LUCA_RUNTIME_TARGET=vercel npm run build` still failed during `tsc`. Failures include missing `src/data/directoryData`, application type mismatches, test files included in the production TypeScript program, and missing test globals. The current command therefore does not produce `dist`.
- Running Vite alone did not bypass the blocker: `VITE_LUCA_RELEASE_TARGET=web VITE_LUCA_RUNTIME_TARGET=vercel npx vite build` failed because `src/components/ChatWidgetInput.tsx` imports the missing `src/data/directoryData` module.

### Vite configuration

Positive findings:

- React plugin is configured.
- Vercel builds use a root-relative `/` base when `VITE_LUCA_RUNTIME_TARGET=vercel` or `VERCEL=1`; Electron/Capacitor retain `./`.
- Browser shims and external declarations acknowledge the mixed runtime graph.
- Vite's default output is `dist`, matching `vercel.json` and Capacitor.

Blocking findings:

- `loadEnv(..., "")` loads every environment variable, not only public Vite variables.
- `define` explicitly injects provider-key variables into client code.
- `envPrefix: ["VITE_", "API_", "GEMINI_"]` broadens what can be exposed through `import.meta.env`.
- Build-time aliases turn privileged APIs into mocks instead of proving that unreachable web code is removed.
- The broad static import graph can still bundle desktop/local services even when UI buttons are hidden.
- `build.target: "esnext"` assumes modern browsers and should be an explicit support policy.
- Minification is disabled, increasing transfer size and making accidental embedded values easier to inspect (secrets would be exposed either way).

### TypeScript configuration

`tsconfig.json` is primarily browser-oriented (`DOM`, `WebWorker`, bundler module resolution) but includes all of `src/**/*`, which also contains server-like and Node-dependent modules. `allowJs` further brings JavaScript services under the root program. This makes the root type/build boundary wider than the intended browser artifact.

The configuration has `noEmit`, as expected for Vite, and `npm run build` correctly uses `tsc` as a gate. A future web build should have an explicit web tsconfig or an import graph that excludes server/native modules by construction.

### Static assets and output

- Output directory: `dist`.
- Vite copies `public/` into the output.
- The audited `public/` directory is roughly 112 MB, led by several 12–26 MB VAD/ONNX WASM files and an approximately 18 MB avatar GLB.
- Root-relative favicon and source paths work with the Vercel `/` base.
- Asset caching headers, compression behavior, lazy loading, and whether all WASM variants are required should be tested before production.

### Client/server boundary

The current root deployment would be static hosting only. It does **not** convert:

- Express routes in `server.js` or `cortex/server/` into Vercel Functions;
- Python Cortex processes into hosted runtime services;
- Electron IPC into web APIs;
- local Ollama into cloud model infrastructure;
- browser localStorage into account-scoped durable memory;
- local device discovery into a secure internet device broker.

Those are separate architecture decisions for `api.lucaos.space` and, where appropriate, a linked LucaOS desktop agent.

### Clear verdict

| Question | Answer |
| --- | --- |
| Can Vercel recognize the root as Vite? | Yes |
| Is `dist` the expected static output? | Yes |
| Is SPA fallback already configured? | Yes, via root `vercel.json` |
| Does a clean default install succeed in the audited environment? | No |
| Is the browser bundle proven free of server/provider secrets? | No; current Vite config can inject them |
| Are all Electron/local runtime features comprehensively gated? | No |
| Is a production API/auth/session boundary available? | No |
| Is the root safe to attach to `app.lucaos.space` now? | **No** |

## 3. Expected Vercel project settings

These are **provisional settings for after PRs A–C pass**, not authorization to create a project now.

| Setting | Proposed value | Notes/blocker |
| --- | --- | --- |
| Project name | `lucaos-app` | Distinct from the landing project; lowercase Vercel-safe name |
| Root Directory | `./` | Use only with the guarded root web mode; do not use `landing/` |
| Framework Preset | Vite | Root application is Vite React |
| Install Command | A dedicated web-safe command, ideally `npm ci` after dependency separation | Current `npm ci` fails on native `robotjs`; do not make `--ignore-scripts` the permanent architecture |
| Build Command | `npm run build:web` (recommended future script) or `npm run build` only after guards are complete | The dedicated command should set/validate web target and run type/build checks |
| Output Directory | `dist` | Current Vite/Capacitor/root Vercel convention |
| Node version | Pin `22.x` initially and validate it in CI; do not rely on the changing default | As of this audit, Vercel documents 24.x as default with 22.x and 20.x also available. The repo declares no engine, and native dependencies make version drift risky. Re-evaluate before project creation. |
| Environment variables | Client-safe web flags and public origins only | No provider secret may enter the Vite build environment |
| Domain | `app.lucaos.space` | Attach only after preview acceptance; do not attach to the landing project |

Official Vercel references current at audit time:

- [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vite on Vercel](https://vercel.com/docs/frameworks/vite)
- [Rewrites on Vercel](https://vercel.com/docs/rewrites)

### Recommended minimum deployment target

**Choose a guarded root build mode now.** Suggested future shape:

- `npm run build:web` uses a web-specific TypeScript/build boundary.
- Browser-safe adapters are selected at module boundaries, not after privileged modules are imported.
- Desktop/mobile/server dependencies are excluded from the web install/build where practical.
- `VITE_LUCA_RELEASE_TARGET=web` and `VITE_LUCA_RUNTIME_TARGET=vercel` are validated, not merely advisory.
- The build fails if forbidden imports or forbidden secret names enter the web graph.

Do not create `web/`, `app/`, or `apps/web/` merely to copy `src/`. Consider `apps/web/` later only if the repository adopts workspaces and can share UI/domain packages cleanly while giving Electron, API, and mobile independent dependency manifests.

## 4. Browser-safety risk register

| File/path | Risk type | Why it matters for Vercel/browser | Recommended treatment |
| --- | --- | --- | --- |
| `vite.config.ts` | Secret injection | Loads unprefixed env and substitutes server/provider key names into browser code | **Move server-side**; allowlist public variables; make build reject provider secrets |
| `.env.example` | Secret naming ambiguity | Places `VITE_API_KEY` beside server keys and encourages a provider key in a public prefix | **Document/rename** in a later PR; no cloud provider secret in Vite variables |
| `.env.vercel.example`, `src/config/api.ts` | Env contract mismatch | Example uses `VITE_LUCA_API_URL`; app reads `VITE_API_URL` | **Unify and validate** one public API-origin variable |
| `package.json` | Native install coupling | `robotjs`, SQLite, Electron, Playwright, server packages, and `electron-rebuild` affect a static web install | **Split dependency/build targets** or create a web-safe install path |
| `src/index.tsx` | Eager mode imports | Desktop-like widget/hologram/receiver modes enter the browser graph even when unused | **Lazy-load and environment-gate**; expose only approved public modes |
| `src/App.tsx` | Broad mixed-runtime composition | Imports many tools/services before runtime capability checks | **Runtime adapter + dependency inversion**; keep privileged modules out of web graph |
| `src/config/lucaReleaseTarget.ts` | Incomplete enforcement | Capability model is sound but currently has limited consumers | **Make authoritative** at service/tool/surface boundaries and add tests |
| `src/mocks/node_polyfills.js` | Misleading Node mocks | Fake filesystem/OS/crypto results can produce false success and are not security controls | **Disable in web build** or fail closed through typed unavailable adapters |
| `src/mocks/child_process.js` | Shell mock / `Buffer` assumption | A browser may lack `Buffer`; no-op shell calls can be interpreted as success | **Exclude from web graph** and return explicit unavailable errors |
| `src/hooks/app/useAppIPC.ts` | Electron IPC | Registers many renderer IPC listeners and sends privileged commands | **Defer to desktop app**; provide a no-IPC web adapter |
| `src/global.d.ts`, `platforms/electron/preload.cjs` | Privileged global bridge | Declares/exposes clipboard, mouse, vault, mission control, window controls, and IPC | **Desktop-only**; never emulate privileges in public browser code |
| `platforms/electron/main.cjs` | Native/system control | Uses Electron, filesystem, child processes, native modules, screen/window APIs, and local process lifecycle | **Desktop-only**; never deploy as Vercel frontend code |
| `src/services/ModelManagerService.ts` | Local model scan/Ollama/IPC | Calls loopback Ollama and Electron handlers for system specs/install/start/delete | **Disable in web build**; web shows unavailable state or calls a future API catalog |
| `src/services/llm/LocalLLMAdapter.ts`, `src/config/api.ts` | Local runtime | Assumes local Cortex/Ollama endpoints | **Environment-gate** and require an explicit linked-device or API route |
| `src/services/llm/OpenAIAdapter.ts` | API key in browser | Uses OpenAI SDK with `dangerouslyAllowBrowser: true` | **Move server-side** for managed keys; explicitly risk-review pure BYOK |
| `src/services/llm/AnthropicAdapter.ts` | API key in browser | Uses Anthropic SDK with `dangerouslyAllowBrowser: true` | **Move server-side** for managed keys; explicitly risk-review pure BYOK |
| `src/services/genAIClient.ts`, `src/services/liveService.ts` | Direct Gemini/browser provider calls | Reads client-visible keys and initializes provider SDK in the UI | **Require API backend** for Luca-managed access; gate BYOK separately |
| `src/services/models/ProviderKeyService.ts` | Client key sourcing | Recognizes environment and user provider key fields in frontend runtime | **Separate managed vs BYOK policy**; managed keys server-only |
| `src/services/settingsService.ts`, `src/services/secureVault.ts` | Credential persistence | Web vault wrapper is unavailable without Electron while settings support many key fields | **Do not fall back to plaintext**; use backend encrypted storage or explicit ephemeral BYOK |
| `src/services/memoryService.ts` | Browser memory persistence | Uses localStorage for memory/archive data; not durable, account-scoped, or ideal for sensitive content | **Mock/limit for preview**; full app requires backend storage and retention policy |
| `src/services/conversationService.ts` | Chat persistence | Chat history is browser-local and clearable | **Preview-local only** or move authenticated history server-side |
| `src/config/api.ts` | Loopback/network assumptions | Defaults to visitor-local ports, stores linked host IP, and patches global `fetch` | **Require explicit API origin**, isolate fetch client, and validate linked-device trust |
| `server.js`, `cortex/server/**` | Long-running backend/control plane | Express, sockets, schedulers, local files, process/platform control, and broad routes do not fit static hosting | **Deploy as separate API/runtime services** after security decomposition |
| `cortex/python/**` | Python/local agent runtime | Performs automation, local models, file operations, STT, and platform actions | **Backend/desktop runtime only**, never browser bundle |
| `src/tools/handlers/ServerToolDispatcher.ts` | Tool/system execution | Imports screen capture service and dispatches server/native tool operations | **Require API backend and approval policy**; browser only submits governed requests |
| `src/services/screenCaptureService.ts` | Shell/filesystem screen capture | Imports child process, filesystem, path, and crypto | **Desktop-only**; browser screen share needs a separate consent-based adapter |
| `src/services/audioCaptureService.js`, `src/services/audioAnalyzerService.js`, `src/services/alwaysOnAudioService.js` | Native audio/filesystem | Uses process execution/files and continuous sensing assumptions | **Desktop-only**; use explicit browser media adapter for approved preview features |
| `src/services/evolutionService.ts`, `src/services/pluginLoader.ts`, `src/services/fileWatcherService.js` | Source/file mutation | Filesystem, shell, and watcher operations cannot run safely in browser | **Disable in web build / defer to desktop** |
| `src/services/mcpDoctorService.ts`, `src/services/mcpClientManager.js` | MCP stdio/config execution | Reads local config and executes local checks/processes | **Desktop/backend only**; web may show remote MCP status from API |
| `src/services/iot/**`, `src/services/nativeControlService.ts` | Device/system control | Assumes local network, native bridge, or privileged tokens | **Require API/device broker**, explicit authorization, and environment gates |
| `src/services/lucaLink/**` | Device linking | LAN IP, discovery, relay, and host-control assumptions need identity and pairing security | **Require secure broker** on API/relay plus desktop agent; no anonymous LAN control |
| `index.html` | CSP/direct provider origins | Allows unsafe inline/eval, localhost, and many providers; lacks final app/API policy | **Harden CSP** after web graph is known; add only required production origins |
| `public/vad/**`, `public/models/avatar.glb` | Asset weight/caching | Large files increase deployment and first-use cost | **Lazy-load, cache, and prune variants** after usage measurement |
| `localStorage`/`sessionStorage` across `src/` | Persistence/privacy | Per-device, script-readable, clearable, and not suitable for server secrets or authoritative logs | **Classify data**, minimize retention, encrypt server-side where required |

## 5. Web deployment modes

### Mode A — Web Preview

A browser-only dashboard preview with:

- safe unauthenticated landing state inside `app.lucaos.space`;
- no local filesystem, shell, IPC, native control, local model install, or background agent execution;
- mock/demo data clearly labeled as preview data;
- optional browser-native media only after explicit permission;
- no Luca-managed provider keys in the client;
- disabled controls replaced with honest “Desktop required” or “Connect account/device” states;
- no required API dependency until the API is ready, or a narrowly scoped public preview API.

**Realistic now:** Yes, after focused browser-safety work. This is the recommended first deployment mode.

### Mode B — Full Web App

A production authenticated application backed by `api.lucaos.space`, with durable user data, server-side model routing, connectors, tools, jobs, audit logs, and device linking.

**Realistic now:** No. The required cloud auth, tenancy, persistence, secret management, API decomposition, job execution, and device broker are not established by the root static build.

### Mode C — Hybrid

A browser dashboard that uses `api.lucaos.space` for identity, secrets, orchestration, and durable state, while a paired LucaOS desktop/device agent performs approved local actions. Browser-native features can run locally when safe; privileged actions remain on the linked device or server.

**Realistic now:** This is the best medium-term product architecture, but not the first deployable milestone. It requires Mode A's browser shell plus the API and secure device-link boundaries.

### Recommendation

1. Ship **Mode A** to preview infrastructure only after PRs A–C.
2. Build toward **Mode C** as the production architecture.
3. Treat **Mode B** as a later option for capabilities that can truly run server-side; it should not imply that cloud infrastructure can or should reproduce every desktop OS-control capability.

## 6. Required `api.lucaos.space` boundary

The browser should request outcomes through authenticated, policy-enforced APIs. The following responsibilities belong on the future API/runtime side rather than in a public Vite bundle:

| Responsibility | API/backend requirement |
| --- | --- |
| Luca-managed model provider keys | Store in a secret manager; never return raw values to the browser |
| BYOK | Prefer encrypted server-side storage and scoped use. If an intentionally client-local BYOK mode is retained, label it clearly, never put it in build env, avoid localStorage, and document provider/CORS exposure risks |
| Server secrets/signing keys | Server-only environment/secret manager; rotate and audit access |
| User auth/session | Identity provider or owned auth, secure cookies/token exchange, CSRF strategy, logout/revocation, and tenant isolation |
| Memory storage | Account-scoped durable database/object store, retention/deletion/export controls, encryption, and authorization |
| Chat/conversation history | Durable, account-scoped storage with privacy controls and deletion |
| Tool execution | Server or linked-device executor with allowlists, approvals, timeouts, quotas, sandboxing, and result sanitization |
| Scheduled tasks | Durable queue/scheduler/workers, idempotency, retries, ownership checks, and cancellation |
| Device linking broker | Authenticated pairing, short-lived challenges, end-to-end trust model, revocation, presence, and relay routing |
| Approval event logs | Append-oriented account-scoped audit trail; browser localStorage is not authoritative |
| Agent runtime orchestration | Server workers/state machine with quotas, cancellation, observability, model policy, and tool governance |
| File processing | Signed upload/download, malware/content checks, size limits, isolation, lifecycle cleanup, and access control |
| Email/calendar/contact connectors | OAuth callback/token storage server-side, minimal scopes, refresh-token protection, webhook validation, and disconnect/revocation |
| Webhooks and third-party callbacks | Server endpoints with signature verification and replay protection |
| Rate limits/abuse controls | Identity/IP/device-aware rate limits and cost controls |
| Observability | Redacted logs, metrics, traces, security events, and correlation IDs without leaking prompts/secrets |

`api.lucaos.space` should not initially expose the entire local `server.js`/Cortex route set to the internet. The local control plane includes powerful system, automation, network, security, social, and execution routes. A public API must be a deliberately smaller allowlisted surface with strong authentication, authorization, tenancy, and abuse controls.

## 7. Environment variable strategy

### Client-safe Vite variables

Only values safe for every visitor to read from downloaded JavaScript may use `VITE_` names. Proposed contract (names to finalize in PR A/B):

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `VITE_LUCA_RELEASE_TARGET=web` | Select web product surface | No |
| `VITE_LUCA_RUNTIME_TARGET=vercel` | Select hosted browser runtime | No |
| `VITE_LUCA_APP_MODE=preview` or `production` | Select safe public experience | No |
| `VITE_LUCA_API_ORIGIN=https://api.lucaos.space` | Public API origin (when API exists) | No |
| `VITE_LUCA_DOCS_ORIGIN=https://docs.lucaos.space` | Public docs link | No |
| `VITE_LUCA_MARKETING_ORIGIN=https://lucaos.space` | Public marketing link | No |
| `VITE_ENABLE_DESKTOP_RUNTIME=false` | Explicit denial flag; defense in depth only | No |
| `VITE_ENABLE_LOCAL_MODEL_SCAN=false` | Explicit denial flag | No |
| `VITE_ENABLE_LOCAL_OLLAMA=false` | Explicit denial flag | No |
| `VITE_ENABLE_FILESYSTEM_MEMORY=false` | Explicit denial flag | No |
| `VITE_ENABLE_LUCALINK_NATIVE_CONTROL=false` | Explicit denial flag | No |
| `VITE_PUBLIC_AUTH_PROVIDER_ID` | Public auth client/project identifier if the chosen provider requires one | No, but provider-specific |
| `VITE_PUBLIC_SENTRY_DSN` or equivalent | Optional public telemetry ingestion identifier | Usually public; still apply privacy/sampling policy |
| `VITE_BUILD_SHA` | Release diagnostics | No |

The code currently uses `VITE_API_URL`, `VITE_CLOUD_API_URL`, `VITE_CORTEX_URL`, and related variables. PR A should collapse these into a small validated contract or document exact precedence. Do not leave multiple ambiguous production API variables.

### Server-only variables

These must never be available to the Vite build step or prefixed with `VITE_`:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY` or provider equivalents
- `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`
- OAuth client secrets and refresh-token encryption keys
- `GOOGLE_CLIENT_SECRET`, Notion/Slack/GitHub connector secrets, webhook signing secrets
- database URLs/credentials
- session/cookie signing secrets
- JWT private keys
- vault/master encryption keys such as `LUCA_VAULT_KEY`
- internal service tokens such as `LUCA_SECRET`
- email/SMS provider secrets
- object-storage secret keys
- internal observability tokens with write/admin scope

### Future API variables

Likely categories for the `api.lucaos.space` service, without inventing values:

- `APP_ORIGIN=https://app.lucaos.space`
- `CORS_ALLOWED_ORIGINS=https://app.lucaos.space`
- `DATABASE_URL`
- `REDIS_URL` or queue/cache endpoint
- auth issuer/audience/client IDs and server-side client secrets
- session cookie name/domain/security settings
- provider API keys
- KMS/vault key references
- object-storage bucket/region/credentials
- device relay/broker URL and signing keys
- worker/queue names and concurrency limits
- connector OAuth callback base URL (`https://api.lucaos.space/...`)
- webhook secrets
- logging/metrics/tracing endpoints and server tokens
- rate-limit and plan/quota settings

### Explicit warning

> **No provider secret, cloud API key, database credential, signing key, OAuth client secret, or Luca internal token may be exposed through a Vite client bundle.** A Vercel variable is not server-only merely because it is configured in the Vercel dashboard. If Vite reads or substitutes it during the frontend build, it is public.

PR A should add an automated bundle/config check that fails when forbidden secret variable names or known key patterns are present.

## 8. App routing and public behavior

### Expected behavior by origin

- `https://lucaos.space/` remains the marketing site deployed from `landing/`.
- `https://www.lucaos.space/` follows the landing alias/redirect policy.
- `https://app.lucaos.space/` loads the LucaOS application shell, not the landing site.
- An unauthenticated visitor to `app.lucaos.space` sees one of:
  - a clearly labeled safe preview;
  - a login screen;
  - a waitlist/access gate;
  - or a combination where preview is intentionally limited.
- `https://api.lucaos.space/` returns an API-appropriate response (for example a minimal service/health document), not marketing HTML.
- `https://docs.lucaos.space/` later loads the documentation project.
- Unknown/deep app routes must refresh without a Vercel 404. The existing SPA rewrite is directionally correct, but test asset paths and reserved paths.
- No subdomain should mirror the landing deployment unless that behavior is intentionally configured and documented.

### Application-state requirements

Before public traffic, the app must:

- fail closed when no API/session is available;
- never attempt privileged local actions merely because a user opens a query parameter;
- show offline/unavailable states rather than continuous loopback request errors;
- distinguish “browser preview,” “cloud connected,” “desktop linked,” and “local desktop” states;
- avoid implying that browser permission grants OS-level control;
- avoid initializing expensive microphone/camera/model assets before consent and need;
- provide error boundaries and recoverable loading states around optional subsystems.

### API routing recommendation

Prefer explicit browser calls to `https://api.lucaos.space` (or a well-defined same-origin proxy) through one typed API client. Do not let arbitrary components construct localhost/provider URLs. If a Vercel rewrite is later used as a proxy, define `/api/:path*` before the SPA catch-all, preserve authentication semantics, and test caching so personalized/API responses are never cached incorrectly.

## 9. Deployment readiness checklist

### Before creating the app Vercel project

- [ ] `npm ci` succeeds in a clean Linux environment using the pinned Node major.
- [ ] The app builds locally with the exact future Vercel web command.
- [ ] The root app runs in explicit browser/web mode without Electron, local Node, Cortex, or Ollama.
- [ ] Electron-only imports are excluded or guarded behind a typed runtime adapter.
- [ ] Filesystem, shell, native module, and server-only imports are absent from the production web graph.
- [ ] Native desktop dependencies do not run install/build steps for the web project.
- [ ] Server/provider secrets are not read by Vite and are absent from built assets/source maps.
- [ ] Direct Luca-managed provider SDK calls are removed from the browser path.
- [ ] BYOK product behavior and storage are explicitly approved and documented.
- [ ] The app has a safe unauthenticated preview/login/waitlist state.
- [ ] API-offline behavior is intentional and does not poll localhost indefinitely.
- [ ] App-level and subsystem error boundaries/loading states are present.
- [ ] Large public assets are inventoried, lazy-loaded where possible, and cache-tested.
- [ ] CSP is updated for the final approved origins and does not preserve unnecessary allowances.
- [ ] Vercel project name/root/framework/install/build/output/Node settings are fixed.
- [ ] Client-safe environment variables are enumerated and validated.
- [ ] Server-only variables are isolated from the frontend project/build.
- [ ] `app`, `api`, `docs`, landing, and `www` domain ownership is recorded.
- [ ] Preview deployment protection/access policy is selected.

### Before pointing `app.lucaos.space`

- [ ] A Vercel preview deployment passes functional and security review.
- [ ] Desktop Chrome/Edge/Firefox/Safari behavior is tested to the supported-browser policy.
- [ ] Mobile Safari and Chrome behavior is tested.
- [ ] Slow-network, offline, API-error, expired-session, and denied-permission states are tested.
- [ ] The landing site's app/dashboard link points to `https://app.lucaos.space` only after app readiness.
- [ ] Root and deep-route refreshes do not 404.
- [ ] Static asset paths, WASM workers, CSP, and cross-origin isolation requirements are tested.
- [ ] Built JavaScript/source maps contain no exposed secrets.
- [ ] No request unexpectedly targets `127.0.0.1`, `localhost`, or a model provider with a Luca-managed key.
- [ ] Desktop-only features are clearly labeled, disabled, or routed through an approved linked-device flow.
- [ ] API requests point to the correct backend or an intentionally mocked preview adapter.
- [ ] Authentication, logout, revocation, CORS, CSRF, and cookie behavior are tested on the real subdomains.
- [ ] `api.lucaos.space` and `docs.lucaos.space` do not resolve to the landing project accidentally.
- [ ] Observability is enabled with prompt/secret/PII redaction.
- [ ] Rollback steps and domain detachment/reattachment ownership are documented.

## 10. Recommended next PR sequence

### PR A — Web build and browser-safety guards

**Goal:** Make a clean, deterministic browser artifact that fails closed.

- Add a guarded `build:web` mode and web-specific import/dependency boundary.
- Remove provider-secret injection and tighten `envPrefix`/environment allowlisting.
- Resolve `VITE_LUCA_API_URL` versus `VITE_API_URL` and define one validated public config contract.
- Introduce typed runtime adapters for IPC, filesystem, shell, local models, memory, device control, and tool execution.
- Keep desktop modules out of the web graph rather than relying on mocks.
- Add forbidden-import and bundle secret scans.
- Ensure clean install does not build Electron/native dependencies for web.

### PR B — App Vercel configuration and preview readiness

**Goal:** Make deployment settings reproducible without creating the production project in code review.

- Finalize root directory, install/build/output commands, pinned Node major, SPA routing, cache headers, and preview environment contract.
- Add CI that runs the exact web install/build command.
- Inventory/prune/lazy-load large assets and validate WASM behavior.
- Harden CSP for preview-approved origins.
- Update deployment documentation to `lucaos.space` domain names and remove stale `luca-dynamics.com` guidance.

### PR C — Safe unauthenticated app shell for `app.lucaos.space`

**Goal:** Ensure public traffic cannot enter privileged or misleading flows.

- Add preview/login/waitlist state.
- Define browser-preview navigation and feature availability.
- Add offline/API-unavailable/loading/error states.
- Clearly label desktop-only and linked-device capabilities.
- Prevent query-parameter modes from bypassing public access policy.

### PR D — `api.lucaos.space` boundary scaffold

**Goal:** Establish a deliberately small production API, not an internet-exposed copy of the local core.

- Add auth/session/tenant boundary.
- Define provider proxy/model routing, durable storage, approval logs, jobs, file processing, and device broker interfaces.
- Add strict CORS, rate limits, validation, auditing, and secret management.
- Select hosting appropriate to long-running workers, sockets, Python, and queues; do not assume all local runtime services fit Vercel Functions.

### PR E — Domain and landing-link integration

**Goal:** Connect projects only after preview acceptance.

- Attach `app.lucaos.space` to the dedicated app project.
- Confirm `lucaos.space` and `www.lucaos.space` remain on the landing project.
- Point landing calls-to-action to the app origin.
- Verify `api.lucaos.space` and `docs.lucaos.space` project/service ownership.
- Test redirects, TLS, CSP, CORS, cookies, and no accidental project mirroring.

## 11. Audit acceptance criteria

| Criterion | Status in this audit PR |
| --- | --- |
| Adds `docs/deployment/app-lucaos-space-web-deployment-audit.md` | Met |
| Identifies whether root can deploy to Vercel as-is | Met: **not safely/reproducibly as-is** |
| Lists browser-safety risks with file paths | Met in the risk register |
| Defines Vercel settings or explains blockers | Met; provisional guarded-root settings plus blockers |
| Defines app/API/docs/landing domain boundaries | Met |
| Defines client-safe versus server-only env strategy | Met |
| Recommends next PR sequence | Met |
| Makes no runtime code changes | Required and validated by repository diff before commit |
| Makes no landing changes | Required and validated by repository diff before commit |
| Makes no deployment-config changes | Required and validated by repository diff before commit |

## Final recommendation

Treat the existing root web-release files as **directional scaffolding, not production readiness**. The right immediate target is a guarded root **Web Preview** build, followed by a hybrid architecture in which `app.lucaos.space` is the browser UI, `api.lucaos.space` owns identity/secrets/durable orchestration, and privileged local capabilities remain in a paired LucaOS desktop/device runtime.

Do not attach `app.lucaos.space` to the landing project, and do not attach it to the current root build until clean install, secret isolation, browser import boundaries, unauthenticated-state safety, and preview acceptance are complete.
