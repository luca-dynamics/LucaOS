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
