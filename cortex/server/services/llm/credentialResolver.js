/**
 * 🔑 Credential Resolver — the core's single source of provider API keys.
 *
 * Moved out of tradingDebateService as part of RFC-0006 Stage 2: a feature
 * service should ask the provider layer for a completion, not resolve vendor
 * credentials itself.
 *
 * Secure Vault first, environment second. Returns null when neither has a key;
 * callers fail closed on null rather than falling back to an unauthenticated
 * call.
 */

import secureVault from '../secureVault.js';

const ENV_KEYS = {
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  xai: ['XAI_API_KEY', 'GROK_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY']
};

/**
 * Vault keys, where the settings field is not `${provider}ApiKey`.
 *
 * A vault key is the renderer's settings path, not a lowercase provider id, and
 * the two are only accidentally the same. The Settings field is
 * `brain.openRouterApiKey` with a capital R, so the derived key below would look
 * for `setting:brain:openrouterApiKey` and miss a key the user really did save.
 * Spelled out rather than case-munged: a rule inferred from two examples is a
 * rule the next provider breaks silently.
 */
const VAULT_KEYS = {
  openrouter: 'setting:brain:openRouterApiKey'
};

/**
 * Fetch an API key for a provider from the Secure Vault, with an env fallback.
 */
export async function getApiKey(provider) {
  const vaultKey = VAULT_KEYS[provider] ?? `setting:brain:${provider}ApiKey`;
  try {
    const secured = await secureVault.retrieve(vaultKey);
    // vault.retrieve returns the raw value if stored as a string, or an object if JSON
    if (secured) {
      const val = typeof secured === 'object' ? secured.password || secured.apiKey || secured.value : secured;
      if (val && val !== '[SECURED]') return val;
    }
  } catch (e) {
    console.debug(`[CredentialResolver] Vault lookup failed for ${provider}:`, e.message);
  }

  const envKeys = ENV_KEYS[provider] || [];
  for (const key of envKeys) {
    if (process.env[key]) return process.env[key];
  }

  return null;
}

export default { getApiKey };
