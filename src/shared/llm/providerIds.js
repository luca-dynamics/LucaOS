/**
 * 🪪 Provider identities — one table, read by both processes.
 *
 * Before this file, five vocabularies described the same providers and none of
 * them agreed:
 *
 *   1. `cortex/server/services/llm/llmGateway.js`  — routing ids
 *   2. `cortex/server/services/llm/credentialResolver.js` — a 6-entry subset
 *   3. `src/types/modelRouting.ts`                 — 13 `ModelProviderKind`s
 *   4. `src/services/models/ProviderKeyService.ts` — 9 `ProviderKeyName`s
 *   5. `src/model-router/providerHubRegistry.ts`   — 18 snake_case display ids
 *
 * The divergence was not cosmetic. `credentialResolver` derived its vault key as
 * `setting:brain:${provider}ApiKey` and needed a hand-written override the moment
 * a field was spelled `openRouterApiKey`; it had no `groq` environment name at all,
 * so a `GROQ_API_KEY` the renderer read was invisible to the core. Two lists that
 * must agree, kept in two files, disagree.
 *
 * So: one row per provider, and everything else derived from it.
 *
 * Deliberately absent, because this file must stay importable from the renderer,
 * the core and a web build alike (Invariant 4, and `vendorSdkBoundary.test.ts`
 * asserts it):
 *
 * - **No environment reads.** This table names environment variables; it never
 *   looks one up. A Node process environment does not exist in the browser, and
 *   Vite's build-time equivalent does not exist in Node, so a module that touched
 *   either would stop being shared. (The guard is a substring check over this
 *   whole file, comments included — which is why neither name is spelled here.)
 * - **No vendor SDK, no endpoint.** Endpoints live in `openaiEndpoints.js` next
 *   door; its keys are canonical ids from this table, which `providerIds.test.ts`
 *   checks.
 *
 * @see ADR-0017 — shared provider wire modules are plain `.js` with a hand-written
 *      `.d.ts`, so both processes import the same file with no build step.
 */

/**
 * Every provider whose credential Luca stores, and where each one lives.
 *
 * - `settings` — the Settings field, which is also the Secure Vault key: the vault
 *   is keyed by settings path (`setting:<section>:<key>`), not by provider id. The
 *   two are only accidentally alike, which is exactly what the deleted
 *   `VAULT_KEYS` override was patching over.
 * - `env` — environment names, in precedence order, as a `.env` file spells them.
 *   Read by the core.
 * - `rendererEnv` — the `VITE_`-prefixed and legacy spellings that only exist in
 *   the renderer's bundle, checked *before* `env` there. Vite only exposes
 *   `VITE_`-prefixed variables to client code, so these cannot be folded into
 *   `env`; and `API_KEY` is Luca's original pre-multi-provider Gemini name, kept
 *   because a long-standing install still has it set.
 *
 * Frozen at the top level: a provider is not something to add at runtime. The
 * entries and arrays are `readonly` in the `.d.ts` rather than deep-frozen, which
 * matches `OPENAI_COMPATIBLE_PROVIDERS` in the gateway.
 */
export const PROVIDER_CREDENTIALS = Object.freeze({
  gemini: {
    kind: 'model',
    settings: { section: 'brain', key: 'geminiApiKey' },
    env: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    rendererEnv: ['VITE_API_KEY', 'VITE_GEMINI_API_KEY', 'API_KEY'],
  },
  openai: {
    kind: 'model',
    settings: { section: 'brain', key: 'openaiApiKey' },
    env: ['OPENAI_API_KEY'],
    rendererEnv: ['VITE_OPENAI_API_KEY'],
  },
  anthropic: {
    kind: 'model',
    settings: { section: 'brain', key: 'anthropicApiKey' },
    env: ['ANTHROPIC_API_KEY'],
    rendererEnv: ['VITE_ANTHROPIC_API_KEY'],
  },
  xai: {
    kind: 'model',
    settings: { section: 'brain', key: 'xaiApiKey' },
    env: ['XAI_API_KEY', 'GROK_API_KEY'],
    rendererEnv: ['VITE_XAI_API_KEY'],
  },
  deepseek: {
    kind: 'model',
    settings: { section: 'brain', key: 'deepseekApiKey' },
    env: ['DEEPSEEK_API_KEY'],
    rendererEnv: ['VITE_DEEPSEEK_API_KEY'],
  },
  groq: {
    kind: 'model',
    settings: { section: 'brain', key: 'groqApiKey' },
    env: ['GROQ_API_KEY'],
    rendererEnv: ['VITE_GROQ_API_KEY'],
  },
  // No `brain.mistralApiKey` field exists yet, so nothing writes this vault key
  // and `MISTRAL_API_KEY` is the only source today. Declared anyway: the core
  // routes Mistral model ids (`llmGateway.detectProvider`) and the hub lists
  // Mistral as requiring a user key, so the resolver must be able to find one.
  // `providerIds.test.ts` asserts this is the *only* such gap, so adding the
  // Settings field is all that closing it takes.
  mistral: {
    kind: 'model',
    settings: { section: 'brain', key: 'mistralApiKey' },
    env: ['MISTRAL_API_KEY'],
    rendererEnv: ['VITE_MISTRAL_API_KEY'],
  },
  // The capital R is the whole reason this table exists.
  openrouter: {
    kind: 'model',
    settings: { section: 'brain', key: 'openRouterApiKey' },
    env: ['OPENROUTER_API_KEY'],
    rendererEnv: ['VITE_OPENROUTER_API_KEY'],
  },
  deepgram: {
    kind: 'voice',
    settings: { section: 'voice', key: 'deepgramApiKey' },
    env: ['DEEPGRAM_API_KEY'],
    rendererEnv: ['VITE_DEEPGRAM_API_KEY'],
  },
  // Voice, not Gemini — `voice.googleApiKey`. It shares `GOOGLE_API_KEY` with
  // gemini's fallback above, which is a pre-existing ambiguity in the environment
  // and not something this table introduces.
  google: {
    kind: 'voice',
    settings: { section: 'voice', key: 'googleApiKey' },
    env: ['GOOGLE_API_KEY'],
    rendererEnv: ['VITE_GOOGLE_API_KEY'],
  },
});

/**
 * Providers that need no credential: the model runs on this machine.
 *
 * They are canonical providers — the gateway routes to them — but they own no
 * secret, so they are listed here instead of being a row with a null settings
 * path. "No key" is a stated property, not a missing field.
 */
export const KEYLESS_PROVIDER_IDS = Object.freeze(['cortex', 'ollama']);

/**
 * Every provider identity the core can route a model to.
 *
 * Note what is *not* here: `openai-compat`. That is a routing bucket
 * `detectProvider` returns for vendors the core reaches over the OpenAI wire; it
 * resolves to one of the ids below via the alias in the model id, and it never
 * owns a credential of its own. `OPENAI_COMPATIBLE_BUCKET_ID` names it so callers
 * can be explicit about the distinction.
 */
export const CANONICAL_PROVIDER_IDS = Object.freeze([
  ...Object.keys(PROVIDER_CREDENTIALS).filter(
    (id) => PROVIDER_CREDENTIALS[id].kind === 'model',
  ),
  ...KEYLESS_PROVIDER_IDS,
]);

/** The routing bucket that resolves to a canonical id rather than being one. */
export const OPENAI_COMPATIBLE_BUCKET_ID = 'openai-compat';

/**
 * The Secure Vault key for a provider, or null if the id is not one we store a
 * credential for.
 *
 * Null rather than a guessed key: deriving `setting:brain:${provider}ApiKey` for
 * an unknown id is what produced a lookup for `setting:brain:openrouterApiKey`
 * while the user's key sat under `openRouterApiKey`.
 */
export function getProviderVaultKey(provider) {
  const entry = PROVIDER_CREDENTIALS[provider];
  if (!entry) return null;
  return `setting:${entry.settings.section}:${entry.settings.key}`;
}

/**
 * Environment variable names to try for a provider, in precedence order.
 *
 * `surface: 'renderer'` prepends the bundle-only spellings; the default is the
 * core's view. Returns an empty array for an unknown id — callers decide what to
 * do about that, and the resolver says so out loud.
 */
export function getProviderEnvNames(provider, { surface = 'core' } = {}) {
  const entry = PROVIDER_CREDENTIALS[provider];
  if (!entry) return [];
  return surface === 'renderer' ? [...entry.rendererEnv, ...entry.env] : [...entry.env];
}

/** Whether the core can route to this provider without any credential. */
export function isKeylessProvider(provider) {
  return KEYLESS_PROVIDER_IDS.includes(provider);
}

export default {
  PROVIDER_CREDENTIALS,
  KEYLESS_PROVIDER_IDS,
  CANONICAL_PROVIDER_IDS,
  OPENAI_COMPATIBLE_BUCKET_ID,
  getProviderVaultKey,
  getProviderEnvNames,
  isKeylessProvider,
};
