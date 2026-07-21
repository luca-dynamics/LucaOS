# Computer-use runtime

Planning, guard, mission, and browser execution for Luca computer-use.

## Preferred real path (product)

```ts
import { computerUseStackService } from "./computerUseStackService";
// or: createRealSandboxComputerUseStack / resolveComputerUseStackFromSettings

// Settings → Autonomy → Computer-use sandbox → Real sandbox browser
const stack = await computerUseStackService.getStack();
await stack.pipeline.run({ /* guardApprovalProvided when needed */ });
```

Real body: `src/services/browserRuntime` (`SandboxPlaywrightBrowserRuntimeAdapter`, drivers, stack factory).

## Canonical feature flags

See `computerUseFeatureFlags.ts`. Prefer:

| Canonical | Deprecated alias |
|-----------|------------------|
| `sandboxBrowserAdapterEnabled` | `enableSandboxBrowserAdapter` |
| `browserRuntimeRouterBridgeEnabled` | `enableBrowserRuntimeRouterBridge` |
| `LucaSettings.computerUse.realSandboxEnabled` | (product master switch) |

Aliases still work; new code should use canonical names only.

## Removed scaffold leftovers (hard-deleted)

After verifying zero product/runtime callers outside their own tests:

- `ComputerUseBrowserRuntimeBridge` (+ tests)
- `ComputerUseBrowserRuntimeAdapterScaffold` / `createComputerUseBrowserRuntimeAdapter` (+ tests)
- `ComputerUseSandboxBrowserProvider` (+ tests)
- `createBrowserRuntimeContractProbe` / `BrowserRuntimeContract` (+ tests)

Use `BrowserRuntimeRouterBridge`, `ComputerUseSandboxBrowserAdapter`, and `createRealSandboxComputerUseStack` instead.

Safety spine (keep): dry-run, invocation guard, guarded adapter, RealInvocationShell, MissionTape bridges.

## Scope (planning layer)

- Define shared types for cursor, region, focused element, screenshot, user-pointed target grounding, and action planning.
- Build immutable-ish context snapshots through `ComputerUseFocusContextBuilder`.
- Build planning-only action candidates through `ComputerUseActionPlanner`.
- Encode safety defaults and metadata only.
- Default pipeline adapter simulates unless `realSandboxExecutionEnabled` + shell/router are injected (or settings enable real stack).

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


## Browser-runtime mapping (canonical)

- `BrowserRuntimeRouterBridge` maps computer-use actions into BrowserRuntimeRouter request shapes.
- `ComputerUseSandboxBrowserAdapter` validates sandbox-lane actions and optional router-bridge metadata.
- Real browser execution is only via `createRealSandboxComputerUseStack` / `computerUseStackService` (settings-gated).

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


## BrowserRuntime adapter event recording

- Browser adapter attempts are observable through `ComputerUseRuntimeEventBridge` (`started`, `completed`, `rejected`, `failed`).
- Requests can carry mission context (`missionId`, `stepId`, `traceId`, `source`).
- `createComputerUseSandboxBrowserAdapter()` exposes tape/event helpers; recording is in-memory by default.
- Real execution uses the browserRuntime stack; this adapter’s mapping path stays non-executing unless wired through the real invocation shell.

## Sandbox browser adapter

- `ComputerUseSandboxBrowserAdapter` maps `sandbox_browser` actions with optional router-bridge metadata.
- Opt-in via `sandboxBrowserAdapterEnabled` (alias `enableSandboxBrowserAdapter`).
- Mapping path does not call Playwright by itself; real work goes through the real stack factory.

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

## Guard Confirmation Bridge scaffold

- `ComputerUseGuardConfirmationBridge` now provides an in-memory confirmation-token bridge for `needs_confirmation` guard outcomes.
- The bridge creates confirmation requests (with mission/step/action/risk/reason context), tracks status (`pending`/`approved`/`rejected`/`expired`), and exposes explicit approve/reject helpers.
- Optional required-phrase enforcement is supported for explicit operator confirmation UX contracts.
- Confirmation requests and approval tokens are scaffold-only and stored in memory only (no filesystem/database/localStorage writes).
- Safety metadata remains explicit (`bridgeKind: "guard_confirmation_scaffold"`, `systemApisCalled: false`, `directHostAllowed: false`, `storageWritesEnabled: false`, `requiresExplicitOptIn: true`).
- Runtime event recording can carry `confirmationId` when available, while real browser/direct-host execution remains disabled in this phase.

## BrowserRuntime router bridge scaffold contract

- `BrowserRuntimeRouterBridge.ts` adds a side-effect-free contract mapper from computer-use sandbox browser requests into BrowserRuntimeRouter-compatible request shape.
- This bridge is scaffold-only and does **not** instantiate/import `BrowserRuntimeRouter` for execution, does **not** call Playwright/browser/system APIs, and does **not** enable direct-host execution.
- Contract helpers now include:
  - `mapComputerUseActionToBrowserRuntimeRoute()`
  - `createBrowserRuntimeRouterBridgeRequest()`
  - `validateBrowserRuntimeRouterBridgeRequest()`
- Contract tests cover action mapping/disposition behavior, unsupported-action rejection, mission-context preservation, and explicit no-real-execution metadata assertions.
- Real BrowserRuntime router execution remains disabled in this phase; next step can introduce a feature-flagged adapter that consumes this tested bridge request contract.


## Sandbox Browser Adapter router bridge integration (feature-flagged)

- `ComputerUseSandboxBrowserAdapter` now supports an additional explicit opt-in flag (`browserRuntimeRouterBridgeEnabled` or alias `enableBrowserRuntimeRouterBridge`).
- When both sandbox adapter and router bridge flags are enabled, the adapter generates a validated `BrowserRuntimeRouterBridgeRequest` and exposes it in adapter metadata/snapshots only.
- This integration does **not** instantiate or call `BrowserRuntimeRouter`, does **not** execute browser actions, and does **not** call Playwright/browser/system APIs.
- If bridge request validation fails, execution fails safely while preserving existing runtime event recording behavior.
- Real BrowserRuntime execution remains disabled (`realBrowserExecutionEnabled: false`); a future phase can gate real router invocation behind additional guard/tape validation.
- `BrowserRuntimeRouterDryRunAdapter` now provides a dedicated dry-run invocation boundary for BrowserRuntime router bridge requests.
- Dry-run adapter behavior:
  - Validates `BrowserRuntimeRouterBridgeRequest` via `validateBrowserRuntimeRouterBridgeRequest()`.
  - Returns a simulated invocation result containing `ok`, `requestId`, `missionId`, `action`, `target`, `reason`, and explicit dry-run metadata.
  - Tracks invocation counters and latest snapshot state for observability and readiness checks.
  - Never imports/instantiates/calls real `BrowserRuntimeRouter` and never calls Playwright/browser/system APIs.
- Optional dry-run event callbacks can record started/completed/failed events; callback failures are non-fatal.
- Real browser execution remains disabled in this phase; next step can feature-flag real router invocation once dry-run event/guard stability is confirmed.

## BrowserRuntime real-router invocation guard design

- Added a dedicated design contract in `docs/browser-runtime-router-invocation-guard.md` for future feature-flagged real BrowserRuntimeRouter invocation.
- Current merged lanes include router bridge contract mapping and dry-run adapter simulation only.
- Real router invocation remains disabled in this phase; no BrowserRuntimeRouter runtime import/instantiation/call, no Playwright/browser/system calls, and no direct-host lane enablement are introduced.
- Readiness for any future real invocation requires all gates to pass (flags, guard decision, dry-run evidence, confirmation, route validation, mission tape/event availability, and rollback path).
- Invocation guard contract types are now available in `types.ts` to standardize readiness reporting:
  - `ComputerUseBrowserRuntimeRouterInvocationReadinessStatus`
  - `ComputerUseBrowserRuntimeRouterInvocationGate`
  - `ComputerUseBrowserRuntimeRouterInvocationReadinessResult`

## BrowserRuntime invocation readiness helper

- `BrowserRuntimeRouterInvocationGuard` now provides a side-effect-free readiness evaluator for future real BrowserRuntime router invocation.
- `evaluateBrowserRuntimeRouterInvocationReadiness(input)` evaluates gates across feature flags, bridge request, dry-run result, guard decision, confirmation status, lane, and risk.
- `createBrowserRuntimeRouterInvocationReadinessInputFromSandboxResult(result, options)` can build invocation-readiness input from sandbox adapter metadata only.
- This helper does not import/instantiate/call `BrowserRuntimeRouter` and does not execute browser/system/direct-host actions.
- Real router invocation remains disabled in this phase and requires a future explicit opt-in execution PR.

- Added **BrowserRuntimeRouterGuardedAdapter shell** for invocation-readiness evaluation only. It can return `blocked`, `dry_run_required`, `needs_confirmation`, or `ready_but_not_invoked`, and never executes BrowserRuntimeRouter in this phase.
- Real BrowserRuntimeRouter invocation remains disabled; a future PR may add explicit opt-in execution behind all readiness gates and feature flags.

## Confirmation UI bridge scaffold

`ComputerUseConfirmationUiBridge` exposes subscription-friendly state for pending confirmations and in-memory approve/reject results. It does not execute browser/runtime actions and keeps direct-host/system/storage flags disabled.

## Runtime readiness and validation docs

- [Luca runtime readiness report](../../../docs/luca-runtime-readiness-report.md)
- [Runtime validation environment guide](../../../docs/runtime-validation-environment.md)
- [Runtime targeted validation checklist](../../../docs/runtime-targeted-validation-checklist.md)
- [Luca runtime foundation map](../../../docs/luca-runtime-foundation-map.md)
- [Future real integration safety checklist](../../../docs/future-real-integration-safety-checklist.md)
- [Runtime UI bridge map](../../../docs/runtime-ui-bridge-map.md)
