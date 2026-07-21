# Computer-use Runtime Architecture / Status Map

This map is a developer-facing snapshot of the **current computer-use runtime layering** in LucaOS, with explicit scaffold/wiring boundaries so parallel contributors can change behavior safely.

## Maturity tags (inventory freeze)

| Tag | Meaning |
|---|---|
| **P** | Production spine candidate (compose / route / execute when flags on) |
| **G** | Guard / dry-run / readiness — keep as safety spine |
| **S** | Scaffold keep until real path proven |
| **L** | Leftover candidate (deprecate/alias first; delete only after zero refs) |

| Module | Tag | Notes |
|---|---|---|
| `browserRuntime/BrowserRuntimeRouter` | **P** | Real routing logic; needs real adapters registered |
| `browserRuntime/adapters/SandboxPlaywrightBrowserRuntimeAdapter` | **P** | Real sandbox adapter (driver-injected; flags default off) |
| `BrowserRuntimeRouterBridge` | **P** | Canonical CU → router request mapping |
| `BrowserRuntimeRouterDryRunAdapter` | **G** | Side-effect-free validation |
| `BrowserRuntimeRouterInvocationGuard` | **G** | Readiness gates before real invoke |
| `BrowserRuntimeRouterGuardedAdapter` | **G** | Status shell; no execution |
| `BrowserRuntimeRouterRealInvocationShell` | **P/G** | Hard stop until real flag + DI router; unlock path |
| `ComputerUsePipeline` / factories | **P** | Composition spine; default adapters still scaffold |
| `ComputerUseSandboxExecutorAdapter` | **S→P** | Simulated by default; real backend is phased |
| `ComputerUseSandboxBrowserAdapter` | **S** | Maps + metadata; simulated unless delegated later |
| Dual flag aliases | **L** | Normalized in `computerUseFeatureFlags.ts` (aliases still accepted) |
| Thin `createX` factories | **G** | Public API stability for live modules |
| Mission tape bridges / in-memory sink | **S→P** | External sink via `enableMissionTapeSink` |

**Hard-deleted (unused outside self-tests):** `ComputerUseBrowserRuntimeBridge`, multi-lane `ComputerUseBrowserRuntimeAdapterScaffold` + factory, `ComputerUseSandboxBrowserProvider`, `createBrowserRuntimeContractProbe` / `BrowserRuntimeContract`.

Canonical real path (settings / flag-gated):  
`computerUseStackService` → pipeline/executor → router bridge → dry-run → shell → `BrowserRuntimeRouter.route()` → sandbox adapter + Playwright/Electron driver.

### Cleanup policy

- Simulated pipeline when `realSandboxEnabled` is false is **safety**, not unfinished wiring.
- Scaffold-only modules with zero product callers were removed after scoped reference audit.


## Concise architecture flow (current)

Mission-like input  
→ `ComputerUseMissionIntegrationAdapter`  
→ `ComputerUseMissionRuntimeDispatcher`  
→ `createComputerUseRuntime`  
→ `ComputerUsePipeline`  
→ `FocusContextBuilder` / `ActionPlanner` / `GuardBridge` / `Executor` / `Verifier` / `Recovery`  
→ Mission Tape Event Bridge  
→ BrowserRuntime Adapter Boundary

## Layer status map

| Layer | Primary file/module | Current status | Safety metadata posture | Real APIs called? | Next likely upgrade |
|---|---|---|---|---|---|
| Focus Context | `src/services/computerUse/ComputerUseFocusContext.ts` | **Scaffold** (context modeling only) | Default sandbox bias, dangerous/untrusted context propagation, guard-required annotations | No | Add richer multimodal grounding and confidence contracts |
| Action Planner | `src/services/computerUse/ComputerUseActionPlanner.ts` | **Scaffold** (plan candidates only) | Preserves guard requirement, observe fallback, no side effects | No | Add stronger planning heuristics and deterministic plan traces |
| Executor Interface | `src/services/computerUse/ComputerUseExecutor.ts` | **Wired composition** over adapters with scaffold semantics | Deny/skip guard-gated or observe-only paths; metadata keeps non-invasive contract explicit | No (direct) | Expand adapter contract coverage and failure taxonomy |
| Guard Bridge | `src/services/computerUse/ComputerUseGuardBridge.ts` | **Scaffold + wired in pipeline** | Explicit `allowed` / `denied` / `needs_confirmation` outcomes with risk + confirmation metadata; direct-host/system calls remain forbidden | No | Expand policy sources/token validation while preserving scaffold safety |
| Sandbox Executor Adapter | `src/services/computerUse/ComputerUseSandboxExecutorAdapter.ts` | **Feature-safe scaffold adapter** (default enabled in factory) | Sandbox-only routing and scaffold metadata; no host control calls | No | Replace simulated execution with guarded sandbox browser-backed actions |
| Verification + Recovery | `src/services/computerUse/ComputerUseVerifier.ts`, `src/services/computerUse/ComputerUseRecovery.ts` | **Scaffold** | Verification blocks unsafe metadata; recovery proposes safe next steps only | No | Add deterministic verification plugins + bounded retry strategies |
| Mission Tape Bridge | `src/services/computerUse/ComputerUseMissionTapeBridge.ts` | **Scaffold** | Redaction-on by default, append-style event shaping, no persistence writes | No | Add injectable real sink contract behind explicit opt-in |
| Pipeline | `src/services/computerUse/ComputerUsePipeline.ts`, `src/services/computerUse/createComputerUsePipeline.ts` | **Wired composition** of scaffold components | Ordered lifecycle eventing, safe-fail behavior, scaffold metadata retained | No | Plug in real adapters while preserving safety defaults |
| Runtime factory | `src/services/computerUse/createComputerUseRuntime.ts` | **Wired composition** | Central assembly preserves scaffold guarantees and resettable runtime surface | No | Add injectable production adapters via explicit configuration |
| Mission runtime registry/dispatcher | `src/services/computerUse/ComputerUseMissionRuntimeRegistry.ts`, `src/services/computerUse/ComputerUseMissionRuntimeDispatcher.ts`, `src/services/computerUse/createComputerUseMissionRuntimeDispatcher.ts` | **Wired composition** with safe rejection paths | Normalized rejection metadata for unsupported kinds; computer-use-only route | No | Integrate with broader mission routing contracts |
| Mission integration adapter | `src/services/computerUse/ComputerUseMissionIntegrationAdapter.ts`, `src/services/computerUse/createComputerUseMissionIntegrationAdapter.ts` | **Feature-flagged boundary** + scaffold behavior | Explicit opt-in required (`computerUseEnabled` / `enableComputerUseDispatch`) | No | Promote as canonical entrypoint once mission orchestration is ready |
| Mission tape event bridge | `src/services/computerUse/ComputerUseRuntimeEventBridge.ts`, `src/services/computerUse/ComputerUseInMemoryMissionTapeSink.ts` | **Scaffold persistence boundary** | In-memory sink only, scaffold tags, storage disabled by default | No | Swap in real MissionTape sink injection path |
| BrowserRuntime adapter boundary | `ComputerUseSandboxBrowserAdapter` + `BrowserRuntimeRouterBridge` + `src/services/browserRuntime/*` | **Real-capable path** (flag/settings gated) | Dual scaffold adapters/bridges hard-deleted; sandbox mapping + real drivers remain | Only when real stack enabled | Product settings + `computerUseStackService` |
| Cloud-agent validation docs/helper | `docs/cloud-agent-testing-environment.md`, `ops/scripts/cloud-agent-validate-computer-use.sh` | **Wired developer workflow support** | Documents install blockers, scoped validation discipline, explicit failure reporting | N/A (docs/helper scope) | Keep updated with runtime test lanes and environment diagnostics |

## What not to do yet

- Do **not** call `robotjs` or direct host-control APIs yet.
- Do **not** call Playwright yet.
- Do **not** import BrowserRuntime directly from computer-use runtime components yet.
- Do **not** write to real MissionTape storage by default yet.
- Keep explicit opt-in feature flags for any runtime dispatch or browser-bridge path.
- Preserve scaffold metadata signals so callers can reliably detect scaffold vs real integration behavior.

## Suggested next PR sequence

0. ✅ BrowserRuntime adapter event recording (merged).
1. ✅ Mission context propagation for browser adapter events (PR #36 merged).
2. ✅ Real BrowserRuntime adapter contract discovery (documented + local type/probe boundary).
3. ✅ Sandbox browser adapter scaffold behind explicit feature flag (no real execution by default).
4. MissionTape real sink injection.
5. ✅ Guard approval policy hardening.
6. Direct-host executor only after sandbox/browser safety is stable.

## Agent workflow for parallel runtime work

- Use **small, focused PRs** that each change one layer boundary at a time.
- Avoid overlapping edits to `types.ts`, `index.ts`, and `README.md` across parallel tasks whenever possible.
- Use `docs/cloud-agent-testing-environment.md` and `ops/scripts/cloud-agent-validate-computer-use.sh` for testing/install blocker reporting.
- Document exact environment failures verbatim (command, error text, and scope impact) when validation is blocked.

## BrowserRuntime conformance hardening update

- Added a local BrowserRuntime conformance matrix for computer-use sandbox mapping.
- Sandbox adapter action mapping is now explicit and validated per action type; broad fallback-to-click behavior is removed.
- Unsupported/direct-host lanes remain rejected; `directHostAllowed` and `realBrowserExecutionEnabled` remain `false`.
- This phase still does not import/execute real BrowserRuntime/Playwright/browser/system actions.
- Next upgrade can prioritize either real MissionTape sink injection or BrowserRuntime router bridge integration depending on risk appetite.


### MissionTape external sink adapter
- Computer-use runtime event recording now supports an injected MissionTape-compatible external sink boundary via `ComputerUseMissionTapeSinkAdapter`.
- In-memory sink remains the default when no external sink is injected and explicitly enabled.
- External sink forwarding requires explicit `enableExternalMissionTapeSink: true` opt-in.
- This phase does not perform real filesystem/database/localStorage writes by default.
- A future PR can wire the stable LucaOS MissionTape interface into this adapter boundary once contract stability is confirmed.

## Guard decision tape observability update

- Guard decisions are now emitted through the runtime event bridge as both generic and status-specific mission tape events.
- `allowed`, `denied`, and `needs_confirmation` decisions are auditable even when execution is blocked, with mission/step/action/risk/status context preserved.
- Event metadata remains scaffold-safe (`systemApisCalled: false`, `directHostAllowed: false`, `requiresExplicitOptIn: true`) and no real browser/direct-host/system APIs are called in this phase.

## Guard confirmation bridge update

- `needs_confirmation` guard outcomes now have a scaffold confirmation contract via `ComputerUseGuardConfirmationBridge`.
- Confirmation requests and approval tokens are in-memory only and resettable; no real storage writes are introduced.
- Runtime guard decision payloads are confirmation-ready via optional `confirmationId` propagation where available.
- Real browser execution and direct-host execution remain disabled in this phase.
- Future UI/Voice confirmation surfaces can integrate by using the same confirmation request/result token contract.

## BrowserRuntime router bridge contract tests update

- Added `BrowserRuntimeRouterBridge` scaffold contract and tests in `src/services/computerUse`.
- Bridge maps sandbox computer-use actions to BrowserRuntimeRouter-compatible request shape without invoking real router execution.
- Explicit safety metadata confirms no BrowserRuntimeRouter runtime import/instantiation, no Playwright/browser/system calls, and no direct-host allowance.
- Current phase remains scaffold-only; a future feature-flagged router bridge adapter can consume this contract.


## Router bridge adapter update (feature-flagged)

- Sandbox browser adapter now supports feature-flagged BrowserRuntime router-bridge request generation only.
- The bridge path is metadata-only and keeps all no-real-execution guardrails intact (`browserRuntimeRouterImported: false`, `browserRuntimeRouterCalled: false`, `playwrightCalled: false`, `browserApisCalled: false`, `systemApisCalled: false`, `directHostAllowed: false`).
- If bridge validation fails, adapter rejects safely without enabling runtime/browser/host side effects.
- Future step: feature-flagged real BrowserRuntimeRouter invocation only after additional guard + tape validation gates are approved.

## BrowserRuntime router dry-run adapter update

- Added `BrowserRuntimeRouterDryRunAdapter` + factory wiring for side-effect-free router invocation simulation.
- Dry-run validates the tested router bridge contract and returns simulated invocation results without importing or instantiating `BrowserRuntimeRouter`.
- Snapshot/counter metadata now exposes dry-run readiness signals while preserving safety defaults (`playwrightCalled/browserApisCalled/systemApisCalled/directHostAllowed` remain `false`).
- Optional dry-run event callback hooks support mission-tape-friendly started/completed/failed records; callback write failures are non-fatal.
- Real browser execution remains disabled; next integration step can be feature-flagged real router invocation after dry-run guardrails are stable.

## BrowserRuntime real-router invocation guard design (current phase)

- BrowserRuntime router bridge mapping + validation and router dry-run adapter are available.
- Real BrowserRuntimeRouter invocation remains disabled by default in this phase.
- New guard-design contract requires all readiness gates to pass before any future real invocation path is enabled:
  - sandbox browser adapter enabled
  - router bridge enabled
  - dry-run enabled or prior dry-run pass evidence
  - explicit real-router feature flag enabled
  - guard decision `allowed`
  - no direct-host lane
  - no critical-risk action
  - risky-action confirmation approved
  - mission tape/event bridge availability
  - router route validation pass
  - rollback/failure result path available
- Direct-host remains forbidden and real browser execution remains off until a future dedicated adapter PR lands with tests.

## BrowserRuntime invocation readiness helper update (May 27, 2026)

- Added `BrowserRuntimeRouterInvocationGuard` helper to evaluate future real-router readiness without side effects.
- Readiness now uses explicit gates over feature flags, bridge request presence, dry-run results, guard decisions, confirmation status, lane, and risk level.
- Added optional input-shaping helper from sandbox adapter metadata for lightweight integration.
- This phase remains execution-disabled: no BrowserRuntimeRouter import/instantiation/call, no Playwright/browser/system calls, and no direct-host enablement.

- BrowserRuntimeRouter guarded adapter shell added under `src/services/computerUse` for readiness gating only (`blocked`/`dry_run_required`/`needs_confirmation`/`ready_but_not_invoked`). Real browser invocation remains disabled.

## UI bridge prep layer

Computer-use runtime now includes a service-level confirmation UI bridge scaffold that wraps the guard confirmation bridge and exposes subscription-oriented state for pending approvals/rejections, without browser or host execution.

## Real sandbox adapter foundation (2026-07-21)

- Added `SandboxPlaywrightBrowserRuntimeAdapter` under `src/services/browserRuntime/adapters/`.
- Driver is injectable (`BrowserDriver`) so unit tests never need Chromium.
- Factory `createSandboxBrowserRuntimeRouter` registers the adapter on `BrowserRuntimeRouter`.
- Defaults remain execution-disabled; older dual scaffold bridges/adapters were hard-deleted after reference audit.

## Real invocation unlock + pipeline backend (2026-07-21)

- `BrowserRuntimeRouterRealInvocationShell.invoke` is **async** and calls injected `router.route()` when readiness is ready.
- Without router DI: still `ready_but_real_invocation_disabled` (safe default).
- New statuses: `invoked` | `invoke_failed`.
- `ComputerUseSandboxExecutorAdapter` accepts `realSandboxExecutionEnabled` + `invocationShell`.
- Default path remains simulated; real path: bridge → dry-run → shell → router → driver.
- `createComputerUsePipeline({ realSandboxExecutionEnabled, invocationShell })` wires the default sandbox adapter.
- Direct-host remains forbidden; no Playwright import in computer-use modules.

## Real drivers + stack factory (2026-07-21)

| Piece | Path | Notes |
|---|---|---|
| Playwright driver | `src/services/browserRuntime/drivers/PlaywrightBrowserDriver.ts` | Dynamic `import("playwright")`; CSS selectors; ephemeral Chromium; inject `page` in tests |
| Electron sandbox driver | `src/services/browserRuntime/drivers/ElectronSandboxBrowserDriver.ts` | IPC `sandbox:create` / `sandbox:execute` luca-browser plans; role/name semantics |
| Stack factory | `src/services/browserRuntime/createRealSandboxComputerUseStack.ts` | `enabled: false` (default) = scaffold; `enabled: true` wires full real path |

```ts
import { createRealSandboxComputerUseStack } from "src/services/browserRuntime";
import { computerUseStackService } from "src/services/computerUse";

// Real (Node):
const stack = await createRealSandboxComputerUseStack({
  enabled: true,
  driverKind: "playwright",
  playwright: { headless: true },
  enableMissionTapeSink: true,
});
await stack.pipeline.run({ /* guardApprovalProvided: true */ });
await stack.dispose();

// Product path (settings-driven):
// Settings → Autonomy → Computer-use sandbox → Real sandbox browser
const productStack = await computerUseStackService.getStack();
await computerUseStackService.runPipeline({ missionId: "…", executionRequest: { guardApprovalProvided: true } });
```

### Settings (`LucaSettings.computerUse`)

| Key | Default | Effect |
|---|---|---|
| `realSandboxEnabled` | false | Master real-path switch |
| `driverKind` | auto | auto / playwright / electron_sandbox |
| `headless` | true | Playwright headless |
| `enableMissionTapeSink` | false | Forward shell events to MissionTapeRecorderService |

