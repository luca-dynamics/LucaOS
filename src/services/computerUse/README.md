# Computer-use Focus Context + Action Planner

Minimal context-modeling and planning scaffold for computer-use focus signals and candidate actions.

## Scope

- Define shared types for cursor, region, focused element, screenshot, user-pointed target grounding, and action planning.
- Build immutable-ish context snapshots through `ComputerUseFocusContextBuilder`.
- Build planning-only action candidates through `ComputerUseActionPlanner`.
- Encode safety defaults and metadata only.

## Rules encoded in scaffold

- Default execution mode is `sandbox`.
- Untrusted contexts prefer and force `sandbox` execution mode.
- Dangerous contexts mark `requiresGuardApproval` when approval metadata is not provided.
- Guard decisions now return explicit statuses: `allowed`, `denied`, or `needs_confirmation`.
- User-pointed targets are recorded as high-value grounding signals.
- If no reliable focus target exists, planner falls back to `observe`.
- User-pointed targets can produce `click` candidates.
- Focused `textbox` element with text payload can produce `type_text` candidates.
- Non-observe actions inherit `requiresGuardApproval` from the focus context.
- Observe fallback remains `requiresGuardApproval: false`.
- Planner never executes actions.
- No mouse or keyboard actions are executed.
- No system API calls are performed.
- This service is context modeling and planning only.

## ComputerUseExecutor scaffold

`ComputerUseExecutor` defines execution contracts for planned actions while intentionally avoiding real mouse/keyboard/system calls.

- Execution delegates only to registered `ComputerUseExecutorAdapter` implementations.
- `observe` actions are skipped and never executed.
- Guard-gated actions are denied when approval is missing.
- Adapter matching requires execution-mode compatibility and action-type support.
- For untrusted or `prefersSandbox` plans, `direct_host` adapters are not selected unless explicitly requested.
- Metadata always indicates this scaffold itself does not perform system API calls.


## ComputerUseVerifier + ComputerUseRecovery scaffold

- `ComputerUseVerifier` verifies execution outcomes without screenshots or system API calls.
- `observe` actions that are skipped are marked `inconclusive` and require follow-up observation planning.
- Any result metadata indicating `systemApisCalled: true` fails verification immediately in this scaffold.
- `ComputerUseRecovery` only plans safe recovery strategy (observe again, sandbox retry, guard approval, or user escalation).
- Sandbox retry is suggested only when verification failed and actual `executionMode` is known to be non-`sandbox`; unknown mode escalates instead of blind retry.
- No real rollback, host actions, or system calls are performed by recovery in this phase.


## ComputerUseMissionTapeBridge scaffold

- `ComputerUseMissionTapeBridge` converts focus/planning/execution/verification/recovery outputs into mission-tape-compatible event records.
- Events are stored in-memory only for this scaffold phase.
- No storage writes are performed.
- No MissionTape service imports or integration are performed yet.
- `type_text` payload text is redacted by default and can be disabled only with `redactSensitiveText: false`.
- Tape record metadata always reports:
  - `bridgeKind: "scaffold"`
  - `storageWritesEnabled: false`
  - `missionTapeIntegrationEnabled: false`

## ComputerUsePipeline scaffold

- `ComputerUsePipeline` orchestrates focus context building, action planning, adapter-delegated execution, verification, recovery planning, and mission-tape recording.
- Pipeline execution remains non-invasive: no real mouse/keyboard/system APIs are called directly.
- If no matching executor adapter exists, pipeline fails safely and generates a recovery plan.
- Tape bridge records lifecycle events in order: focus context, action plan, execution results, verification results, and recovery plan.
- Redaction defaults are preserved for `type_text` payloads written to tape events.
- Dangerous contexts propagate guard-approval requirements through plan/execution/recovery.
- Guard bridge classifies action risk (`low`, `medium`, `high`, `critical`) and preserves scaffold-only safety metadata (`guardPolicyKind: "scaffold"`, `systemApisCalled: false`, `directHostAllowed: false`, `requiresExplicitOptIn: true`).
- Risky write-like actions (for example `click`/`type_text`) require explicit confirmation unless approval context is present.
- Critical/system-like actions (for example `hotkey` with terminal/delete/credential intent) are denied in scaffold mode.
- Pipeline result metadata always reports:
  - `pipelineKind: "scaffold"`
  - `systemApisCalled: false`


## Browser-runtime bridge + sandbox browser provider scaffold

- `ComputerUseBrowserRuntimeBridge` maps computer-use execution modes/actions into browser-runtime-style route requests/results without importing BrowserRuntime yet.
- `ComputerUseSandboxBrowserProvider` handles only `sandbox_browser` lanes and simulates route execution without real browser API calls.
- Both components report scaffold metadata and keep `browserRuntimeImported: false` / `browserApisCalled: false` for this phase.

## Default pipeline factory scaffold

- `createComputerUsePipeline()` returns a default safe scaffold pipeline with:
  - `ComputerUseFocusContextBuilder`
  - `ComputerUseActionPlanner`
  - `ComputerUseExecutor`
  - `ComputerUseGuardBridge`
  - `ComputerUseSandboxExecutorAdapter` (enabled by default, can be explicitly disabled)
  - `ComputerUseVerifier`
  - `ComputerUseRecovery`
  - `ComputerUseMissionTapeBridge`
- No `direct_host` adapter is registered by default.
- No direct real system/browser API calls are performed by the factory itself.

## Composed Computer-use Runtime

This module now exposes a first public import surface for assembling computer-use runtime components without reaching into individual implementation files.

### Public import surface

Use the barrel export at `src/services/computerUse/index.ts`:

```ts
import {
  createComputerUseRuntime,
  createComputerUsePipeline,
  ComputerUseRuntimeEntrypoint,
  ComputerUseMissionRunner,
  type ComputerUseRuntime,
} from "src/services/computerUse";
```

### Composed runtime factory

`createComputerUseRuntime()` composes scaffold runtime pieces into a stable object surface:

- `pipeline` from `createComputerUsePipeline()`
- `missionEngineBridge` from `ComputerUseMissionEngineBridge`
- `missionStepAdapter` from `ComputerUseMissionStepAdapter`
- `runtimeEntrypoint` from `ComputerUseRuntimeEntrypoint`
- `missionRunner` from `ComputerUseMissionRunner`
- `missionTapeAdapter` from `ComputerUseMissionTapeAdapter` (or injected override)
- convenience methods:
  - `runComputerUseStep(step)`
  - `runPipelineInput(input)`
  - `runMissionSteps(steps)`
  - `reset()`

### Scaffold vs wired status

- **Wired composition (this phase):** component composition, delegation paths, stable runtime object, and barrel exports.
- **Still scaffold/simulated:** guard/runtime/mission-tape/browser/system integrations remain mocked/scaffolded with metadata flags (for example `missionEngineImported: false`, `missionTapeImported: false`, `browserRuntimeImported: false`, `systemApisCalled: false`).
- **Not included yet:** direct MissionEngine API calls, MissionTape storage writes, BrowserRuntime imports, or OS-level action execution.

## Mission Runtime Registry / Dispatcher

- `ComputerUseMissionRuntimeRegistry` and `ComputerUseMissionRuntimeDispatcher` provide a safe adapter surface that future MissionEngine wiring can call.
- The registry includes a default `computer_use` handler and only routes those steps into the composed runtime (`createComputerUseRuntime().runComputerUseStep(step)`).
- Unsupported mission step kinds are rejected safely with normalized scaffold metadata.
- This PR does not import or call real MissionEngine APIs, BrowserRuntime APIs, Playwright, robotjs, or OS/system action APIs.

## Mission Integration Adapter

- `ComputerUseMissionIntegrationAdapter` is the safe boundary that future MissionEngine/task/orchestrator wiring should call when routing mission-like steps into computer-use runtime dispatch.
- This adapter only routes `kind: "computer_use"` steps and requires explicit opt-in via `featureFlags.computerUseEnabled` or `featureFlags.enableComputerUseDispatch`.
- Non-`computer_use` kinds, malformed steps, and non-opted-in requests are rejected safely with scaffold metadata.
- `createComputerUseMissionIntegrationAdapter()` composes the mission runtime dispatcher with the integration adapter and exposes a stable integration surface (`dispatch`, `canHandle`, `reset`).
- This phase remains scaffold-only and does **not** execute real browser/OS/system actions.
- This phase does **not** import real MissionEngine APIs directly; it integrates only against local runtime dispatch scaffolds.

## Mission Tape Event Bridge

- `ComputerUseRuntimeEventBridge` and `ComputerUseInMemoryMissionTapeSink` provide a scaffold persistence boundary for computer-use mission integration/runtime events.
- By default, events are recorded into an in-memory sink only, with metadata explicitly preserving scaffold guarantees (`tapeSinkKind: "scaffold"`, `eventBridgeKind: "scaffold"`, `storageWritesEnabled: false`, `missionTapeImported: false`, `systemApisCalled: false`).
- This layer does **not** import or write to real MissionTape storage yet.
- Future MissionTape integration should inject/replace the sink with a stable local adapter surface.
- Sensitive text should remain redacted by default in event payload handling.
- Guard decisions are now recorded as mission-tape runtime events before any real browser/direct-host execution path:
  - Generic: `computer_use_guard_decision`
  - Status-specific: `computer_use_guard_allowed`, `computer_use_guard_denied`, `computer_use_guard_needs_confirmation`
- Confirmation-required guard outcomes are auditable through mission tape event streams.
- Missing mission context falls back to `missionId: "unknown"` for compatibility/safety.
- Guard-decision recording remains non-fatal; runtime execution flow does not crash when recording fails.
- Direct-host remains forbidden and system APIs remain disabled in guard decision event metadata.


## BrowserRuntime Adapter Boundary

- `ComputerUseBrowserRuntimeAdapter` defines a feature-flag-gated adapter boundary for future BrowserRuntime/Ghost Browser/sandbox browser integrations.
- The scaffold adapter requires explicit opt-in (`browserRuntimeEnabled` or `enableBrowserRuntimeBridge`) before it can handle or execute browser-runtime requests.
- The adapter does **not** import real BrowserRuntime and does **not** call Playwright in this phase.
- The adapter returns simulated scaffold-only delegation results and keeps side-effect metadata explicit (`browserRuntimeImported: false`, `playwrightCalled: false`, `browserApisCalled: false`, `systemApisCalled: false`).
- Future PRs can replace or inject a real BrowserRuntime-backed adapter implementation behind the same contract.

## BrowserRuntime Adapter Event Recording

- BrowserRuntime adapter attempts are now observable through `ComputerUseRuntimeEventBridge` using browser adapter event types (`started`, `completed`, `rejected`, `failed`).
- Browser adapter requests can carry optional mission context (`missionId`, `stepId`, `traceId`, `source`) via request context metadata.
- Runtime event bridge uses request mission context to group adapter records by `missionId` when present.
- Missing mission context still falls back to `missionId: "unknown"` for compatibility.
- `createComputerUseBrowserRuntimeAdapter()` now exposes default in-memory `tapeSink`, `eventBridge`, and `getTapeSnapshot()` accessors unless recording is explicitly disabled.
- Recording remains scaffold-only and in-memory by default; no storage writes are performed.
- No real BrowserRuntime imports, Playwright calls, browser API calls, or system/OS API calls are performed in this phase.
- Future real BrowserRuntime-backed adapter implementations should preserve the same event contract so observability stays stable across scaffold and production integrations.


## Sandbox Browser Adapter (feature-flagged scaffold)

- `ComputerUseSandboxBrowserAdapter` adds a dedicated `sandbox_browser` adapter path that maps browser adapter requests into a BrowserRuntime-shaped target request/result while staying fully simulated.
- Explicit opt-in is required via `sandboxBrowserAdapterEnabled` or `enableSandboxBrowserAdapter`.
- Default behavior remains safe scaffold mode: no BrowserRuntime runtime import, no Playwright/browser/system calls, and no direct-host allowance.
- Metadata remains explicit for safety/conformance (`adapterKind: "sandbox_browser_scaffold"`, `realBrowserExecutionEnabled: false`, `directHostAllowed: false`, `requiresExplicitOptIn: true`).
- Event recording contract is preserved (`started`, `completed`, `rejected`, `failed`) and mission context is forwarded when available.

## BrowserRuntime Conformance Matrix (sandbox bridge hardening)

- `BrowserRuntimeConformance.ts` now defines explicit computer-use action conformance for BrowserRuntime-shaped mapping.
- Mapping is explicit (`click -> click`, `type_text -> type`, `observe -> extract`) and does **not** fallback unknown actions to `click`.
- `wait` and `scroll` are explicit scaffold no-op mappings; `hotkey` is explicitly rejected in this phase.
- `ComputerUseSandboxBrowserAdapter` now validates through the conformance matrix before emitting simulated BrowserRuntime-shaped metadata.
- Real browser execution remains disabled (`realBrowserExecutionEnabled: false`) and direct-host remains disallowed (`directHostAllowed: false`).
- No Playwright/browser/system APIs are called in this phase.
- Next step options remain: Real MissionTape sink injection or BrowserRuntime router bridge integration based on risk/stability preference.


### MissionTape external sink adapter
- Computer-use runtime event recording now supports an injected MissionTape-compatible external sink boundary via `ComputerUseMissionTapeSinkAdapter`.
- In-memory sink remains the default when no external sink is injected and explicitly enabled.
- External sink forwarding requires explicit `enableExternalMissionTapeSink: true` opt-in.
- This phase does not perform real filesystem/database/localStorage writes by default.
- A future PR can wire the stable LucaOS MissionTape interface into this adapter boundary once contract stability is confirmed.
