import { settingsService } from "./settingsService";
import {
  IStreamingSttProvider,
  IReasoningProvider,
  ITtsProvider,
} from "./voice/types";
import { DeepgramSttProvider } from "./voice/providers/DeepgramSttProvider";
import { OpenAiSttProvider } from "./voice/providers/OpenAiSttProvider";
import { LucaBrainProvider } from "./voice/providers/LucaBrainProvider";
import { OpenAiTtsProvider } from "./voice/providers/OpenAiTtsProvider";
import { DeepgramTtsProvider } from "./voice/providers/DeepgramTtsProvider";
import { CortexTtsProvider } from "./voice/providers/CortexTtsProvider";
import { GeminiTtsProvider } from "./voice/providers/GeminiTtsProvider";
import { GeminiSttProvider } from "./voice/providers/GeminiSttProvider";
import { GoogleTtsProvider } from "./voice/providers/GoogleTtsProvider";
import { LucaLocalSttProvider } from "./voice/providers/LucaLocalSttProvider";
import { modelReadinessResolver } from "./models/ModelReadinessResolver";
import type { ModelRouteDecision } from "../types/modelRouting";

/**
 * CapabilityRouter: The intelligent routing layer for Luca OS.
 * It maps OS "Intents" (I want to speak, I want to see) to
 * the best available provider based on API keys and geography.
 */
class CapabilityRouter {
  private static instance: CapabilityRouter;

  public static getInstance(): CapabilityRouter {
    if (!CapabilityRouter.instance) {
      CapabilityRouter.instance = new CapabilityRouter();
    }
    return CapabilityRouter.instance;
  }

  /**
   * Determine the best STT provider based on user keys.
   * Priority: Deepgram (WS) > OpenAI (Whisper) > Groq (Whisper) > Local (Cortex)
   */
  public async getSttProvider(): Promise<IStreamingSttProvider> {
    const route = await modelReadinessResolver.resolveRoute({
      capability: "stt",
    });
    this.logVoiceRoute("STT", route);

    if (route.readiness === "ready") {
      if (route.provider === "cortex" || route.provider === "local") {
        return new LucaLocalSttProvider();
      }
      if (route.provider === "gemini" || route.provider === "luca-prime") {
        return new GeminiSttProvider(route.model);
      }
      if (route.provider === "openai") {
        return new OpenAiSttProvider();
      }
      if (route.provider === "deepgram") {
        return new DeepgramSttProvider();
      }
    }

    // Safe fallback: local-only routes never jump to cloud here. Cloud/BYOK routes may
    // fall back to the local adapter, which preserves existing voice pipeline behavior
    // without making an unapproved network call.
    console.warn(`[CapabilityRouter] STT route not ready: ${route.reason}`);
    return new LucaLocalSttProvider();
  }

  /**
   * Determine the best Reasoning (Brain) provider.
   * Priority: LucaService (Unified Orchestration)
   */
  public getReasoningProvider(): IReasoningProvider {
    return new LucaBrainProvider();
  }

  /**
   * Determine the best TTS provider.
   * Smart Hierarchy: Choice -> User Cloud -> Luca Prime
   */
  public async getTtsProvider(): Promise<ITtsProvider> {
    const route = await modelReadinessResolver.resolveRoute({
      capability: "tts",
    });
    this.logVoiceRoute("TTS", route);

    if (route.readiness === "ready") {
      if (route.provider === "cortex" || route.provider === "local") {
        return new CortexTtsProvider();
      }
      if (route.provider === "openai") {
        return new OpenAiTtsProvider();
      }
      if (route.provider === "deepgram") {
        return new DeepgramTtsProvider();
      }
      if (route.provider === "google") {
        return new GoogleTtsProvider();
      }
      if (route.provider === "gemini" || route.provider === "luca-prime") {
        return new GeminiTtsProvider(route.model);
      }
    }

    console.warn(`[CapabilityRouter] TTS route not ready: ${route.reason}`);
    return new CortexTtsProvider();
  }

  private logVoiceRoute(label: "STT" | "TTS", route: ModelRouteDecision): void {
    console.info(
      `[CapabilityRouter] ${label} route provider=${route.provider} model=${route.model} mode=${route.mode} readiness=${route.readiness} network=${route.networkAllowed}`,
    );
    for (const warning of route.warnings) {
      console.warn(`[CapabilityRouter] ${label} warning: ${warning}`);
    }
  }

  private lastHealthCheck: boolean | null = null;
  private lastHealthCheckTime: number = 0;

  /**
   * Quick health check for local Cortex/Whisper services
   */
  private async checkLocalHealth(): Promise<boolean> {
    const now = Date.now();
    if (
      this.lastHealthCheck !== null &&
      now - this.lastHealthCheckTime < 5000
    ) {
      return this.lastHealthCheck;
    }

    try {
      // Product path: Cortex facade probe (not hard-coded legacy port).
      const { probeCortexViaRuntimeFacade } = await import(
        "./local-models/cortexRuntimeProbe"
      );
      const probe = await probeCortexViaRuntimeFacade({ ttlMs: 5_000 });
      this.lastHealthCheck = probe.available;
      this.lastHealthCheckTime = now;
      return probe.available;
    } catch {
      this.lastHealthCheck = false;
      this.lastHealthCheckTime = now;
      return false;
    }
  }
}

export const capabilityRouter = CapabilityRouter.getInstance();
