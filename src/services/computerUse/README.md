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

- Records computer-use lifecycle events into an in-memory mission-scoped list only.
- Does not import or write to MissionTape service/storage yet (`storageWritesEnabled: false`).
- Every event carries `missionId`, `timestamp`, `eventType`, payload, and scaffold metadata.
- `type_text` payloads are redacted by default and can only be unredacted with `redactSensitiveText: false`.
