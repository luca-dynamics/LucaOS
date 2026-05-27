# Runtime Targeted Validation Checklist

Use this checklist to validate runtime scaffolds without enabling real provider or browser execution.

## Voice Runtime Tests

- [ ] Run voice runtime suite:
  ```bash
  npm test -- --run src/services/voice
  ```
- [ ] Run provider readiness focus test:
  ```bash
  npm test -- --run src/services/voice/VoiceProviderReadiness.test.ts
  ```

## Computer-use Runtime Tests

- [ ] Run computer-use suite:
  ```bash
  npm test -- --run src/services/computerUse
  ```
- [ ] Run BrowserRuntimeRouter invocation guard test:
  ```bash
  npm test -- --run src/services/computerUse/BrowserRuntimeRouterInvocationGuard.test.ts
  ```
- [ ] Run BrowserRuntimeRouter guarded adapter test:
  ```bash
  npm test -- --run src/services/computerUse/BrowserRuntimeRouterGuardedAdapter.test.ts
  ```

## Runtime-to-UI Bridge Tests

- [ ] Run Voice Mode UI bridge test:
  ```bash
  npm test -- --run src/services/voice/VoiceModeUiBridge.test.ts
  ```
- [ ] Run computer-use confirmation UI bridge test:
  ```bash
  npm test -- --run src/services/computerUse/ComputerUseConfirmationUiBridge.test.ts
  ```

## Safety Metadata Checks

- [ ] Confirm scaffold metadata remains explicit in results/snapshots (for example `systemApisCalled: false`, `directHostAllowed: false`, `requiresExplicitOptIn: true` where applicable).
- [ ] Confirm guard/confirmation pathways still emit auditable status (`allowed` / `denied` / `needs_confirmation`).

## No-Real-Execution Checks

- [ ] Confirm no real STT/TTS provider APIs are called.
- [ ] Confirm no microphone/audio hardware APIs are invoked.
- [ ] Confirm no Playwright/browser process execution occurs.
- [ ] Confirm no direct-host computer-use execution path is enabled.
- [ ] Confirm no persistent storage sink writes are enabled by default.

## Future Real Provider Checks (when explicitly approved)

- [ ] Add feature-flag-gated tests for one provider lane at a time.
- [ ] Validate provider readiness gate blocks execution when disabled.
- [ ] Validate redaction/audit metadata remains intact with provider adapter changes.

## Future BrowserRuntime Invocation Checks (when explicitly approved)

- [ ] Add sandbox-only invocation tests first.
- [ ] Confirm guard policy and confirmation requirements remain enforced pre-invocation.
- [ ] Validate runtime event bridge captures start/completion/rejection/failure for browser lanes.
- [ ] Confirm direct-host remains disabled unless explicitly and separately approved.
