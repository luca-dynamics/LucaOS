# LucaOS Architecture Overview

**Status:** v0.6.0 Complete Baseline  
**Package Count:** 10 Monorepo Packages + 1 Executable App  
**Philosophy Specification:** [`docs/specs/embodied-intelligence-philosophy.md`](file:///C:/Users/HP/Documents/LucaOS/docs/specs/embodied-intelligence-philosophy.md)

---

## 🌌 9-Layer Cognitive Intelligence Pipeline

```text
                  1. World & Sensors (Microphone, Camera, System Events)
                                   │
                                   ▼
                  2. Perception (@luca/audio — VAD, Resampling, STT)
                                   │
                                   ▼
                  3. Attention Manager (Saliency & Priority Filtering)
                                   │
                                   ▼
                  4. Working Memory (Short-Term Turn Context & History)
                                   │
                                   ▼
                  5. Reasoning Engine (@luca/conversation-engine — ModelRouter, ConversationSession)
                                   │
                                   ▼
                  6. Intent Planner (@luca/conversation-engine — ToolSession, ActionGraph)
                                   │
                                   ▼
                  7. Presence Engine (@luca/presence-engine — 8 Cognitive Channels)
                                   │
                                   ▼
                  8. ExpressionState (Intermediate DTO: Pulse, Motion, Color)
                                   │
                                   ▼
                  9. Embodiment Renderer (@luca/orb, future @luca/embodiment spatial hologram)
```

---

## 🏛️ Monorepo Layering & Package Map

1. **`@luca/audio` (v0.1.0)**: Device management, PCM resampling, VAD detection, streaming Whisper STT, `SentenceAudioQueue`, ElevenLabs TTS.
2. **`@luca/devtools` (v0.1.0)**: Flight recorder (`TraceCollector`), `TimelineStore`, `ReplayEngine`, `MetricsAggregator`, `NaturalConversationBenchmark`, `RuntimeStressSuite`, `ConversationQualityEvaluator`.
3. **`@luca/presentation` (v0.1.0)**: ViewModels & Presenter projections (`VoiceHudPresenter`).
4. **`@luca/platform-runtime` (v0.1.0)**: Composition Root (`LucaRuntimeProcess`, `RuntimeBuilder`, `RuntimeState`, `HealthMonitor`).
5. **`@luca/conversation-engine` (v0.1.0)**: `ConversationSession`, `SentenceBuilder`, `ToolSession`, `ToolPermissionPolicy`, `WeatherToolAdapter`, `TurnScheduler`, `ModelRouter`, `MemoryCoordinator`.
6. **`@luca/voice-engine` (v0.1.0)**: State machine (`Idle`, `Listening`, `Thinking`, `ToolExecution`, `Speaking`, `Interrupted`), pure reducers, `EventBus`.
7. **`@luca/presence-engine` (v0.1.0)**: Multi-signal cognitive fusion, continuous channels, lerp timeline, and embodiment translators (`OrbTranslator`, `FaceTranslator`).
8. **`@luca/protocol` (v0.1.0)**: Schemas, DTOs, errors, versioning (`v1`).
9. **`@luca/config` (v0.1.0)**: Subsystem settings, timeouts, thresholds.
10. **`@luca/orb` (v1.0.0 — FROZEN)**: Hardware GPU Shader renderer (`ADR-0001`).
11. **`apps/playground`**: Executable playground app (`bootPlayground()`, `GoldDemo`, `LivingDashboard`).
