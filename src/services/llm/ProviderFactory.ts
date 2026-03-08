import { LLMProvider } from "./LLMProvider";
import { GeminiAdapter } from "./GeminiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { LocalLLMAdapter } from "./LocalLLMAdapter";
import { GrokAdapter } from "./GrokAdapter";
import { LucaSettings } from "../settingsService";
import { LOCAL_BRAIN_MODEL_IDS } from "../ModelManagerService";
import { BRAIN_CONFIG } from "../../config/brain.config.ts";

/**
 * ProviderFactory - Unified LLM Provider Routing
 *
 * DESIGN: Cloud-first with opt-in local
 * - Luca ships with embedded dev API key (always available)
 * - Cloud models work out of the box
 * - Local models are explicitly selected by user in Settings > Brain
 *
 * Local model IDs are imported from ModelManagerService (single source of truth)
 */
export class ProviderFactory {
  static createProvider(settings: LucaSettings["brain"]): LLMProvider {
    const { model, geminiApiKey, anthropicApiKey, openaiApiKey, xaiApiKey } =
      settings;

    // 1. Check for explicit LOCAL model selection
    const isExplicitLocal =
      model.startsWith("local/") || LOCAL_BRAIN_MODEL_IDS.includes(model);

    if (isExplicitLocal) {
      const adapterModelId = model.startsWith("local/")
        ? model.split("/")[1]
        : model;
      console.log(`[ProviderFactory] Using LOCAL model: ${adapterModelId}`);
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
    console.log(
      `[ProviderFactory] Defaulting to Gemini: ${BRAIN_CONFIG.defaults.brain}`,
    );
    return new GeminiAdapter(geminiApiKey || "", BRAIN_CONFIG.defaults.brain);
  }
}
