import { LLMProvider } from "./LLMProvider";
import { GeminiAdapter } from "./GeminiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { LocalLLMAdapter } from "./LocalLLMAdapter";
import { GrokAdapter } from "./GrokAdapter";
import { DeepSeekAdapter } from "./DeepSeekAdapter";
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
   *
   * THREE-TIER MODEL:
   *   TIER 1 - Luca Prime (default): Enterprise key from env vars, no user setup needed.
   *            `useCustomApiKey: false` → adapters receive "" which defers to getGenClient() singleton.
   *   TIER 2 - BYOK (opt-in):         User supplies their own key to replace the enterprise key.

   *            `useCustomApiKey: true` → adapters receive the user's stored key.
   *   TIER 3 - Local (opt-in):         Onboard models or Ollama, completely bypasses keys.
   */
  static createProvider(
    settings: LucaSettings["brain"],
    persona?: string,
  ): LLMProvider {
    const {
      model,
      useCustomApiKey,
      geminiApiKey,
      anthropicApiKey,
      openaiApiKey,
      xaiApiKey,
      deepseekApiKey,
    } = settings;

    // TIER 3 — LOCAL: LOCALCORE persona or explicit local model ID
    if (persona === "LOCALCORE") {
      return new LocalLLMAdapter(
        model.includes("/") ? model.split("/")[1] : model,
      );
    }

    const isExplicitLocal =
      model.startsWith("local/") || LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isExplicitLocal) {
      const adapterModelId = model.startsWith("local/")
        ? model.split("/")[1]
        : model;
      return new LocalLLMAdapter(adapterModelId);
    }

    // TIER 1 vs TIER 2 key resolution:
    // When useCustomApiKey is false (Luca Prime), pass "" so adapters defer to
    // the enterprise getGenClient() singleton loaded from env vars.
    // When useCustomApiKey is true (BYOK), pass the user's stored key.
    const resolveKey = (userKey: string | undefined) =>
      useCustomApiKey ? (userKey || "") : "";

    // Route by model prefix
    if (model.startsWith("gemini")) {
      return new GeminiAdapter(resolveKey(geminiApiKey), model);
    }

    if (model.startsWith("claude")) {
      return new AnthropicAdapter(resolveKey(anthropicApiKey), model);
    }

    if (model.startsWith("gpt") || model.startsWith("o1")) {
      return new OpenAIAdapter(resolveKey(openaiApiKey), model);
    }

    if (model.startsWith("grok")) {
      return new GrokAdapter(resolveKey(xaiApiKey), model, (settings as any).xaiBaseUrl);
    }

    if (model.startsWith("deepseek")) {
      return new DeepSeekAdapter(resolveKey(deepseekApiKey), model);
    }

    // Final fallback: Luca Prime default model (enterprise key via singleton)
    console.warn(`[ProviderFactory] Unknown model ID "${model}", defaulting to Luca Prime.`);
    return new GeminiAdapter("", BRAIN_CONFIG.defaults.brain);
  }


  /**
   * Async creation of provider with health checks.
   * DESIGN: Respect explicit user choice first. Only fall back if the model is
   * ambiguous (e.g., local model set but no local service running).
   */
  static async createHealthyProvider(
    settings: LucaSettings["brain"],
    persona?: string,
  ): Promise<LLMProvider> {
    const { model } = settings;

    // 1. If an explicit cloud model is set (claude-*, gpt-*, grok-*, deepseek-*),
    //    trust it and route directly — no health check, no fallback.
    const isExplicitCloud =
      model.startsWith("claude") ||
      model.startsWith("gpt") ||
      model.startsWith("o1") ||
      model.startsWith("grok") ||
      model.startsWith("deepseek");

    if (isExplicitCloud) {
      console.log(`[ProviderFactory] Explicit cloud model set: ${model}. Routing directly without fallback.`);
      return this.createProvider(settings, persona);
    }

    // 2. If an explicit local model is set, route to local.
    //    If local service is unreachable, surface the error clearly instead of silently
    //    swapping to Gemini.
    const isLocal =
      persona === "LOCALCORE" ||
      model.startsWith("local/") ||
      LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isLocal) {
      console.log(`[ProviderFactory] Local model selected: ${model}. Routing to LocalLLMAdapter.`);
      // Return the local adapter regardless — it will surface a clear "connection refused" error
      // to the user rather than silently burning cloud quota.
      return this.createProvider(settings, persona);
    }

    // 3. Gemini model selected — route directly, no fallback needed.
    if (model.startsWith("gemini")) {
      return this.createProvider(settings, persona);
    }

    // 4. Fallback for truly unknown/empty model ID — pick the best available cloud.
    console.warn(`[ProviderFactory] Unknown model ID "${model}". Selecting best available provider.`);
    const bestCloud = settingsService.getBestAvailableCloudProvider();
    const fallbackSettings = { ...settings };
    if (bestCloud === "anthropic") {
      fallbackSettings.model = "claude-3-5-sonnet-latest";
    } else if (bestCloud === "openai") {
      fallbackSettings.model = "gpt-4o";
    } else if (bestCloud === "xai") {
      fallbackSettings.model = "grok-2-1212";
    } else if (bestCloud === "deepseek") {
      fallbackSettings.model = "deepseek-chat";
    } else {
      // Absolute last resort: Gemini with hardcoded default
      fallbackSettings.model = BRAIN_CONFIG.defaults.brain;
    }

    return this.createProvider(fallbackSettings, persona);
  }

  /**
   * Specifically creates a provider that IS capable of embeddings.
   * If current brain doesn't support it, falls back to OpenAI or Gemini.
   */
  static async createEmbeddingProvider(
    settings: LucaSettings["brain"],
  ): Promise<LLMProvider> {
    const provider = this.createProvider(settings);

    // If provider supports it natively, use it
    if (provider.embed) return provider;

    // Fallback hierarchy for memory
    const hasOpenAI = !!settings.openaiApiKey;
    const hasGemini = !!settings.geminiApiKey;

    if (hasGemini) {
      return new GeminiAdapter(settings.geminiApiKey!, BRAIN_CONFIG.defaults.embedding);
    }

    if (hasOpenAI) {
      return new OpenAIAdapter(settings.openaiApiKey!, "gpt-4o");
    }

    // Extreme fallback: singleton Gemini
    return new GeminiAdapter("", BRAIN_CONFIG.defaults.embedding);
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

  /**
   * Validates a specific API key without changing system settings.
   * Internal utility for UI 'Verify' buttons.
   */
  static async validateSpecificKey(
    providerId: string,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<{ valid: boolean; message: string }> {
    let provider: LLMProvider | undefined;

    if (providerId === "gemini") {
      provider = new GeminiAdapter(apiKey, model);
    } else if (providerId === "anthropic") {
      provider = new AnthropicAdapter(apiKey, model);
    } else if (providerId === "openai") {
      provider = new OpenAIAdapter(apiKey, model);
      if (baseUrl) (provider as any).client.baseURL = baseUrl;
    } else if (providerId === "xai") {
      provider = new GrokAdapter(apiKey, model, baseUrl);
    } else if (providerId === "deepseek") {
      provider = new DeepSeekAdapter(apiKey, model);
      if (baseUrl) (provider as any).client.baseURL = baseUrl;
    }

    if (!provider) {
      return { valid: false, message: `Unknown provider: ${providerId}` };
    }

    return provider.validateKey();
  }
}
