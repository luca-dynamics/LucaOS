import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  LucaSTTBackend,
  LucaTTSBackend,
  LucaVoiceProviderKind,
  LucaVoiceProviderPreference,
  LucaVoiceProviderRouteRequest,
  LucaVoiceProviderRouteResult,
} from "./types";

const ROUTER_METADATA = {
  routerKind: "voice_provider_router_scaffold" as const,
  audioApisCalled: false as const,
  sttApisCalled: false as const,
  ttsApisCalled: false as const,
  systemApisCalled: false as const,
  heavyModelsLoaded: false as const,
  requiresExplicitOptIn: true as const,
};

export interface VoiceProviderRouterSnapshot {
  strategy: "voice_provider_router_scaffold";
  totalRoutes: number;
  lastRoute?: LucaVoiceProviderRouteResult;
}

export class VoiceProviderRouter {
  private totalRoutes = 0;
  private lastRoute?: LucaVoiceProviderRouteResult;

  constructor(private readonly registry: VoiceBackendRegistry) {}

  route(request: LucaVoiceProviderRouteRequest): LucaVoiceProviderRouteResult {
    this.totalRoutes += 1;
    const kinds = this.resolvePreferenceOrder(request.preference ?? "auto");
    const matcher = (backend: LucaSTTBackend | LucaTTSBackend) => this.matches(backend, request);

    const backends = this.getBackendsForCapability(request.capability);
    const firstMatch = backends.find(matcher);

    if (!firstMatch) {
      return this.finish({
        ok: false,
        fallbackUsed: false,
        reason: "no_matching_backend",
        metadata: { ...ROUTER_METADATA, ...(request.metadata ?? {}) },
      });
    }

    const preferredMatch = kinds
      .map((kind) => backends.find((backend) => backend.providerKind === kind && matcher(backend)))
      .find(Boolean);

    const selected = preferredMatch ?? firstMatch;
    return this.finish({
      ok: true,
      selectedBackendId: selected.id,
      selectedProviderKind: selected.providerKind,
      fallbackUsed: preferredMatch === undefined && selected.providerKind !== kinds[0],
      metadata: { ...ROUTER_METADATA, ...(request.metadata ?? {}) },
    });
  }

  getSnapshot(): VoiceProviderRouterSnapshot {
    return {
      strategy: "voice_provider_router_scaffold",
      totalRoutes: this.totalRoutes,
      lastRoute: this.lastRoute,
    };
  }

  reset(): void {
    this.totalRoutes = 0;
    this.lastRoute = undefined;
  }

  private finish(result: LucaVoiceProviderRouteResult): LucaVoiceProviderRouteResult {
    this.lastRoute = result;
    return result;
  }

  private getBackendsForCapability(capability: LucaVoiceProviderRouteRequest["capability"]) {
    if (["stt", "streaming_stt", "low_latency", "multilingual"].includes(capability)) {
      return this.registry.listSTTBackends();
    }

    return this.registry.listTTSBackends();
  }

  private matches(backend: LucaSTTBackend | LucaTTSBackend, request: LucaVoiceProviderRouteRequest): boolean {
    const requiresStreaming = request.requiresStreaming || request.capability === "streaming_stt" || request.capability === "streaming_tts";
    if (requiresStreaming && !backend.supportsStreaming) {
      return false;
    }

    if (request.language && !backend.supportedLanguages.includes(request.language)) {
      return false;
    }

    if (this.isTtsBackend(backend)) {
      const requiresVoiceClone = request.requiresVoiceClone || request.capability === "voice_clone";
      const requiresEmotion = request.requiresEmotion || request.capability === "emotion";

      if (requiresVoiceClone && !backend.supportsVoiceClone) {
        return false;
      }

      if (requiresEmotion && !backend.supportsEmotion) {
        return false;
      }
    }

    return true;
  }

  private isTtsBackend(backend: LucaSTTBackend | LucaTTSBackend): backend is LucaTTSBackend {
    return "supportsVoiceClone" in backend;
  }

  private resolvePreferenceOrder(preference: LucaVoiceProviderPreference): LucaVoiceProviderKind[] {
    if (preference === "local") return ["local", "cloud", "byok"];
    if (preference === "cloud") return ["cloud", "local", "byok"];
    if (preference === "byok") return ["byok", "local", "cloud"];
    return ["local", "cloud", "byok"];
  }
}
