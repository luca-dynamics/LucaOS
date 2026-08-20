export const OPENAI_COMPATIBLE_ENDPOINTS = {
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  mistral: "https://api.mistral.ai/v1",
  groq: "https://api.groq.com/openai/v1",
};

export const OPENAI_COMPATIBLE_LOCAL_ENDPOINTS = {
  cortex: { variable: "CORTEX_URL", fallback: "http://localhost:8000/v1" },
  ollama: { variable: "OLLAMA_URL", fallback: "http://localhost:11434/v1" },
};

export const OPENAI_COMPATIBLE_ALIASES = ["deepseek", "mistral", "groq"];

export function resolveOpenAICompatibleEndpoint(providerId, options = {}) {
  const { env = {}, override } = options;
  if (override && override.trim().length > 0) return override;

  const local = OPENAI_COMPATIBLE_LOCAL_ENDPOINTS[providerId];
  if (local) {
    const configured = env[local.variable];
    return configured && configured.trim().length > 0
      ? configured
      : local.fallback;
  }

  return OPENAI_COMPATIBLE_ENDPOINTS[providerId];
}

export function resolveOpenAICompatibleAlias(modelId = "") {
  return (
    OPENAI_COMPATIBLE_ALIASES.find((alias) => modelId.includes(alias)) ??
    "deepseek"
  );
}
