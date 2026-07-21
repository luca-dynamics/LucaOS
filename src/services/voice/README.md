# LucaOS Voice

## Production spine

```
UI (VoiceHud / OverlayManager)
  → voiceSessionOrchestrator
      → liveService | hybridVoiceService | BrowserHfRealtimeVoiceSession
      → CapabilityRouter + voice/providers/* (real STT/TTS)
  → CanonicalVoiceSessionBus / realtimeVoiceUiBridge (HUD state)
```

Also used for routing policy:

- `VoiceRuntimeProviderPolicy`
- `VoiceRouteAuthorityGate`
- `VoiceRouteShadowEvaluator` (advisory only)
- `VoiceProviderReadiness`

## Realtime local / OpenAI-compatible WS

`HfRealtimeVoiceRuntime` + `BrowserHfRealtimeVoiceSession` implement a real WebSocket
transport for speech-to-speech servers. Enable under **Settings → Voice → Advanced Voice Routing**.

```ts
import { createHfRealtimeVoiceRuntime } from "./createHfRealtimeVoiceRuntime";
import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";

const { controller } = createRealtimeVoiceSessionController();
const runtime = createHfRealtimeVoiceRuntime({
  enabled: true,
  url: "ws://127.0.0.1:8765/v1/realtime",
  controller,
  audioSink,
});
await runtime.connect();
```

## Removed dual-stack scaffolds

After a reference audit (zero product callers outside `voice/` self-tests), these were deleted:

- `createLucaVoiceRuntime` / `VoiceRuntime` / `VoiceStreamingRuntime`
- `VoiceBackendRegistry` / `VoiceProviderRouter` / stub Local·Prime·BYOK adapters
- OpenAI-compatible placeholder API + mock transport + real-provider shell
- Onboarding / computer-use confirmation UI bridges (scaffold-only)
- `createLucaRuntimeUiBridgeSnapshot`

Production STT/TTS remains on `CapabilityRouter` + `providers/*`, not the removed registry.

## HUD bridges (kept)

- `realtimeVoiceUiBridge` + `useRealtimeVoiceHudState` (OverlayManager)
- `VoiceHudRuntimeBridge` / `VoiceHudSubscriptionBridge` / `VoiceModeUiBridge`
- `LiveVoiceRuntimeBridge` (diagnostics / live session mirror)
