/**
 * 🔑 Credential Resolver — the core's single source of provider API keys.
 *
 * Moved out of tradingDebateService as part of RFC-0006 Stage 2: a feature
 * service should ask the provider layer for a completion, not resolve vendor
 * credentials itself.
 *
 * Secure Vault first, environment second. Returns null when neither has a key;
 * callers fail closed on null rather than falling back to an unauthenticated
 * call — or, worse, to another vendor's key.
 *
 * Both lookups come from `src/shared/llm/providerIds.js`, the one table the
 * renderer reads too. This file used to keep its own pair of maps and derive the
 * vault key as `setting:brain:${provider}ApiKey`, which was wrong twice over: it
 * needed a hand-written override the moment a Settings field was spelled
 * `openRouterApiKey`, and its environment list had no `groq` or `mistral` entry,
 * so a `GROQ_API_KEY` the renderer could see was invisible here.
 */

import secureVault from '../secureVault.js';
import {
  getProviderEnvNames,
  getProviderVaultKey,
  isKeylessProvider
} from '../../../../src/shared/llm/providerIds.js';

/**
 * Fetch an API key for a provider from the Secure Vault, with an env fallback.
 *
 * Returns null for an unknown provider id, and says so: an id with no row in the
 * table has no vault key and no environment name, so silently returning null
 * would be indistinguishable from "the user has not set one yet".
 */
export async function getApiKey(provider) {
  const vaultKey = getProviderVaultKey(provider);

  if (!vaultKey) {
    if (!isKeylessProvider(provider)) {
      console.warn(
        `[CredentialResolver] '${provider}' has no entry in PROVIDER_CREDENTIALS; no key can resolve for it.`
      );
    }
    return null;
  }

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

  for (const key of getProviderEnvNames(provider)) {
    if (process.env[key]) return process.env[key];
  }

  return null;
}

export default { getApiKey };
