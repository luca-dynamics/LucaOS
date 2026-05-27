# Computer-use Runtime Architecture / Status Map

This map is a developer-facing snapshot of the **current computer-use runtime layering** in LucaOS, with explicit scaffold/wiring boundaries so parallel contributors can change behavior safely.

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
| BrowserRuntime adapter boundary | `src/services/computerUse/ComputerUseBrowserRuntimeAdapter.ts`, `src/services/computerUse/createComputerUseBrowserRuntimeAdapter.ts`, `src/services/computerUse/ComputerUseBrowserRuntimeBridge.ts` | **Wired scaffold boundary + event recording merged** | Explicit bridge opt-in; event stream is recorded at adapter boundary while browser/playwright/system calls remain false in this phase | No | Contract discovery/type-only boundary completed; sandbox adapter scaffold behind explicit flag merged; next: BrowserRuntime router conformance or MissionTape sink injection |
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
