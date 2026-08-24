export const OPENAI_COMPATIBLE_ENDPOINTS = {
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  mistral: "https://api.mistral.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export const OPENAI_COMPATIBLE_LOCAL_ENDPOINTS = {
  cortex: { variable: "CORTEX_URL", fallback: "http://localhost:8000/v1" },
  ollama: { variable: "OLLAMA_URL", fallback: "http://localhost:11434/v1" },
};

/**
 * Providers whose vendor name appears *inside* a model id, so the id alone is
 * enough to pick them (`mistral-large-latest` → mistral).
 *
 * OpenRouter is deliberately absent. It is a router, not a vendor: its ids name
 * the vendor it forwards to (`anthropic/claude-3.5-sonnet`), so matching by
 * substring would resolve every one of them to the wrong provider. Reaching it
 * is an explicit choice, spelled with an `openrouter/` prefix the gateway checks
 * before this heuristic ever runs.
 */
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

/**
 * The vendor named inside a model id, or `null` when the id names none of them.
 *
 * This used to answer `deepseek` for an unrecognised id — a guess dressed as an
 * answer. The gateway took it at face value, resolved DeepSeek's credential and
 * pointed the call at `api.deepseek.com`. "I cannot tell which vendor this is"
 * and "this is DeepSeek" are different answers, and only one of them is safe to
 * invent, so the caller now decides what to do about not knowing.
 */
export function resolveOpenAICompatibleAlias(modelId = "") {
  return (
    OPENAI_COMPATIBLE_ALIASES.find((alias) => modelId.includes(alias)) ?? null
  );
}
