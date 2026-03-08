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
    brain: "gemini-2.5-flash", // Default for chat and reasoning
    vision: "gemini-2.5-flash", // Default for visual understanding
    voice: "models/gemini-2.5-flash-native-audio-latest", // Default for Live audio (Live API requires models/ prefix)
    memory: "mxbai-embed-xsmall", // Default for local memory indexing
    embedding: "mxbai-embed-xsmall", // Default for local vector indexing
  },

  // Managed Cloud Discovery (Stable mapping for UI Labels)
  providers: {
    gemini: {
      name: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      models: {
        "3.1-pro-high": "gemini-3.1-pro-high",
        "3.1-pro-low": "gemini-3.1-pro-low",
        "3-pro-high": "gemini-3-pro-high",
        "3-pro-low": "gemini-3-pro-low",
        "3-flash": "gemini-3-flash",
      },
    },
    anthropic: {
      name: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      models: {
        "sonnet-4.5": "claude-4.5-sonnet",
        "sonnet-4.5-thinking": "claude-4.5-sonnet-thinking",
        "sonnet-4.6-thinking": "claude-4.6-sonnet-thinking",
        "opus-4.6-thinking": "claude-4.6-opus-thinking",
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
