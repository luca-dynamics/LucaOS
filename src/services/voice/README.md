# LucaOS Voice Runtime Contracts (Scaffold)

The `src/services/voice` module is the first contract layer for LucaOS Voice Mode.

## Purpose

- Establish stable runtime interfaces for voice session/state handling.
- Keep Voice Mode a first-class operation mode (not just a speech-to-text wrapper).
- Align Text Mode and Voice Mode with a shared future LucaCommandRuntime command path.

## What this scaffold includes

- Core voice runtime/event/session types.
- STT/TTS backend interfaces and provider router contract.
- `VoiceProviderRouter` scaffold and `createVoiceProviderRouter` factory for local/cloud/BYOK provider selection planning.
- In-memory backend registry for provider registration/selection.
- Voice runtime scaffold with session lifecycle, shared command intake, and confirmation flow.
- Voice streaming runtime scaffold (`VoiceStreamingRuntime` and `createVoiceStreamingRuntime`) for in-memory STT/TTS stream contract handling.
- Voice session tape bridge with in-memory recording for runtime events and command flow.
- Factory helper for safe runtime wiring.

## What this scaffold intentionally does not include

- Real microphone/audio capture APIs.
- Real STT/TTS provider integrations.
- Real streaming STT/TTS transport/provider integrations.
- Heavy model dependencies.
- Direct system API calls.
- Computer-use execution.
- Persistent storage writes (filesystem/database/localStorage).

## Provider roadmap support

This scaffold prepares future local/cloud/BYOK provider routing by defining stable provider-kind-aware contracts and selection points.

## Voice session tape bridge

- Tape recording is scaffold-only and in-memory via `VoiceInMemoryTapeSink`.
- The runtime bridge records session lifecycle, transcripts/text intake, command outcomes, confirmations, and output events.
- No real audio APIs, no STT/TTS provider calls, no heavy model loading, no system API calls, and no storage writes are performed.
- This prepares future voice memory/audit trail support and onboarding/HUD bridges without changing current safety boundaries.

## Future work

1. OpenAI-compatible audio API scaffold
2. Real streaming STT/TTS provider adapters behind feature flags
3. Real provider-specific adapters under local/cloud/BYOK
4. Voice-to-computer-use bridge hardening

## Voice streaming runtime scaffold

- `VoiceStreamingRuntime` and `createVoiceStreamingRuntime` are contract-only scaffold components for opening/pausing/completing/interruption/failure flow of STT/TTS streams.
- Streams, chunks, and metadata are maintained in-memory only; this is intentionally non-production transport behavior.
- No microphone APIs, no audio output APIs, no real STT/TTS provider calls, no WebSocket servers/connections, and no heavy model loading are performed.
- A future PR can add OpenAI-compatible audio API scaffolding or real provider adapters behind explicit feature flags while preserving current service contracts.

## Voice Mode onboarding bridge (scaffold)

- `VoiceOnboardingBridge` and `createVoiceOnboardingBridge` provide scaffold-only onboarding flow for transcript/text command events.
- The bridge mirrors Text Mode onboarding intent parsing (name, theme, opacity, model mode, local scan request flag, preferences) without UI runtime integration.
- No microphone APIs, no real STT/TTS providers, no model manager calls, and no local model scans are executed.
- Future PRs can wire this bridge into onboarding UI state and model manager orchestration once those integrations are approved.


## Voice-to-computer-use confirmation bridge (scaffold)

- `VoiceComputerUseConfirmationBridge` and `createVoiceComputerUseConfirmationBridge` map voice transcript/text confirmation phrases to pending computer-use guard confirmation tokens.
- The bridge only approves/rejects scaffold confirmation requests; it does **not** execute computer-use actions.
- No browser APIs, no direct-host/system actions, and no microphone/STT/TTS provider calls are performed.
- This contract is designed so a future Voice HUD can safely submit confirmation phrases for guarded computer-use workflows.


## Voice HUD runtime bridge (scaffold)

- `VoiceHudRuntimeBridge` and `createVoiceHudRuntimeBridge` provide a service-level HUD/Voice Center state-and-control contract for future UI wiring.
- This is scaffold-only state management and transition handling; no React/UI components are modified.
- No microphone APIs, no STT/TTS provider integrations, and no audio output providers are called.
- Future UI layers can subscribe to this bridge state and send controls without changing runtime safety boundaries.

## Voice provider router scaffold

- `VoiceProviderRouter` and `createVoiceProviderRouter` are scaffold-only routing helpers that choose candidate STT/TTS backends by capability and preference (`local`, `cloud`, `byok`, `auto`).
- This router only evaluates backend metadata and registry snapshots; it does not call provider APIs.
- No microphone/audio/system API calls, no real STT/TTS invocations, and no heavy model loading are performed.
- This prepares Luca Prime / Local / BYOK routing paths so future PRs can add real OpenAI-compatible audio and streaming contracts behind stable interfaces.

## OpenAI-compatible audio API scaffold

- `VoiceOpenAICompatibleAudioApi` and `createVoiceOpenAICompatibleAudioApi` provide LucaOS-native service-level contracts aligned to `/v1/audio/speech`, `/v1/audio/transcriptions`, and voices listing behavior.
- This scaffold does **not** start an HTTP server and does **not** expose network endpoints directly; it is an internal service contract layer only.
- The implementation returns placeholder speech/transcription payloads only and does not call real providers, audio output APIs, microphone APIs, STT/TTS APIs, or model runtimes.
- No heavy models are loaded, no system APIs are called, and no storage is written.
- The contract is inspired by OmniVoice-style compatibility patterns, but implemented as LucaOS-native scaffold-only types and service boundaries for future local LucaOS voice server compatibility.

## Voice provider adapter stubs (local / Luca Prime / BYOK)

- `VoiceLocalProviderAdapter`, `VoiceLucaPrimeProviderAdapter`, and `VoiceByokProviderAdapter` are scaffold-only adapter classes.
- They register scaffold STT/TTS backends in `VoiceBackendRegistry` for local, Luca Prime Cloud, and BYOK routing lanes.
- These adapters only produce metadata/snapshots and in-memory backend registration; they do **not** call microphone/audio/STT/TTS/provider APIs.
- No provider SDKs, no network calls, no API keys, no local model loading, and no system hardware inspection are performed.
- `createVoiceProviderAdapters` offers factory wiring (`registerAll`, `getSnapshots`, `reset`) so future PRs can replace stubs with real implementations behind explicit feature flags.

## Composed Luca Voice runtime scaffold

- `createLucaVoiceRuntime` composes `VoiceBackendRegistry`, provider adapter stubs, `VoiceProviderRouter`, `VoiceRuntime`, `VoiceStreamingRuntime`, `VoiceOpenAICompatibleAudioApi`, `VoiceRuntimeEventBridge`, and `VoiceInMemoryTapeSink` in one factory surface.
- By default, Local / Luca Prime Cloud / BYOK scaffold lanes are registered for STT/TTS and become immediately routable through provider preferences (`local`, `cloud`, `byok`, `auto`).
- Streaming runtime and OpenAI-compatible audio API both route through the shared provider router, so scaffold provider selection works consistently across text/transcript, streaming, and audio API paths.
- Snapshot/reset APIs are included for scaffold observability and testability. Metadata explicitly confirms no real microphone/audio/provider/system APIs are called and no heavy models are loaded.
- This remains scaffold-only: no network/provider calls, no real model loading, no microphone/audio runtime integration. Future PRs can replace the adapter stubs with real, feature-flagged provider implementations.


## Voice provider readiness interface (scaffold)

- `VoiceProviderReadiness` adds explicit feature-flag gate evaluation for Local, Luca Prime Cloud, and BYOK provider lanes.
- Readiness results are scaffold-only and in-memory; they do not call real providers, networks, microphones, audio APIs, or model loaders.
- `createLucaVoiceRuntime().getSnapshot()` now includes real-provider feature flags and readiness summaries so future real STT/TTS integrations can be enabled only through explicit opt-in gates.

## Runtime UI bridge scaffolds

Service-level UI bridge contracts are available for Voice Mode, Voice HUD subscriptions, and onboarding state. These bridges keep in-memory listener registries and expose snapshot/getState APIs for future UI subscribers. They do not import React/UI components and do not enable microphone, STT, TTS, provider, browser, or OS execution.

## Runtime readiness and validation docs

- [Luca runtime readiness report](../../../docs/luca-runtime-readiness-report.md)
- [Runtime validation environment guide](../../../docs/runtime-validation-environment.md)
- [Runtime targeted validation checklist](../../../docs/runtime-targeted-validation-checklist.md)
- [Luca runtime foundation map](../../../docs/luca-runtime-foundation-map.md)
- [Future real integration safety checklist](../../../docs/future-real-integration-safety-checklist.md)
- [Runtime UI bridge map](../../../docs/runtime-ui-bridge-map.md)

## OpenAI-compatible provider adapter (safe by default)

`VoiceOpenAICompatibleProviderAdapter` provides a real-provider-ready boundary for mapping LucaOS speech/transcription requests into OpenAI-compatible request shapes:

- `POST /v1/audio/speech`
- `POST /v1/audio/transcriptions`

Safety defaults:
- Network provider calls are disabled unless `enableNetworkProviderCalls` is explicitly enabled.
- No network calls occur unless a transport is explicitly injected.
- The adapter never calls global `fetch` directly.
- No microphone/audio output APIs, system APIs, or model loading are performed.

Testing & scaffolding:
- `VoiceMockProviderTransport` records requests in memory and returns configurable mock results.
- The mock transport supports deterministic tests and safe local scaffolding.

Future direction:
- Realtime provider execution and transport-specific integrations will build on this adapter boundary.

## Realtime Voice Session Controller

- `RealtimeVoiceSessionController` is a service-level, in-memory operational controller for Voice Mode turn-taking.
- It manages realtime session status transitions (`idle` → `listening` → `transcribing` → `thinking` → `speaking`) and supports interruption and recovery paths.
- It tracks partial and final transcript flow, current response lifecycle, counters, latency budget metadata, and deterministic snapshots for observability.
- It can optionally mirror transcript/response/error updates into HUD bridges and record tape-oriented events through `VoiceRuntimeEventBridge` without making those dependencies mandatory.
- Event recording and HUD synchronization are non-fatal best-effort hooks so controller state always remains primary and stable.
- This controller does not call microphone APIs, audio output APIs, real STT/TTS/provider/network APIs, system APIs, or model loaders.
- Future UI/runtime/provider integrations should use this controller as the central operational layer for realtime voice orchestration.

## Live voice runtime bridge

- `LiveVoiceRuntimeBridge` connects the new realtime runtime model with the existing `liveService`, `VoiceHud`, and diagnostics stack.
- Existing `liveService` remains the real voice session owner.
- `RealtimeVoiceSessionController`-compatible state is mirrored/normalized for future agent/runtime/UI integrations without creating a competing session owner.

## Voice runtime state precedence

- `VoiceRuntimeStatePrecedence` prevents split-brain status between `liveService`, HUD, diagnostics, and realtime runtime.
- `liveService` remains the source of truth for real sessions.
- realtime runtime mirrors and enriches state for future agent/runtime operations without replacing live ownership.

## Voice runtime provider policy mapping

- `VoiceRuntimeProviderPolicy` maps `SettingsVoiceTab` presets (`performance`, `speedster`, `balanced`, `privacy`) into runtime provider-policy metadata.
- Presets remain existing UX controls and keep current behavior in settings/live flows.
- The provider policy is advisory-only metadata for routing/readiness/diagnostics and does not itself enable provider/network/audio execution.
- `liveService` now records provider policy on live route metadata (`providerPolicy`, `providerPolicyAdvisoryOnly`, `providerPolicyAppliedToRouting`) strictly for observability.
- Diagnostics snapshots surface the provider policy route metadata while preserving existing provider policy fields from settings mapping.
- Future work can allow `liveService` route selection to consult `VoiceProviderRouter` / readiness gates behind feature flags when real provider gates are intentionally opened.

## Voice Route Shadow Evaluator
- `VoiceRouteShadowEvaluator` compares the existing `liveService` route with provider-policy/router shadow suggestions.
- Shadow results are advisory-only (`shadowOnly: true`) and never change live route/provider/model selection.
- A future PR can promote runtime router authority behind a feature flag once shadow telemetry is trusted.
