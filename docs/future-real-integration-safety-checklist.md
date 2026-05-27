# Future Real Integration Safety Checklist

Use this checklist before enabling any real execution path in LucaOS runtime.

## Before real voice provider integration

- [ ] Feature-flag gate exists and defaults to disabled.
- [ ] Provider readiness status is auditable in runtime snapshot/state.
- [ ] Failure mode is explicit and non-crashing when provider is unavailable.

## Before real microphone access

- [ ] Permission model is explicit and user-visible.
- [ ] Mic start/stop/timeout behavior is tested for abort/retry paths.
- [ ] No hidden background capture paths exist.

## Before real TTS/STT provider calls

- [ ] Network/API-key handling is scoped and redacted in logs/events.
- [ ] Retries/timeouts/circuit-breaker behavior is defined.
- [ ] Provider outages degrade safely without unsafe fallback execution.

## Before local model loading

- [ ] Model loading is explicit opt-in and bounded by resource constraints.
- [ ] Warmup/failure behavior is deterministic and observable.
- [ ] Model runtime does not bypass policy/guard confirmation boundaries.

## Before real BrowserRuntimeRouter invocation

- [ ] Invocation guard enforces explicit enablement and policy checks.
- [ ] Mission/step context is attached for every invocation attempt.
- [ ] Rejected/failed invocations are auditable through runtime event/tape paths.

## Before Playwright/browser execution

- [ ] Browser action mapping is validated against conformance matrix.
- [ ] Sandbox boundaries and allowed domains/targets are clearly constrained.
- [ ] Browser runtime failure and interruption handling is tested.

## Before direct-host execution

- [ ] Direct-host path is separately feature-flagged and disabled by default.
- [ ] High-risk actions require explicit confirmation and policy approval.
- [ ] Rollback/recovery strategy exists for partial or failed host actions.

## Before persistent storage sink enablement

- [ ] Data classification/redaction policy is enforced in write path.
- [ ] Retention/lifecycle policy is defined and tested.
- [ ] Storage adapter failures do not block safety-critical runtime behavior.
