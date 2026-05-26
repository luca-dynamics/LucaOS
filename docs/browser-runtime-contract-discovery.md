# Browser Runtime Contract Discovery (Computer-Use)

## Scope
This document records the **current repository contract surfaces** related to BrowserRuntime / Ghost Browser / runtime-router integration for future computer-use execution adapters.

Safety intent for this phase:
- Discovery/type-only only
- No BrowserRuntime imports from computer-use scaffold code
- No Playwright/browser/system execution

## Search method
Repository discovery searched file names and source text for:
- `browser`, `BrowserRuntime`, `ghost`, `GhostBrowser`, `Playwright`, `chromium`, `webview`, `tab`, `page`, `navigation`, `runtime router`, `BrowserRuntimeRouter`, `sandbox browser`, `electron browser`, `automation`

Primary command used:
- `rg -n "browser|BrowserRuntime|ghost|GhostBrowser|Playwright|chromium|webview|tab|page|navigation|runtime router|BrowserRuntimeRouter|sandbox browser|electron browser|automation" src docs`

## Discovered browser/runtime candidates

| Candidate | Path | What it appears to do | Side | Safe to import now? | Risk notes |
|---|---|---|---|---|---|
| Browser runtime route types | `src/services/browserRuntime/types.ts` | Defines lane/action/request/result/router adapter interfaces for route selection and adapter dispatch | Runtime-side service contract | Yes (types are side-effect free) | Contract may evolve; keep computer-use boundary minimal |
| Browser runtime router | `src/services/browserRuntime/BrowserRuntimeRouter.ts` | Guard-aware lane selection (`ghost`, `sandbox`, `direct host`, `remote linked`) + adapter resolution | Runtime-side service orchestration | Conditional: logic import is safe, but should stay isolated until adapter contract is reviewed | Pulling router too early may couple computer-use scaffold to evolving browser-runtime policy |
| Browser runtime tests | `src/services/browserRuntime/BrowserRuntimeRouter.test.ts` | Establishes intended policy/route behavior | Runtime-side verification | N/A for production import | Canonical behavior signal for future adapter validation |
| Browser runtime README | `src/services/browserRuntime/README.md` | Documents policy intent and routing rule order | Runtime-side docs | N/A | Describes intent; not executable contract |
| Ghost Browser UI body | `src/components/GhostBrowser.tsx` | Electron `<webview>` browser body UI, navigation controls, event listeners | Electron/browser-side UI boundary | No for computer-use runtime now | UI-side component likely tied to Electron DOM/webview lifecycle; importing from runtime service would be unsafe coupling |
| Browser runtime router spec | `docs/browser/BROWSER_RUNTIME_ROUTER_SPEC.md` | High-level architecture/spec for lane routing | Documentation | N/A | Spec may lead implementation; must verify against code |
| Ghost browser spec | `docs/browser/GHOST_BROWSER_SPEC.md` | Browser body goals and embodiment position | Documentation | N/A | Product intent, not executable interface |
| Computer-use browser adapter scaffold | `src/services/computerUse/ComputerUseBrowserRuntimeAdapter.ts` | Current simulated boundary with explicit "no real browser" metadata | Runtime-side computer-use scaffold | Yes (already used) | Must remain simulation-only until reviewed contract is adopted |

## What was not found
- No concrete Playwright runtime implementation module wired into `src/services/browserRuntime`.
- No concrete `GhostBrowserRuntimeAdapter` class implementation in `src/services/browserRuntime`.
- No direct `BrowserRuntime` service import from computer-use runtime path.
- No concrete browser execution driver in computer-use runtime scaffolds.

## Observed real contract seam (today)
Most stable seam currently appears to be:
1. `BrowserRuntimeRequest` / `BrowserRuntimeRouteResult` + lane types in `src/services/browserRuntime/types.ts`.
2. Adapter pattern via `BrowserRuntimeAdapter` with `canHandle` + `execute`.
3. Router orchestration in `BrowserRuntimeRouter` that enforces trust/guard/lane policy before adapter dispatch.

Computer-use currently uses its own scaffold adapter metadata contract and does not directly bind to this runtime router seam.

## Recommended future adapter path
1. Keep computer-use on local type-only discovery contract during this phase.
2. Introduce a dedicated bridge mapping from computer-use planned actions to `BrowserRuntimeRequest` once contract review is approved.
3. Implement **sandbox browser real adapter behind feature flag** first.
4. Add conformance tests validating:
   - lane mapping,
   - guard approval handling,
   - no direct-host routing for untrusted flows,
   - stable metadata recording.
5. Only then evaluate optional direct-host/remote-linked lanes.

## Current phase conclusion
- Existing router/types provide a promising runtime-side contract candidate.
- Current safest move is local, side-effect-free discovery contract + probe in `computerUse` without importing real browser runtime modules.
