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
    brain: "gemini-2.0-flash",
    vision: "gemini-2.0-flash",
    voice: "gemini-2.0-flash", // Using stable model for voice
    memory: "gemini-2.0-flash", // Used for long-term memory distillation
    embedding: "text-embedding-004", // Canonical cloud model
  },

  // Managed Cloud Discovery (Stable mapping for UI Labels)
  providers: {
    gemini: {
      name: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      models: {
        "2.5-pro":      "gemini-2.5-pro",           // Most capable (reasoning)
        "2.5-flash":    "gemini-2.5-flash",          // Fast + smart (recommended)
        "2.0-flash":    "gemini-2.0-flash",          // Luca Prime default (stable)
        "2.0-flash-exp": "gemini-2.0-flash-exp",    // Experimental
      },
    },
    anthropic: {
      name: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      models: {
        "sonnet-4.5": "claude-4.5-sonnet",
        "sonnet-4.5-thinking": "claude-4.5-sonnet-thinking",
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
