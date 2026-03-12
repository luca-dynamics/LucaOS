import { LLMProvider } from "./LLMProvider";
import { GeminiAdapter } from "./GeminiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { LocalLLMAdapter } from "./LocalLLMAdapter";
import { GrokAdapter } from "./GrokAdapter";
import { LucaSettings, settingsService } from "../settingsService";
import { LOCAL_BRAIN_MODEL_IDS } from "../ModelManagerService";
import { BRAIN_CONFIG } from "../../config/brain.config.ts";
import { ollamaUrl } from "../../config/api";

/**
 * ProviderFactory - Unified LLM Provider Routing
 *
 * DESIGN: Cloud-first with opt-in local
 * Smart Fallback Hierarchy: Choice -> User Cloud -> Luca Prime
 */
export class ProviderFactory {
  /**
   * Synchronous creation of provider based on settings.
   * Useful for initial boot.
   */
  static createProvider(
    settings: LucaSettings["brain"],
    persona?: string,
  ): LLMProvider {
    const { model, geminiApiKey, anthropicApiKey, openaiApiKey, xaiApiKey } =
      settings;

    // 0. LOCAL CORE: Force Local logic
    if (persona === "LOCALCORE") {
      return new LocalLLMAdapter(
        model.includes("/") ? model.split("/")[1] : model,
      );
    }

    // 1. Check for explicit LOCAL model selection
    const isExplicitLocal =
      model.startsWith("local/") || LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isExplicitLocal) {
      const adapterModelId = model.startsWith("local/")
        ? model.split("/")[1]
        : model;
      return new LocalLLMAdapter(adapterModelId);
    }

    // 2. Route by model prefix to appropriate cloud provider
    if (model.startsWith("gemini")) {
      return new GeminiAdapter(geminiApiKey || "", model);
    }

    if (model.startsWith("claude")) {
      return new AnthropicAdapter(anthropicApiKey || "", model);
    }

    if (model.startsWith("gpt") || model.startsWith("o1")) {
      return new OpenAIAdapter(openaiApiKey || "", model);
    }

    if (model.startsWith("grok")) {
      return new GrokAdapter(xaiApiKey || "", model);
    }

    // 3. Default: Gemini with embedded key (always works)
    return new GeminiAdapter(geminiApiKey || "", BRAIN_CONFIG.defaults.brain);
  }

  /**
   * Async creation of provider with Smart Fallback health checks.
   * Hierarchy: Selected -> User Peer Cloud -> Luca Prime
   */
  static async createHealthyProvider(
    settings: LucaSettings["brain"],
    persona?: string,
  ): Promise<LLMProvider> {
    const { model } = settings;

    // 1. Check if user choice is Local and Healthy
    const isLocal =
      persona === "LOCALCORE" ||
      model.startsWith("local/") ||
      LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isLocal) {
      const isHealthy = await this.checkLocalHealth();
      if (isHealthy) {
        return this.createProvider(settings, persona);
      }
      console.warn(
        `[ProviderFactory] Local model ${model} unreachable. Triggering Smart Fallback...`,
      );
    }

    // 2. SMART FALLBACK - Try User Peer Cloud
    const bestCloud = settingsService.getBestAvailableCloudProvider();
    if (bestCloud === "gemini") {
      // Fallback to Gemini (Luca Prime)
      return new GeminiAdapter(
        settings.geminiApiKey || "",
        BRAIN_CONFIG.defaults.brain,
      );
    }

    // Generate fallback settings for the best cloud
    const fallbackSettings = { ...settings };
    if (bestCloud === "openai") {
      fallbackSettings.model = "gpt-4o"; // Industrial standard fallback
    } else if (bestCloud === "anthropic") {
      fallbackSettings.model = "claude-3-5-sonnet-latest";
    } else if (bestCloud === "xai") {
      fallbackSettings.model = "grok-2-1212";
    }

    return this.createProvider(fallbackSettings, persona);
  }

  /**
   * Quick health check for Ollama loopback
   */
  private static async checkLocalHealth(): Promise<boolean> {
    try {
      const resp = await fetch(ollamaUrl(""), {
        signal: AbortSignal.timeout(1500),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}
