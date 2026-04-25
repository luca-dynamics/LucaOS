/**
 * BRAIN CONFIGURATION
 *
 * Central source of truth for LUCA's intelligence defaults.
 * These are used during onboarding and as default settings before user customization.
 */

export const BRAIN_CONFIG = {
  // Default Provider (Gemini is the core engine)
  DEFAULT_PROVIDER: "gemini" as const,

  // Global Default Models (Stable IDs)
  defaults: {
    brain: "gemini-3-flash-preview",
    vision: "gemini-3-flash-preview",
    voice: "gemini-3-flash-preview", // 3.0 supports multimodal
    memory: "gemini-3-flash-preview", // High-speed distillation
    embedding: "gemini-embedding-001", // Verified 2026 stable name
  },

  // Managed Cloud Discovery (Stable mapping for UI Labels)
  providers: {
    gemini: {
      name: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      models: {
        "3.0-flash":    "gemini-3-flash-preview",        // NEW: High Fidelity Core
        "2.0-flash":    "gemini-2.0-flash",              // Stable Legacy
        "1.5-pro":      "gemini-1.5-pro",                // Reasoning
        "1.5-flash":    "gemini-1.5-flash",              // Logic
      },
    },
    anthropic: {
      name: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      models: {
        "opus-4.7": "claude-opus-4-7",             // Released April 2026
        "sonnet-4.6": "claude-sonnet-4-6",         // Released Feb 2026
        "sonnet-4.6-thought": "claude-4.6-thought", // Extended reasoning variant
      },
    },
    openai: {
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      models: {
        "gpt-4o": "gpt-4o",
        "o1-preview": "o1-preview",
      },
    },
    xai: {
      name: "xAI (Grok)",
      baseUrl: "https://api.x.ai/v1",
      models: {
        "grok-2": "grok-2-1212",
      },
    },
    deepseek: {
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      models: {
        "chat": "deepseek-chat",
        "reasoner": "deepseek-reasoner",
      },
    },
  },
};

/**
 * Generates the API endpoint for a given model and key.
 * Used primarily during onboarding when full services aren't initialized.
 */
export const getCloudEndpoint = (modelId: string, apiKey: string) => {
  return `${BRAIN_CONFIG.providers.gemini.baseUrl}/models/${modelId}:generateContent?key=${apiKey}`;
};
