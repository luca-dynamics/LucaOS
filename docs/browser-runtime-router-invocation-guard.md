# BrowserRuntime real-router invocation guard design

## Purpose

Define the explicit safety contract for any **future** feature-flagged real `BrowserRuntimeRouter` invocation path used by computer-use runtime. This contract exists to prevent accidental execution unlock while preserving a deterministic readiness evaluation surface.

This document is design/contract only and does **not** enable real router execution.

## Current safe state

Current merged implementation provides:

- BrowserRuntime router bridge request mapping + validation contract.
- Sandbox adapter router bridge metadata wiring.
- Router dry-run adapter with simulated invocation results.

Execution remains intentionally disabled:

- `BrowserRuntimeRouter` real execution is not enabled.
- No Playwright/browser/system API calls occur in this lane.
- Direct-host lane remains prohibited.

## Why real router invocation is not enabled yet

Real invocation stays disabled until these concerns are fully addressed:

- Guard outcome must be unambiguous and auditable before invoke.
- Confirmation-required actions must have explicit approval flow.
- Dry-run conformance evidence must exist for target route/action.
- Mission tape/event continuity must be stable for pre/post-invoke records.
- Rollback/failure path must be deterministic and test-covered.
- No direct-host bypass should be possible through routing metadata.

## Required gates before real invocation

All of the following gates are required and must pass together:

1. `sandboxBrowserAdapterEnabled === true`
2. `browserRuntimeRouterBridgeEnabled === true`
3. `browserRuntimeRouterDryRunEnabled === true` **or** dry-run pass recorded
4. `realBrowserRuntimeRouterEnabled === true`
5. guard decision status is `allowed`
6. no direct-host lane
7. no critical risk action
8. confirmation approved for risky actions
9. mission tape/event bridge available
10. BrowserRuntimeRouter route validation passed
11. rollback/failure result path exists

If any gate fails, real invocation must remain blocked.

## Feature flags

Required feature-flag posture for future real invocation PR:

- `sandboxBrowserAdapterEnabled`: required baseline lane.
- `browserRuntimeRouterBridgeEnabled`: required for validated router-shaped request.
- `browserRuntimeRouterDryRunEnabled`: required unless dry-run pass evidence is supplied from prior validated run.
- `realBrowserRuntimeRouterEnabled`: final explicit opt-in gate; default must remain `false`.

## Guard requirements

- Guard decision status must be exactly `allowed` for real invoke.
- `needs_confirmation` must not execute until explicit confirmation approval is attached.
- `denied` must always block.
- Critical-risk actions must remain blocked even if feature flags are enabled.

## Tape/event requirements

Before real invocation enablement:

- Mission tape/event bridge must be available for guard + adapter lifecycle events.
- Event emission failure handling must be non-fatal but observable.
- Mission-scoped context (`missionId`, `stepId`, optional trace/source) should remain preserved.

## Confirmation requirements

- Risky write-like actions require explicit confirmation approval.
- Confirmation status must be auditable and attached to invoke readiness inputs.
- Missing/expired/rejected confirmation blocks readiness.

## Sandbox lane requirements

- Real router invocation must be allowed only for sandbox browser lane.
- Non-sandbox lanes, especially direct-host, are blocked.
- Lane validation failure must produce explicit blocked readiness output.

## Direct-host prohibition

Direct-host execution is out of scope for this phase and must remain forbidden:

- `directHostAllowed` remains `false`.
- No direct-host fallback may be used when router gates fail.

## Rollback behavior

Real invocation rollout must define deterministic failure handling:

- Safe failure result contract when invoke fails or returns invalid response.
- Recovery path back to scaffold/dry-run-safe behavior.
- No silent fallback into host-control or unguarded action execution.

## Test checklist

Future real-invocation PR should include at minimum:

- blocked when `realBrowserRuntimeRouterEnabled` is false
- `dry_run_required` when dry-run proof is missing
- `needs_confirmation` when guard requires confirmation
- blocked on direct-host lane or critical risk action
- ready only when all gates pass
- metadata asserts no direct-host allowance regressions
- mission tape/event availability gating behavior
- rollback/failure result-path contract assertions

## Future PR sequence

1. Add invocation-guard readiness evaluator (contract-only, no execution).
2. Integrate evaluator into sandbox browser adapter path (still no real invoke).
3. Add event/tape + confirmation readiness enforcement at adapter boundary.
4. Add feature-flagged real invocation implementation behind guard evaluator.
5. Add rollback/failure integration tests + staged rollout plan.
6. Keep default state execution-disabled until stability sign-off.

## Implementation update (May 27, 2026)

- Added `BrowserRuntimeRouterInvocationGuard` helper in `src/services/computerUse/BrowserRuntimeRouterInvocationGuard.ts`.
- `evaluateBrowserRuntimeRouterInvocationReadiness(input)` now performs side-effect-free gate evaluation and returns `blocked`, `dry_run_required`, `needs_confirmation`, or `ready`.
- Added `createBrowserRuntimeRouterInvocationReadinessInputFromSandboxResult()` for metadata-only input shaping from sandbox adapter output.
- Guard metadata is fixed to execution-disabled safety posture (`realBrowserExecutionEnabled: false`, `browserRuntimeRouterCalled: false`, `playwrightCalled: false`, `browserApisCalled: false`, `systemApisCalled: false`, `directHostAllowed: false`).
- Real router invocation remains disabled; this helper does not import, instantiate, or call `BrowserRuntimeRouter`.
