# Absorb Note: ElevenLabs Speech Engine for LucaOS Voice Runtime

## Purpose

Add ElevenLabs Speech Engine to the LucaOS absorb list as a managed live voice-conversation provider pattern.

This should be absorbed as a cloud voice body inside LucaOS, not as a replacement for the existing LucaOS voice system.

## Current LucaOS voice foundation

LucaOS already has a multi-engine voice foundation:

- `src/services/hybridVoiceService.ts` for the Mic to VAD to STT to Brain to TTS pipeline.
- `src/services/CapabilityRouter.ts` for choosing STT, TTS, and reasoning providers.
- `src/services/voiceSessionRouter.ts` with `CLOUD_BIDI`, `LOCAL_PIPELINE`, and `HYBRID_PIPELINE` routes.
- STT providers: Deepgram, OpenAI Whisper, Gemini, and Luca local/Cortex STT.
- TTS providers: OpenAI, Deepgram, Cortex local TTS, Gemini/Google, and Google TTS.
- Voice features: VAD, RNNoise denoising, wake-word gating, barge-in, streaming response playback, and voice clone storage.

So LucaOS should not rebuild voice from zero. It should formalize the voice runtime abstraction and add ElevenLabs Speech Engine as one selectable provider.

## Absorb target

Create a Luca-native Voice Runtime Router layer.

```text
VoiceHUD / Voice Onboarding / Hologram Face / Widgets
↓
Voice Runtime Router
↓
Voice Session Providers
- Local pipeline provider
- Hybrid provider
- Gemini or cloud bidi provider
- ElevenLabs Speech Engine provider
- BYOK or custom provider
↓
Cortex / Mission Engine / Luca Guard / Memory / LucaLink
```

## Proposed files

```text
src/services/voiceRuntime/types.ts
src/services/voiceRuntime/VoiceRuntimeRouter.ts
src/services/voiceRuntime/providers/ElevenLabsSpeechEngineAdapter.ts
src/services/voiceRuntime/providers/HybridVoiceRuntimeAdapter.ts
src/services/voiceRuntime/providers/LocalVoiceRuntimeAdapter.ts
src/services/voiceRuntime/README.md
```

## Proposed provider interface

```ts
export interface VoiceRuntimeSessionProvider {
  readonly id: string;
  readonly kind: 'local' | 'hybrid' | 'cloud_bidi' | 'elevenlabs_speech_engine' | 'custom';
  startSession(options: VoiceRuntimeSessionOptions): Promise<VoiceRuntimeSession>;
  stopSession(sessionId: string): Promise<void>;
  sendText?(sessionId: string, text: string): Promise<void>;
  interrupt?(sessionId: string): Promise<void>;
}
```

## ElevenLabs adapter responsibilities

The ElevenLabs adapter should:

- start and stop a live speech session,
- connect browser voice session events to LucaOS runtime events,
- pass user transcripts into Cortex or Mission Engine,
- stream assistant text back to the speech provider for voice output,
- support interruption and barge-in when available,
- expose lifecycle events to VoiceHUD and Hologram Face,
- preserve voice-session metadata for Mission Tape,
- route action-triggering voice commands through Luca Guard.

## Routing rules

Voice Runtime Router should choose engines based on:

- selected voice engine,
- privacy or offline mode,
- Luca Prime versus BYOK provisioning,
- latency target,
- device capability,
- live interruption and turn-taking needs,
- context: onboarding, chat, mission control, browser control, or LucaLink remote voice.

Recommended behavior:

```text
Privacy or offline selected → local pipeline
Premium cloud voice selected → ElevenLabs Speech Engine or cloud bidi
BYOK selected → user-provider adapter
Low capability device → cloud voice session
No network → local degraded voice
High-risk voice command → Mission Engine + Luca Guard before execution
```

## Safety boundaries

ElevenLabs Speech Engine should be treated as a voice transport/body only.

Authority remains:

```text
Cortex → Mission Engine → Luca Guard → Tool/Skill/Computer-use/Browser-use execution
```

Voice commands that trigger real actions must become mission steps and pass Luca Guard checks. Voice provider selection must not bypass policy, memory controls, or user approval.

## Documentation updates to make later

```text
docs/voice/VOICE_RUNTIME_ROUTER_SPEC.md
docs/voice/ELEVENLABS_SPEECH_ENGINE_ADAPTER_SPEC.md
docs/interface/VOICEHUD_RUNTIME_SPEC.md
docs/runtime/MODEL_ROUTING_SPEC.md
docs/security/GUARD_SECURITY_SPEC.md
```

## Implementation staging

1. Add voice runtime docs/spec only.
2. Add `voiceRuntime` interfaces and router scaffold.
3. Wrap existing `hybridVoiceService` as `HybridVoiceRuntimeAdapter`.
4. Add `ElevenLabsSpeechEngineAdapter` scaffold without deep production wiring.
5. Add settings/provider selection UI later.
6. Add Mission Engine and Guard integration for voice-command actions.
7. Add Mission Tape voice-session events.

## Non-goals

- Do not replace `hybridVoiceService` immediately.
- Do not remove existing STT/TTS providers.
- Do not force ElevenLabs as default.
- Do not bypass local/offline voice.
- Do not allow voice provider sessions to execute host/browser actions without Mission Engine and Luca Guard.
