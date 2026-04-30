import { CORTEX_URL } from "../config/constants.js";

// Types are removed in JS, but logic remains
export class VisionManager {
  constructor(config) {
    this.config = config || this.getDefaultConfig();
  }

  getDefaultConfig() {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    return {
      planning: {
        provider: "gemini",
        model: "gemini-2.0-flash-thinking-exp",
        apiKey: geminiApiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      },
      insight: {
        provider: "gemini",
        model: "gemini-2.0-flash",
        apiKey: geminiApiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      },
      action: {
        provider: "ui-tars",
        model: "ui-tars",
        baseUrl: CORTEX_URL || "http://localhost:3000", // Fallback if CORTEX_URL is not imported correctly
        fallback: {
          provider: "gemini",
          model: "gemini-2.0-flash",
          apiKey: geminiApiKey,
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        },
      },
    };
  }

  detectIntent(instruction) {
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

  async analyze(screenshot, instruction, explicitIntent) {
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

  async executeWithModel(config, screenshot, instruction, intent) {
    const prompt = this.buildPrompt(instruction, intent);

    if (config.provider === "gemini") {
      const resp = await fetch(
        `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
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

  buildPrompt(instruction, intent) {
    if (intent === "insight")
      return `Extract info from screenshot: ${instruction}. Return JSON.`;
    if (intent === "planning") return `Plan steps for: ${instruction}.`;
    return instruction;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

export const visionManager = new VisionManager();
export default visionManager;
