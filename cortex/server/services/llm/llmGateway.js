/**
 * 🧭 LLM Gateway — the core's routing layer above the provider adapters.
 *
 * Feature services ask the gateway for a completion by model id; the gateway
 * decides which provider that id belongs to, resolves its credentials and
 * endpoint, and hands the call to an adapter. Nothing above this file branches
 * on vendor (Invariant 4).
 *
 * RFC-0006 Stage 2: every provider the core can call routes here — the
 * OpenAI-compatible family (Change 1) plus Gemini and Anthropic (Change 2), and
 * OpenRouter (Change 4), which reaches many vendors over the one wire the core
 * already speaks.
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
  'openrouter',
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
 * Returns: 'gemini' | 'openai' | 'anthropic' | 'xai' | 'deepseek' | 'openrouter'
 *        | 'cortex' | 'ollama' | 'openai-compat'
 */
export function detectProvider(modelId = '') {
  const m = modelId.toLowerCase();

  // 0. OpenRouter, by explicit prefix and ahead of everything else.
  //
  // OpenRouter ids name the vendor they forward to — 'anthropic/claude-3.5-sonnet',
  // 'google/gemini-2.0-flash' — so every branch below would claim them for that
  // vendor and call it directly with a key it does not have. Worse,
  // 'google/gemma-2b-it' contains a LOCAL_MODELS entry, so it would be posted to
  // the Cortex runtime on localhost:8000. Routing through a router is a choice the
  // caller spells out; it is never inferred from the id.
  if (m.startsWith('openrouter/')) return 'openrouter';

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
 *
 * `openrouter/` is anchored and only the first match is replaced, so the rest of
 * the id survives intact — 'openrouter/anthropic/claude-3.5-sonnet' becomes
 * 'anthropic/claude-3.5-sonnet', which is exactly the string OpenRouter expects
 * as `model`. `local/` stays unanchored, as it has always been.
 */
export function normalizeModelId(modelId = '') {
  return modelId.replace(/^(?:ollama:|openrouter\/)|local\//, '');
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

    case 'openrouter': {
      const apiKey = await getApiKey('openrouter');
      if (!apiKey) throw new Error('OpenRouter API key not found in settings');
      // OpenRouter's optional HTTP-Referer / X-Title attribution headers are
      // deliberately not sent: they affect a public leaderboard and nothing else,
      // and the adapter takes { apiKey, modelName, baseURL } with no header
      // channel. Adding one with no caller that needs it is speculative.
      return { apiKey, baseURL: resolveOpenAICompatibleEndpoint('openrouter', { env }) };
    }

    case 'openai-compat': {
      // Groq and Mistral have no case of their own: they arrive in this bucket and
      // the vendor named inside the model id is what picks between them.
      //
      // A null alias is unreachable through `detectProvider` today — it only sends
      // an id here when the id contains 'mistral' or 'groq', both of which are
      // aliases. It is guarded anyway because the two lists live in different
      // files and nothing but `providerIds.test.ts` makes them agree; adding a
      // vendor to one and not the other must not resolve to some other vendor's
      // endpoint.
      const alias = resolveOpenAICompatibleAlias(cleanModelId);
      if (!alias) {
        throw new Error(
          `[LLMGateway] Model '${cleanModelId}' routed to the OpenAI-compatible bucket but names no known vendor; refusing rather than guessing one.`
        );
      }

      // No cross-vendor fallback. This read
      // `await getApiKey(alias) || await getApiKey('openai')`, so a user with only
      // an OpenAI key who selected a Groq model had their OpenAI secret posted to
      // Groq's endpoint under a Groq baseURL. One vendor's credential is never
      // another's, and "no key" is the correct answer here, not "some key".
      const apiKey = await getApiKey(alias);
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
 * Whether the core can reach a model right now: does a credential resolve for
 * whatever provider this id routes to (Secure Vault first, then environment),
 * and is there an adapter behind it?
 *
 * Surfaces call this to report named unavailability *before* attempting work —
 * a vision route with no key configured should say so with guidance, not fail
 * mid-retry. Local providers need no credential and are always reachable.
 */
export async function canRouteModel(modelId) {
  try {
    await createAdapter(modelId);
    return true;
  } catch (error) {
    console.debug(
      `[LLMGateway] '${modelId}' is not routable: ${error.message}`
    );
    return false;
  }
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

/**
 * Full turn-shaped call for any routed model id: history, images, a system
 * instruction and tools in, Luca's internal response representation out.
 *
 * `maxTokens` is passed through as given rather than defaulted here, so each
 * adapter applies its own vendor rule — Anthropic requires a limit, Gemini
 * historically had none and must not gain one silently.
 */
export async function chat({
  modelId,
  messages,
  images,
  systemInstruction,
  tools,
  maxTokens
} = {}) {
  const adapter = await createAdapter(modelId);
  return adapter.chat({
    messages,
    images,
    systemInstruction,
    tools,
    ...(maxTokens === undefined ? {} : { maxTokens })
  });
}

export default {
  chat,
  completeText,
  canRouteModel,
  createAdapter,
  detectProvider,
  normalizeModelId,
  isOpenAICompatible,
  UnsupportedProviderError,
  OPENAI_COMPATIBLE_PROVIDERS
};
