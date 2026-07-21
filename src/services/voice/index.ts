/**
 * Voice module public surface — product path only.
 *
 * Production spine: voiceSessionOrchestrator → liveService / hybridVoiceService /
 * BrowserHfRealtimeVoiceSession (+ CanonicalVoiceSessionBus, realtimeVoiceUiBridge).
 *
 * Dual-stack scaffolds (VoiceRuntime, stub provider registry/router, OpenAI-compatible
 * placeholders, onboarding/computer-use confirmation bridges) were removed after
 * reference audit (zero product callers outside voice/ self-tests).
 */

export * from "./types";

// Product session + HUD
export * from "./RealtimeVoiceSessionController";
export * from "./createRealtimeVoiceSessionController";
export * from "./HfRealtimeVoiceRuntime";
export * from "./createHfRealtimeVoiceRuntime";
export * from "./BrowserHfRealtimeVoiceSession";
export * from "./CanonicalVoiceSessionBus";
export * from "./realtimeVoiceUiBridge";
export * from "./useRealtimeVoiceHudState";

// HUD / mode / live diagnostics bridges used by OverlayManager + diagnostics
export * from "./VoiceHudRuntimeBridge";
export * from "./VoiceHudSubscriptionBridge";
export * from "./createVoiceHudSubscriptionBridge";
export * from "./VoiceModeUiBridge";
export * from "./createVoiceModeUiBridge";
export * from "./LiveVoiceRuntimeBridge";
export * from "./createLiveVoiceRuntimeBridge";

// Routing policy + shadow/authority (used by orchestrator / liveService)
export * from "./VoiceRuntimeProviderPolicy";
export * from "./VoiceRouteShadowEvaluator";
export * from "./VoiceRouteAuthorityGate";
export * from "./VoiceProviderReadiness";
export * from "./VoiceRuntimeStatePrecedence";

// Optional in-memory tape (optional eventBridge on RealtimeVoiceSessionController)
export * from "./VoiceInMemoryTapeSink";
export * from "./VoiceRuntimeEventBridge";

// Real STT/TTS provider implementations (CapabilityRouter / hybrid path)
export * from "./providers/CortexTtsProvider";
export * from "./providers/DeepgramSttProvider";
export * from "./providers/DeepgramTtsProvider";
export * from "./providers/GeminiSttProvider";
export * from "./providers/GeminiTtsProvider";
export * from "./providers/GoogleTtsProvider";
export * from "./providers/GroqSttProvider";
export * from "./providers/LucaBrainProvider";
export * from "./providers/LucaLocalSttProvider";
export * from "./providers/OpenAiSttProvider";
export * from "./providers/OpenAiTtsProvider";
