import { hybridVoiceService, HybridVoiceConfig } from "./hybridVoiceService";
import { liveService, LiveConfig } from "./liveService";
import { eventBus, type TelemetryEvent, type ToolLifecycleEvent } from "./eventBus";
import {
  resolveVoiceSessionRoute,
  resolveVoiceSessionRouteOverride,
  VoiceSessionRoute,
} from "./voiceSessionRouter";
import type { VoiceSessionRuntime } from "./voiceSessionTypes";
import { getFriendlyVoiceSpeedLabel } from "../utils/voiceDisplay";
import { settingsService } from "./settingsService";
import {
  browserHfRealtimeVoiceSession,
  type BrowserHfRealtimeVoiceConfig,
} from "./voice/BrowserHfRealtimeVoiceSession";
import { evaluateVoiceProviderReadiness } from "./voice/VoiceProviderReadiness";
import { evaluateVoiceRouteAuthority } from "./voice/VoiceRouteAuthorityGate";
import { deriveVoiceRuntimeProviderPolicy } from "./voice/VoiceRuntimeProviderPolicy";
import { canonicalVoiceSessionBus } from "./voice/CanonicalVoiceSessionBus";
import {
  classifyVoiceRoutingHealth,
  recommendVoiceRoute,
  type VoiceRouteRecommendation,
  type VoiceRoutingHealth,
} from "./voiceRoutingPolicy";

export interface VoiceSessionConnectOptions {
  liveConfig: LiveConfig;
  hybridConfig: Partial<HybridVoiceConfig>;
  hfRealtimeConfig?: Omit<BrowserHfRealtimeVoiceConfig, "endpoint" | "enabled">;
}

class VoiceSessionOrchestrator {
  private activeRoute: VoiceSessionRoute | null = null;
  private activeRuntime: VoiceSessionRuntime | null = null;
  private activeToolCallIds = new Set<string>();
  private latestLatencyMs: number | null = null;
  private latencyHistoryMs: number[] = [];
  private localCoreConnected = false;
  private lastRecommendedRouteKind: VoiceSessionRoute["kind"] | null = null;
  private lastAppliedAdaptiveRouteKind: VoiceSessionRoute["kind"] | null = null;
  private activePersona: string | null = null;

  constructor() {
    eventBus.on("tool-started", this.handleToolStarted);
    eventBus.on("tool-finished", this.handleToolFinished);
    eventBus.on("tool-failed", this.handleToolFinished);
    eventBus.on("telemetry-update", this.handleTelemetryUpdate);
  }

  setPersona(persona: string) {
    this.activePersona = persona;
  }

  getActiveRoute() {
    return this.activeRoute;
  }

  get connected(): boolean {
    return this.activeRuntime?.connected ?? false;
  }

  get status(): string {
    return this.activeRuntime?.status ?? "IDLE";
  }

  get displayStatus(): string {
    const baseStatus = this.status;
    if (
      baseStatus === "ERROR" ||
      baseStatus === "CONNECTING" ||
      baseStatus === "ROUTE_MISMATCH" ||
      baseStatus === "UNSTABLE" ||
      baseStatus === "DISCONNECTED"
    ) {
      return baseStatus;
    }

    if (this.connected && this.activeToolCallIds.size > 0) {
      return "WORKING";
    }

    return baseStatus;
  }

  get routeKind(): VoiceSessionRoute["kind"] | null {
    return this.activeRuntime?.routeKind ?? this.activeRoute?.kind ?? null;
  }

  get responseLatencyMs(): number | null {
    return this.latestLatencyMs;
  }

  get responseSpeedLabel(): string | null {
    return getFriendlyVoiceSpeedLabel(this.latestLatencyMs);
  }

  get routingHealth(): VoiceRoutingHealth {
    return classifyVoiceRoutingHealth(this.latencyHistoryMs);
  }

  get routeRecommendation(): VoiceRouteRecommendation {
    return recommendVoiceRoute({
      currentRoute: this.activeRoute,
      latencyHistoryMs: this.latencyHistoryMs,
      localCoreConnected: this.localCoreConnected,
      settings: settingsService.getSettings(),
      persona: this.activePersona || undefined,
    });
  }

  get adaptiveRouteApplied(): boolean {
    if (!this.activeRoute || !this.lastAppliedAdaptiveRouteKind) return false;
    return this.activeRoute.kind === this.lastAppliedAdaptiveRouteKind;
  }

  get canBargeIn(): boolean {
    return this.activeRuntime?.canBargeIn ?? false;
  }

  get supportsAudioOutput(): boolean {
    return this.activeRuntime?.supportsAudioOutput ?? false;
  }

  private notifyStateChange() {
    eventBus.emit("voice-session-state-changed", {
      status: this.status,
      displayStatus: this.displayStatus,
      routeKind: this.routeKind,
      connected: this.connected,
      activeToolCount: this.activeToolCallIds.size,
      responseLatencyMs: this.responseLatencyMs,
      responseSpeedLabel: this.responseSpeedLabel,
      routingHealth: this.routingHealth,
      routeRecommendation: this.routeRecommendation,
      adaptiveRouteApplied: this.adaptiveRouteApplied,
      lastAppliedAdaptiveRouteKind: this.lastAppliedAdaptiveRouteKind,
      lastRecommendedRouteKind: this.lastRecommendedRouteKind,
      localCoreConnected: this.localCoreConnected,
    });
  }

  private handleToolStarted = (event: ToolLifecycleEvent) => {
    if (!this.connected) return;
    const id = event.toolCallId || `${event.source || "unknown"}:${event.toolName}`;
    this.activeToolCallIds.add(id);
    this.notifyStateChange();
  };

  private handleToolFinished = (event: ToolLifecycleEvent) => {
    const id = event.toolCallId || `${event.source || "unknown"}:${event.toolName}`;
    if (this.activeToolCallIds.delete(id)) {
      this.notifyStateChange();
    }
  };

  private handleTelemetryUpdate = (event: TelemetryEvent) => {
    const nextLatency =
      event.brain?.ttft ??
      event.stt?.local ??
      event.stt?.cloud ??
      event.tts?.latency ??
      null;

    if (nextLatency == null || Number.isNaN(nextLatency) || nextLatency <= 0) {
      return;
    }

    if (this.latestLatencyMs !== nextLatency) {
      this.latestLatencyMs = nextLatency;
      this.latencyHistoryMs = [...this.latencyHistoryMs, nextLatency].slice(-5);
      
      // ACTIVE ROUTING: Pull the trigger if policy recommends a switch
      this.tryAdaptiveHotSwap();
      
      this.notifyStateChange();
    }
  };

  private async tryAdaptiveHotSwap() {
    const recommendation = this.routeRecommendation;
    
    // 1. Only act if switch is ADVISED and we aren't already switching
    if (!recommendation.shouldSwitch || this.status === "CONNECTING") return;

    // 2. CONTEXT SAFETY: Do not switch if Luca is currently working, speaking, or listening
    // We wait for the 'IDLE' gap to perform the swap to avoid audio pops or broken tool calls
    if (this.displayStatus !== "IDLE") {
      console.log(`[ORCHESTRATOR] Routing Switch ADVISED (${recommendation.recommendedRouteKind}), but Luca is BUSY. Waiting for IDLE...`);
      return;
    }

    // 3. PRE-FLIGHT CHECK: Ensure the destination route is actually viable (Models downloaded + Local Core UP)
    const isViable = await this.isRouteViable(recommendation.recommendedRouteKind);
    if (!isViable) {
      console.warn(`[ORCHESTRATOR] Routing Switch ADVISED but destination ${recommendation.recommendedRouteKind} is not viable (Missing models or core offline).`);
      return;
    }

    console.log(`[ORCHESTRATOR] ⚡ ACTIVE ROUTING: Triggering Hot-Swap to ${recommendation.recommendedRouteKind} due to ${recommendation.reason}`);
    
    // Signal the UI/Hook to perform a safe reconnection with existing handlers
    eventBus.emit("voice-session-adaptive-reconnect-required", {
      recommendedRouteKind: recommendation.recommendedRouteKind,
      reason: recommendation.reason
    });
  }

  private async isRouteViable(kind: VoiceSessionRoute["kind"]): Promise<boolean> {
    if (kind === "CLOUD_BIDI") return true; // Cloud is assumed viable if internet exists
    
    // Check Local Core
    if (!this.localCoreConnected) return false;

    // Check Local Models
    const { localModelLibrary: modelManagerService } = await import("./local-models/LocalModelLibrary");
    const settings = settingsService.getSettings();
    const sttModel = settings?.voice?.sttModel || "whisper-tiny";
    
    if (kind === "LOCAL_PIPELINE") {
      const modelSpecs = modelManagerService.getModelSpecs(sttModel);
      const sttReady = modelSpecs?.status === "ready";
      return sttReady;
    }

    return true;
  }

  setLocalCoreConnected(connected: boolean) {
    if (this.localCoreConnected !== connected) {
      this.localCoreConnected = connected;
      this.notifyStateChange();
    }
  }

  resolveRoute() {
    const recommendation = this.routeRecommendation;
    return resolveVoiceSessionRoute(
      settingsService.getSettings(),
      recommendation.preferredBrainProvider,
    );
  }

  resolveAdaptiveRoute() {
    const baseRoute = this.resolveRoute();
    const recommendation = this.routeRecommendation;
    this.lastRecommendedRouteKind = recommendation.recommendedRouteKind;

    if (!recommendation.shouldSwitch) {
      this.lastAppliedAdaptiveRouteKind = null;
      return baseRoute;
    }

    const adaptiveRoute = resolveVoiceSessionRouteOverride(
      recommendation.recommendedRouteKind,
      settingsService.getSettings(),
      recommendation.preferredBrainProvider,
    );
    this.lastAppliedAdaptiveRouteKind =
      adaptiveRoute.kind !== baseRoute.kind ? adaptiveRoute.kind : null;
    return adaptiveRoute;
  }

  async connect({
    liveConfig,
    hybridConfig,
    hfRealtimeConfig,
  }: VoiceSessionConnectOptions): Promise<VoiceSessionRoute> {
    const route = this.resolveAdaptiveRoute();
    this.disconnect(false);
    const canonicalRoute = route.kind === "CLOUD_BIDI" ? "cloud_bidi" : "hybrid";
    const canonicalLiveConfig: LiveConfig = {
      ...liveConfig,
      onToolCall: async (name, args) => {
        canonicalVoiceSessionBus.publish({ type: "tool.requested", route: "cloud_bidi", name });
        const result = await liveConfig.onToolCall(name, args);
        canonicalVoiceSessionBus.publish({ type: "tool.completed", route: "cloud_bidi", name });
        return result;
      },
      onConnectionChange: (connected) => {
        canonicalVoiceSessionBus.publish({
          type: connected ? "session.connected" : "session.disconnected",
          route: "cloud_bidi",
          ...(connected ? {} : { reason: "provider_disconnected" }),
        });
        liveConfig.onConnectionChange?.(connected);
      },
      onVadChange: (active) => {
        canonicalVoiceSessionBus.publish({ type: active ? "speech.started" : "speech.stopped", route: "cloud_bidi" });
        liveConfig.onVadChange?.(active);
      },
      onTranscript: (text, source) => {
        canonicalVoiceSessionBus.publish(
          source === "user"
            ? { type: "transcript.final", route: "cloud_bidi", text }
            : { type: "response.text.delta", route: "cloud_bidi", text },
        );
        liveConfig.onTranscript(text, source);
      },
      onStatusUpdate: (status) => {
        const normalized = status.toLowerCase();
        if (normalized.includes("listening") || normalized.includes("idle")) {
          if (canonicalVoiceSessionBus.getSnapshot().isSpeaking) {
            canonicalVoiceSessionBus.publish({ type: "response.audio.completed", route: "cloud_bidi" });
          }
        } else if (normalized.includes("error") || normalized.includes("failed")) {
          canonicalVoiceSessionBus.publish({ type: "session.error", route: "cloud_bidi", error: status });
        }
        liveConfig.onStatusUpdate?.(status);
      },
    };
    const canonicalHybridConfig: Partial<HybridVoiceConfig> = {
      ...hybridConfig,
      onConnectionChange: (connected) => {
        canonicalVoiceSessionBus.publish({
          type: connected ? "session.connected" : "session.disconnected",
          route: canonicalRoute,
          ...(connected ? {} : { reason: "provider_disconnected" }),
        });
        hybridConfig.onConnectionChange?.(connected);
      },
      onVadChange: (active) => {
        canonicalVoiceSessionBus.publish({ type: active ? "speech.started" : "speech.stopped", route: canonicalRoute });
        hybridConfig.onVadChange?.(active);
      },
      onTranscript: (text, source) => {
        canonicalVoiceSessionBus.publish(
          source === "user"
            ? { type: "transcript.final", route: canonicalRoute, text }
            : { type: "response.text.delta", route: canonicalRoute, text },
        );
        hybridConfig.onTranscript?.(text, source);
      },
      onStatusUpdate: (status) => {
        const normalized = status.toLowerCase();
        if (normalized.includes("listening") || normalized.includes("idle")) {
          if (canonicalVoiceSessionBus.getSnapshot().isSpeaking) {
            canonicalVoiceSessionBus.publish({ type: "response.audio.completed", route: canonicalRoute });
          }
        } else if (normalized.includes("error") || normalized.includes("failed")) {
          canonicalVoiceSessionBus.publish({ type: "session.error", route: canonicalRoute, error: status });
        }
        hybridConfig.onStatusUpdate?.(status);
      },
    };

    const settings = settingsService.getSettings();
    const hfRealtimeRequested =
      route.kind !== "CLOUD_BIDI" &&
      settings.voice.hfRealtimeEnabled === true &&
      Boolean(settings.voice.hfRealtimeEndpoint?.trim());
    const hfReadiness = evaluateVoiceProviderReadiness({
      providerKind: "local",
      capability: "streaming_stt",
      featureFlags: {
        enableRealLocalVoiceProvider: hfRealtimeRequested,
        enableRealStt: hfRealtimeRequested,
        enableRealStreaming: hfRealtimeRequested,
        enableLocalModelLoading: hfRealtimeRequested,
      },
      backendAvailable: hfRealtimeRequested,
      modelAvailable: hfRealtimeRequested,
      localModelLoadingAllowed: hfRealtimeRequested,
    });
    const hfAuthority = evaluateVoiceRouteAuthority({
      mode: hfRealtimeRequested ? "runtime_router" : "existing_resolver",
      existingRoute: route,
      runtimeRoute: hfRealtimeRequested ? route : undefined,
      providerPolicy: deriveVoiceRuntimeProviderPolicy(settings.voice),
      readinessSummary: hfReadiness,
      featureFlags: {
        enableRuntimeRouteAuthority: hfRealtimeRequested,
        enableRuntimeRouteAuthorityForPrivacyPreset: true,
        enableRuntimeRouteAuthorityForSpeedsterPreset: true,
        enableRuntimeRouteAuthorityForPerformancePreset: true,
        enableRuntimeRouteAuthorityForBalancedPreset: true,
        requireReadinessReadyBeforePromotion: true,
      },
    });
    route.authority = hfAuthority;
    const hfRealtimeEnabled =
      hfRealtimeRequested && hfAuthority.activeAuthority === "runtime_router";

    if (route.kind === "CLOUD_BIDI") {
      await liveService.connect(canonicalLiveConfig);
      this.activeRuntime = liveService;
    } else if (hfRealtimeEnabled) {
      try {
        await browserHfRealtimeVoiceSession.connect({
          ...canonicalHybridConfig,
          ...hfRealtimeConfig,
          enabled: true,
          endpoint: settings.voice.hfRealtimeEndpoint!.trim(),
        });
        this.activeRuntime = browserHfRealtimeVoiceSession;
        route.reason = route.reason
          ? `${route.reason} OpenAI Realtime local backend connected.`
          : "OpenAI Realtime local backend connected.";
      } catch (error) {
        console.warn(
          "[VOICE] OpenAI Realtime local backend unavailable; falling back to the configured hybrid pipeline.",
          error,
        );
        await hybridVoiceService.connect({
          ...canonicalHybridConfig,
          brainProvider: route.brainProvider,
          ttsVoice:
            route.kind === "LOCAL_PIPELINE"
              ? "__LOCAL_PIPELINE__"
              : "__HYBRID_PIPELINE__",
        });
        this.activeRuntime = hybridVoiceService;
        route.reason = "OpenAI Realtime local backend was unavailable; existing voice pipeline fallback is active.";
      }
    } else {
      await hybridVoiceService.connect({
        ...canonicalHybridConfig,
        brainProvider: route.brainProvider,
        ttsVoice:
          route.kind === "LOCAL_PIPELINE"
            ? "__LOCAL_PIPELINE__"
            : "__HYBRID_PIPELINE__",
      });
      this.activeRuntime = hybridVoiceService;
    }

    this.activeRoute = route;
    this.latestLatencyMs = null;
    this.latencyHistoryMs = [];
    this.notifyStateChange();
    return route;
  }

  async sendText(text: string): Promise<void> {
    if (!this.activeRuntime) return;
    await this.activeRuntime.sendText(text);
  }

  sendImage(frame: string, createResponse = true): boolean {
    return this.activeRuntime === browserHfRealtimeVoiceSession
      ? browserHfRealtimeVoiceSession.sendImage(frame, createResponse)
      : false;
  }

  disconnect(resetAdaptiveState: boolean = true): void {
    if (this.activeRuntime === liveService) {
      liveService.disconnect();
    } else if (this.activeRuntime === hybridVoiceService) {
      hybridVoiceService.disconnect();
    } else if (this.activeRuntime === browserHfRealtimeVoiceSession) {
      void browserHfRealtimeVoiceSession.disconnect();
    } else {
      liveService.disconnect();
      hybridVoiceService.disconnect();
      void browserHfRealtimeVoiceSession.disconnect();
    }
    this.activeRoute = null;
    this.activeRuntime = null;
    this.activeToolCallIds.clear();
    this.latestLatencyMs = null;
    this.latencyHistoryMs = [];
    if (resetAdaptiveState) {
      this.lastAppliedAdaptiveRouteKind = null;
      this.lastRecommendedRouteKind = null;
    }
    this.notifyStateChange();
  }
}

export const voiceSessionOrchestrator = new VoiceSessionOrchestrator();
