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
import { DEEPGRAM_API_KEY, cortexUrl } from "../config/api";
import { LOCAL_STT_MODEL_IDS, LOCAL_TTS_MODEL_IDS } from "./ModelManagerService";

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

    // 1. LOCAL CHECK: If explicitly chosen a local model
    if (LOCAL_STT_MODEL_IDS.includes(voice.sttModel) || settingsService.isModelLocal(voice.sttModel)) {
      const healthy = await this.checkLocalHealth();
      if (healthy) return new LucaLocalSttProvider();
    }

    // 2. SMART HIERARCHY - GEMINI NATIVE
    if (
      voice.sttModel === "cloud-gemini" ||
      voice.sttModel === "gemini-live-2.5-flash-preview-native-audio-09-2025" ||
      voice.sttModel.toLowerCase().includes("gemini")
    ) {
      return new GeminiSttProvider(voice.sttModel);
    }

    // 3. USER CHOICE - CLOUD PROVIDERS
    if (voice.sttModel === "whisper-1" && settingsService.hasValidCloudKeys("openai")) {
      return new OpenAiSttProvider();
    }
    if (voice.sttModel === "deepgram-nova-2" && (localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY)) {
      return new DeepgramSttProvider();
    }

    // 4. FALLBACKS
    if (localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY) {
      return new DeepgramSttProvider();
    }
    if (settingsService.hasValidCloudKeys("openai")) {
      return new OpenAiSttProvider();
    }

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
    const settings = settingsService.getSettings();
    const { brain, voice } = settings;

    // 1. EXPLICIT LOCAL CHOICE
    if (voice.provider === "local-luca" || LOCAL_TTS_MODEL_IDS.includes(voice.voiceId)) {
      const healthy = await this.checkLocalHealth();
      if (healthy) return new CortexTtsProvider();
    }

    // 2. MULTIMODAL LOOP ENFORCEMENT (Unified Tunnel Path)
    // We only force the Gemini Loop if the user has specifically chosen a 'Live' or 'Loop' model.
    // Choice 1 (Gemini 2.0 Flash Native Audio) is NOT locked, allowing modular TTS.
    if (
      (voice.sttModel.toLowerCase().includes("live") || 
       voice.sttModel.toLowerCase().includes("loop")) &&
      (voice.provider === "gemini-genai" || !voice.provider)
    ) {
      const ttsModel =
        voice.sttModel.includes("native-audio") ||
        voice.sttModel.includes("live")
          ? voice.sttModel
          : brain.voiceModel || brain.model;
      return new GeminiTtsProvider(ttsModel);
    }

    // 3. USER CHOICE (Modular Plugin Path)
    if (
      voice.provider === "openai" &&
      settingsService.hasValidCloudKeys("openai")
    ) {
      return new OpenAiTtsProvider();
    }
    if (
      voice.provider === "deepgram" &&
      (localStorage.getItem("DEEPGRAM_API_KEY") || DEEPGRAM_API_KEY)
    ) {
      return new DeepgramTtsProvider();
    }
    if (voice.provider === "google") {
      return new GoogleTtsProvider();
    }

    // 4. LUCA PRIME (Enterprise Cloud / Gemini default)
    // Final check for Gemini's own engine as a base standard.
    if (brain.geminiApiKey) {
      return new GeminiTtsProvider(brain.voiceModel || brain.model);
    }

    // Final Sovereign Last Resort
    return new CortexTtsProvider();
  }

  private lastHealthCheck: boolean | null = null;
  private lastHealthCheckTime: number = 0;

  /**
   * Quick health check for local Cortex/Whisper services
   */
  private async checkLocalHealth(): Promise<boolean> {
    const now = Date.now();
    if (this.lastHealthCheck !== null && now - this.lastHealthCheckTime < 5000) {
      return this.lastHealthCheck;
    }

    try {
      const resp = await fetch(cortexUrl("/health"), {
        signal: AbortSignal.timeout(5000), // Increased to 5s for Intel Mac stability
      });
      this.lastHealthCheck = resp.ok;
      this.lastHealthCheckTime = now;
      return resp.ok;
    } catch {
      this.lastHealthCheck = false;
      this.lastHealthCheckTime = now;
      return false;
    }
  }
}

export const capabilityRouter = CapabilityRouter.getInstance();
