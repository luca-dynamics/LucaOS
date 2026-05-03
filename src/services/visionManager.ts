import { CORTEX_URL } from "../config/api";
import { settingsService } from "./settingsService";
import { BRAIN_CONFIG } from "../config/brain.config";

export type VisionIntent = "planning" | "insight" | "action";

export interface VisionProviderConfig {
  provider: "gemini" | "ui-tars" | "openai" | "claude" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl: string;
  description?: string;
  fallback?: VisionProviderConfig;
}

export interface VisionManagerConfig {
  planning: VisionProviderConfig;
  insight: VisionProviderConfig;
  action: VisionProviderConfig;
}

export interface VisionResult {
  prediction: string;
  model: string;
  intent: VisionIntent;
}

export class VisionManager {
  public config: VisionManagerConfig;

  constructor(config?: VisionManagerConfig) {
    this.config = config || this.getDefaultConfig();
  }

  private getDefaultConfig(): VisionManagerConfig {
    const { brain } = settingsService.getSettings();
    const geminiApiKey = brain.geminiApiKey || "";

    const selectedVisionModel =
      brain.visionModel || brain.model || BRAIN_CONFIG.defaults.vision;
    const isLocal = settingsService.isModelLocal(selectedVisionModel);

    // Hard-stop local fallback (Zero-Cloud Intercept)
    const localFallback: VisionProviderConfig = {
      provider: "ollama",
      model: "moondream",
      baseUrl: "http://127.0.0.1:11434",
    };

    const defaultCloud: VisionProviderConfig = {
      provider: "gemini",
      model: selectedVisionModel,
      apiKey: geminiApiKey,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      fallback: localFallback,
    };

    return {
      planning: {
        provider: isLocal ? "ui-tars" : "gemini",
        model: selectedVisionModel,
        apiKey: isLocal ? undefined : geminiApiKey,
        baseUrl: isLocal
          ? CORTEX_URL
          : "https://generativelanguage.googleapis.com/v1beta",
        fallback: defaultCloud,
      },
      insight: {
        provider: isLocal ? "ui-tars" : "gemini",
        model: selectedVisionModel,
        apiKey: isLocal ? undefined : geminiApiKey,
        baseUrl: isLocal
          ? CORTEX_URL
          : "https://generativelanguage.googleapis.com/v1beta",
        fallback: defaultCloud,
      },
      action: {
        provider: isLocal ? "ui-tars" : "gemini",
        model: selectedVisionModel,
        apiKey: isLocal ? undefined : geminiApiKey,
        baseUrl: isLocal
          ? CORTEX_URL
          : "https://generativelanguage.googleapis.com/v1beta",
        fallback: defaultCloud,
      },
    };
  }

  public detectIntent(instruction: string): VisionIntent {
    const lower = instruction.toLowerCase();
    if (
      ["fill", "form", "multi-step", "process"].some((p) => lower.includes(p))
    )
      return "planning";
    if (
      ["extract", "get", "find", "count", "summarize"].some((p) =>
        lower.includes(p),
      )
    )
      return "insight";
    return "action";
  }

  public async analyze(
    screenshot: string,
    instruction: string,
    explicitIntent?: VisionIntent,
  ): Promise<VisionResult> {
    const intent = explicitIntent || this.detectIntent(instruction);
    const config = this.config[intent];

    try {
      return await this.executeWithModel(
        config,
        screenshot,
        instruction,
        intent,
      );
    } catch (error) {
      if (config.fallback)
        return await this.executeWithModel(
          config.fallback,
          screenshot,
          instruction,
          intent,
        );
      throw error;
    }
  }

  private async executeWithModel(
    config: VisionProviderConfig,
    screenshot: string,
    instruction: string,
    intent: VisionIntent,
  ): Promise<VisionResult> {
    const prompt = this.buildPrompt(instruction, intent);

    if (config.provider === "gemini") {
      const apiKey = config.apiKey || (process.env as any).GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "Gemini API key missing for vision analysis. Please configure in settings.",
        );
      }

      const resp = await fetch(
        `${config.baseUrl}/models/${config.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: "image/png",
                      data: screenshot.replace(/^data:image\/\w+;base64,/, ""),
                    },
                  },
                ],
              },
            ],
          }),
        },
      );
      const data = await resp.json();
      return {
        prediction: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
        model: config.model,
        intent,
      };
    }

    // UI-TARS implementation
    if (config.provider === "ui-tars") {
      const resp = await fetch(`${config.baseUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshot, instruction }),
      });
      const data = await resp.json();
      return {
        prediction: data.prediction,
        model: "ui-tars",
        intent: "action",
      };
    }

    // NEW: Ollama (Local Vision Fallback)
    if (config.provider as string === "ollama") {
      const { ollamaUrl } = await import("../config/api");
      const model = config.model || "moondream"; // Default to moondream for speed
      
      try {
        const resp = await fetch(ollamaUrl("/api/generate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            images: [screenshot.replace(/^data:image\/\w+;base64,/, "")],
            stream: false,
            format: "json"
          }),
        });

        if (!resp.ok) {
           const errText = await resp.text();
           if (errText.includes("not found") || resp.status === 404) {
               throw new Error(`Local model '${model}' is missing. Would you like me to install it now? (Reply: 'pull moondream')`);
           }
           throw new Error(`Ollama API error: ${resp.statusText}`);
        }
        
        const data = await resp.json();
        return {
          prediction: data.response,
          model: `ollama/${model}`,
          intent,
        };
      } catch (e: any) {
          if (e.message.includes("fetch") || e.message.includes("Failed to fetch") || e.code === "ECONNREFUSED") {
              throw new Error("Ollama service is not running. Please start Ollama for offline vision fallback.");
          }
          throw e;
      }
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  private buildPrompt(instruction: string, intent: VisionIntent): string {
    if (intent === "insight")
      return `Extract info from screenshot: ${instruction}. Return JSON.`;
    if (intent === "planning") return `Plan steps for: ${instruction}.`;
    return instruction;
  }

  public updateConfig(newConfig: Partial<VisionManagerConfig>): void {
    this.config = { ...this.config, ...newConfig } as VisionManagerConfig;
  }
}

export const visionManager = new VisionManager();
