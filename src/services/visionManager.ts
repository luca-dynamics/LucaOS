import { CORTEX_URL } from "../config/api";
import { settingsService } from "./settingsService";
import { BRAIN_CONFIG } from "../config/brain.config";

export type VisionIntent = "planning" | "insight" | "action";

export interface VisionProviderConfig {
  provider: "gemini" | "ui-tars" | "openai" | "claude";
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

    // Industrial Vision Routing:
    // We prioritize the specific vision model setting.
    // If it's a local model (e.g. ui-tars), we use CORTEX_URL.
    const selectedVisionModel =
      brain.visionModel || brain.model || BRAIN_CONFIG.defaults.vision;
    const isLocal = settingsService.isModelLocal(selectedVisionModel);

    const defaultCloud: VisionProviderConfig = {
      provider: "gemini",
      model: selectedVisionModel,
      apiKey: geminiApiKey,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    };

    return {
      planning: {
        provider: "gemini",
        model: selectedVisionModel, // Respecting user selection for planning too
        apiKey: geminiApiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        fallback: defaultCloud,
      },
      insight: {
        provider: "gemini",
        model: selectedVisionModel, // Respecting user selection for insight too
        apiKey: geminiApiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
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
