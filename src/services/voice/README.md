# LucaOS Voice Runtime Contracts (Scaffold)

The `src/services/voice` module is the first contract layer for LucaOS Voice Mode.

## Purpose

- Establish stable runtime interfaces for voice session/state handling.
- Keep Voice Mode a first-class operation mode (not just a speech-to-text wrapper).
- Align Text Mode and Voice Mode with a shared future LucaCommandRuntime command path.

## What this scaffold includes

- Core voice runtime/event/session types.
- STT/TTS backend interfaces and provider router contract.
- In-memory backend registry for provider registration/selection.
- Voice runtime scaffold with session lifecycle, shared command intake, and confirmation flow.
- Voice session tape bridge with in-memory recording for runtime events and command flow.
- Factory helper for safe runtime wiring.

## What this scaffold intentionally does not include

- Real microphone/audio capture APIs.
- Real STT/TTS provider integrations.
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

1. Voice Mode onboarding bridge
2. Voice HUD runtime bridge
3. STT/TTS provider router
4. Streaming STT/TTS contracts
5. Voice-to-computer-use bridge

## Voice Mode onboarding bridge (scaffold)

- `VoiceOnboardingBridge` and `createVoiceOnboardingBridge` provide scaffold-only onboarding flow for transcript/text command events.
- The bridge mirrors Text Mode onboarding intent parsing (name, theme, opacity, model mode, local scan request flag, preferences) without UI runtime integration.
- No microphone APIs, no real STT/TTS providers, no model manager calls, and no local model scans are executed.
- Future PRs can wire this bridge into onboarding UI state and model manager orchestration once those integrations are approved.
