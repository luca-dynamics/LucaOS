export const OPENAI_GPT_5_6_MODELS = [
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    description: "OpenAI's flagship model for complex reasoning and agentic work.",
    tier: "performance",
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    description: "Balanced intelligence, latency, and cost for everyday work.",
    tier: "balanced",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    description: "Fast, cost-efficient intelligence for high-volume tasks.",
    tier: "fast",
  },
] as const;

export const OPENAI_GPT_5_6_MODEL_IDS = OPENAI_GPT_5_6_MODELS.map(
  (model) => model.id,
);

export const OPENAI_MODEL_PRESETS = {
  performance: "gpt-5.6-sol",
  balanced: "gpt-5.6-terra",
  fast: "gpt-5.6-luna",
} as const;

export const ANTHROPIC_CLAUDE_MODELS = [
  {
    id: "claude-fable-5",
    name: "Claude Fable 5",
    description: "Anthropic's highest-capability public model for long-running agents.",
    tier: "performance",
  },
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    description: "Premium model for complex agentic coding and enterprise work.",
    tier: "advanced",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    description: "Balanced speed and intelligence for everyday work.",
    tier: "balanced",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    description: "Fast Claude model for lightweight, high-volume tasks.",
    tier: "fast",
  },
] as const;

export const ANTHROPIC_CLAUDE_MODEL_IDS = ANTHROPIC_CLAUDE_MODELS.map(
  (model) => model.id,
);

export const ANTHROPIC_MODEL_PRESETS = {
  performance: "claude-fable-5",
  balanced: "claude-sonnet-5",
  fast: "claude-haiku-4-5-20251001",
} as const;

export const GEMINI_MODELS = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "Google's latest fast multimodal model for everyday work.",
    tier: "balanced",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    description: "Google's advanced preview model for complex reasoning.",
    tier: "performance",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    description: "Efficient Gemini for fast, high-volume tasks.",
    tier: "fast",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    description: "Current Luca Prime managed preview model.",
    tier: "balanced",
  },
] as const;

export const GEMINI_MODEL_IDS = GEMINI_MODELS.map((model) => model.id);

export const GEMINI_MODEL_PRESETS = {
  performance: "gemini-3.1-pro-preview",
  balanced: "gemini-3.5-flash",
  fast: "gemini-3.1-flash-lite",
} as const;

export const XAI_GROK_MODELS = [
  {
    id: "grok-4.5",
    name: "Grok 4.5",
    description: "xAI's frontier model for coding, agents, and knowledge work.",
    tier: "performance",
  },
] as const;

export const XAI_GROK_MODEL_IDS = XAI_GROK_MODELS.map((model) => model.id);

export const XAI_MODEL_PRESETS = {
  performance: "grok-4.5",
  balanced: "grok-4.5",
  fast: "grok-4.5",
} as const;

export const DEEPSEEK_MODELS = [
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "DeepSeek's highest-capability model with thinking and tools.",
    tier: "performance",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    description: "Fast DeepSeek V4 model with thinking and tool calls.",
    tier: "balanced",
  },
] as const;

export const DEEPSEEK_MODEL_IDS = DEEPSEEK_MODELS.map((model) => model.id);

export const DEEPSEEK_MODEL_PRESETS = {
  performance: "deepseek-v4-pro",
  balanced: "deepseek-v4-flash",
  fast: "deepseek-v4-flash",
} as const;

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
        "3.5-flash": "gemini-3.5-flash",
        "3.1-pro-preview": "gemini-3.1-pro-preview",
        "3.1-flash-lite": "gemini-3.1-flash-lite",
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
        "fable-5": "claude-fable-5",
        "opus-4.8": "claude-opus-4-8",
        "sonnet-5": "claude-sonnet-5",
        "haiku-4.5": "claude-haiku-4-5-20251001",
      },
    },
    openai: {
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      models: {
        "gpt-5.6-sol": "gpt-5.6-sol",
        "gpt-5.6-terra": "gpt-5.6-terra",
        "gpt-5.6-luna": "gpt-5.6-luna",
        "gpt-4o": "gpt-4o",
        "o1-preview": "o1-preview",
      },
    },
    xai: {
      name: "xAI (Grok)",
      baseUrl: "https://api.x.ai/v1",
      models: {
        "grok-4.5": "grok-4.5",
        "grok-2": "grok-2-1212",
      },
    },
    deepseek: {
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      models: {
        "v4-pro": "deepseek-v4-pro",
        "v4-flash": "deepseek-v4-flash",
        chat: "deepseek-chat",
        reasoner: "deepseek-reasoner",
      },
    },
    openrouter: {
      name: "OpenRouter (Omni)",
      baseUrl: "https://openrouter.ai/api/v1",
      models: {
        "auto": "openrouter/auto",
        "hermes-3": "nousresearch/hermes-3-llama-3.1-405b",
        "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
        "sonnet-3.5": "anthropic/claude-3.5-sonnet",
      },
    },
    groq: {
      name: "Groq (Speed)",
      baseUrl: "https://api.groq.com/openai/v1",
      models: {
        "llama3-70b": "llama3-70b-8192",
        "mixtral-8x7b": "mixtral-8x7b-32768",
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
