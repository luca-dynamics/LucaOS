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
import { LucaLocalSttProvider } from "./voice/providers/LucaLocalSttProvider";
import { DEEPGRAM_API_KEY, cortexUrl } from "../config/api";

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
    const settings = settingsService.getSettings();
    const { voice } = settings;

    // 1. SMART HIERARCHY - USER CHOICE
    if (voice.sttModel === "cloud-gemini") {
      return new OpenAiSttProvider(); // Gemini using OpenAI wrapper initially, or direct
    }

    if (settingsService.isModelLocal(voice.sttModel)) {
      // Check health of local core
      const healthy = await this.checkLocalHealth();
      if (healthy) return new LucaLocalSttProvider();
      console.warn(
        "[Router] Local STT unavailable, falling back to User Peer Cloud...",
      );
    }

    // 2. USER PEER CLOUD (FALLBACK)
    if (localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY) {
      return new DeepgramSttProvider();
    }
    if (settingsService.hasValidCloudKeys("openai")) {
      return new OpenAiSttProvider();
    }

    // 3. LUCA PRIME (ULTIMATE FALLBACK)
    return new LucaLocalSttProvider(); // Local fallback if all fails
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
    const settings = settingsService.getSettings();
    const { brain, voice } = settings;

    // 1. USER CHOICE
    if (voice.provider === "local-luca") {
      const healthy = await this.checkLocalHealth();
      if (healthy) return new CortexTtsProvider();
      console.warn("[Router] Local TTS unavailable, falling back...");
    }

    if (voice.provider === "gemini-genai" && brain.geminiApiKey) {
      return new GeminiTtsProvider();
    }

    // 2. USER PEER CLOUD
    if (settingsService.hasValidCloudKeys("openai")) {
      return new OpenAiTtsProvider();
    }
    if (localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY) {
      return new DeepgramTtsProvider();
    }

    // 3. LUCA PRIME (Enterprise Cloud / Gemini default)
    if (brain.geminiApiKey) {
      return new GeminiTtsProvider();
    }

    // Last Resort
    return new CortexTtsProvider();
  }

  /**
   * Quick health check for local Cortex/Whisper services
   */
  private async checkLocalHealth(): Promise<boolean> {
    try {
      const resp = await fetch(cortexUrl("/health"), {
        signal: AbortSignal.timeout(1500),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}

export const capabilityRouter = CapabilityRouter.getInstance();
