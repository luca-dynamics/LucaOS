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
- Factory helper for safe runtime wiring.

## What this scaffold intentionally does not include

- Real microphone/audio capture APIs.
- Real STT/TTS provider integrations.
- Heavy model dependencies.
- Direct system API calls.
- Computer-use execution.

## Provider roadmap support

This scaffold prepares future local/cloud/BYOK provider routing by defining stable provider-kind-aware contracts and selection points.

## Future work

1. Voice session tape bridge
2. Voice Mode onboarding bridge
3. Voice HUD runtime bridge
4. STT/TTS provider router
5. Streaming STT/TTS contracts
6. Voice-to-computer-use bridge
