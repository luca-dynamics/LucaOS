/**
 * 🧭 LLM Gateway — the core's routing layer above the provider adapters.
 *
 * Feature services ask the gateway for a completion by model id; the gateway
 * decides which provider that id belongs to, resolves its credentials and
 * endpoint, and hands the call to an adapter. Nothing above this file branches
 * on vendor (Invariant 4).
 *
 * RFC-0006 Stage 2: every provider the core can call routes here — the
 * OpenAI-compatible family (Change 1) plus Gemini and Anthropic (Change 2).
 */

import { getApiKey } from './credentialResolver.js';
import {
  OpenAICompatibleAdapter,
  DEFAULT_MAX_TOKENS
} from './openaiCompatibleAdapter.js';
import { GeminiAdapter } from './geminiAdapter.js';
import { AnthropicAdapter } from './anthropicAdapter.js';
import {
  resolveOpenAICompatibleAlias,
  resolveOpenAICompatibleEndpoint
} from '../../../../src/shared/llm/openaiEndpoints.js';

const LOCAL_MODELS = [
  "gemma-2b", "phi-3-mini", "llama-3.2-1b", "smollm2-1.7b",
  "qwen-2.5-7b", "deepseek-r1-distill-7b"
];

export const OPENAI_COMPATIBLE_PROVIDERS = Object.freeze([
  'openai',
  'xai',
  'deepseek',
  'cortex',
  'ollama',
  'openai-compat'
]);

/**
 * Raised when a model id resolves to a provider that has no adapter.
 * Fail closed and say why, rather than quietly answering with another vendor.
 */
export class UnsupportedProviderError extends Error {
  constructor(provider, modelId) {
    super(
      `[LLMGateway] Provider '${provider}' (model '${modelId}') has no adapter in the core provider layer.`
    );
    this.name = 'UnsupportedProviderError';
    this.provider = provider;
    this.modelId = modelId;
  }
}

/**
 * Detect which provider handles this modelId.
 * Returns: 'gemini' | 'openai' | 'anthropic' | 'xai' | 'deepseek' | 'cortex' | 'ollama' | 'openai-compat'
 */
export function detectProvider(modelId = '') {
  const m = modelId.toLowerCase();

  // 1. Local Luca / Cortex Models
  if (LOCAL_MODELS.some(lm => m.includes(lm)) || m.startsWith('local/')) return 'cortex';

  // 2. Cloud Providers
  if (m.includes('gemini') || m.includes('google'))   return 'gemini';
  if (m.includes('claude') || m.includes('anthropic')) return 'anthropic';
  if (m.includes('grok') || m.includes('xai'))         return 'xai';
  if (m.includes('deepseek'))                          return 'deepseek';
  if (m.startsWith('ollama:') || m.includes('ollama')) return 'ollama';

  // Mistral, Groq via OpenAI SDK
  if (m.includes('mistral') || m.includes('groq')) return 'openai-compat';

  // Default OpenAI
  if (m.startsWith('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3')) return 'openai';

  return 'gemini';
}

/**
 * Strip the routing prefixes a model id may carry before it reaches a vendor.
 */
export function normalizeModelId(modelId = '') {
  return modelId.replace(/^ollama:|local\//, '');
}

export function isOpenAICompatible(provider) {
  return OPENAI_COMPATIBLE_PROVIDERS.includes(provider);
}

/**
 * Resolve the credentials and endpoint an OpenAI-compatible provider needs.
 * Error strings are preserved from the pre-Stage-2 debate service so surfaces
 * reporting them do not change.
 */
async function resolveOpenAICompatibleTarget(provider, cleanModelId) {
  const env = process.env;

  switch (provider) {
    case 'cortex':
      // Local Luca Inference (Cortex) — OpenAI-compatible endpoint on Port 8000
      return {
        apiKey: 'luca-local',
        baseURL: resolveOpenAICompatibleEndpoint('cortex', { env })
      };

    case 'ollama':
      return {
        apiKey: 'ollama',
        baseURL: resolveOpenAICompatibleEndpoint('ollama', { env })
      };

    case 'xai': {
      const apiKey = await getApiKey('xai');
      if (!apiKey) throw new Error('X.AI (Grok) API key not found in settings');
      return { apiKey, baseURL: resolveOpenAICompatibleEndpoint('xai', { env }) };
    }

    case 'deepseek': {
      const apiKey = await getApiKey('deepseek');
      if (!apiKey) throw new Error('DeepSeek API key not found in settings');
      return { apiKey, baseURL: resolveOpenAICompatibleEndpoint('deepseek', { env }) };
    }

    case 'openai-compat': {
      const alias = resolveOpenAICompatibleAlias(cleanModelId);
      const apiKey = await getApiKey(alias) || await getApiKey('openai');
      if (!apiKey) throw new Error(`API key for ${alias} not found in settings`);
      return { apiKey, baseURL: resolveOpenAICompatibleEndpoint(alias, { env }) };
    }

    case 'openai':
    default: {
      const apiKey = await getApiKey('openai');
      if (!apiKey) throw new Error('OpenAI API key not found in settings');
      // No baseURL: the SDK's own default endpoint
      return { apiKey };
    }
  }
}

/**
 * Build an adapter for a model id. Throws UnsupportedProviderError if the id
 * resolves to a provider with no adapter behind it.
 */
export async function createAdapter(modelId) {
  const provider = detectProvider(modelId);
  const cleanModelId = normalizeModelId(modelId);

  if (provider === 'gemini') {
    const apiKey = await getApiKey('gemini');
    if (!apiKey) throw new Error('Gemini API key not found in settings or environment');
    return new GeminiAdapter({ apiKey, modelName: cleanModelId });
  }

  if (provider === 'anthropic') {
    const apiKey = await getApiKey('anthropic');
    if (!apiKey) throw new Error('Anthropic API key not found in settings');
    return new AnthropicAdapter({ apiKey, modelName: cleanModelId });
  }

  if (!isOpenAICompatible(provider)) {
    throw new UnsupportedProviderError(provider, modelId);
  }

  const target = await resolveOpenAICompatibleTarget(provider, cleanModelId);

  return new OpenAICompatibleAdapter({
    apiKey: target.apiKey,
    baseURL: target.baseURL,
    // 'openai' historically defaulted a blank id to gpt-4o; keep that
    modelName: provider === 'openai' ? cleanModelId || 'gpt-4o' : cleanModelId
  });
}

/**
 * Single-shot text completion for any routed model id.
 */
export async function completeText({
  modelId,
  prompt,
  maxTokens = DEFAULT_MAX_TOKENS
} = {}) {
  const adapter = await createAdapter(modelId);
  return adapter.completeText({ prompt, maxTokens });
}

export default {
  completeText,
  createAdapter,
  detectProvider,
  normalizeModelId,
  isOpenAICompatible,
  UnsupportedProviderError,
  OPENAI_COMPATIBLE_PROVIDERS
};
