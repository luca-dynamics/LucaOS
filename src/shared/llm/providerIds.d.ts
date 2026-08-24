/**
 * Types for `providerIds.js`. Hand-written per ADR-0017: the module stays plain
 * `.js` so both processes import it with no build step, and this file is what
 * makes it strongly typed at every TypeScript call site.
 */

/** A provider Luca stores a model credential for. */
export type ModelCredentialProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "xai"
  | "deepseek"
  | "groq"
  | "mistral"
  | "openrouter";

/** A provider Luca stores a voice credential for. Not a model provider. */
export type VoiceCredentialProviderId = "deepgram" | "google";

/** Any provider with a stored credential. Every key of `PROVIDER_CREDENTIALS`. */
export type ProviderCredentialId =
  | ModelCredentialProviderId
  | VoiceCredentialProviderId;

/** A provider that runs models on this machine and needs no credential. */
export type KeylessProviderId = "cortex" | "ollama";

/**
 * Every provider identity the core can route a model to.
 *
 * `openai-compat` is deliberately not a member — see
 * `OPENAI_COMPATIBLE_BUCKET_ID`.
 */
export type CanonicalProviderId = ModelCredentialProviderId | KeylessProviderId;

/** Where a credential lives in Settings, which is also its Secure Vault key. */
export interface ProviderSettingsPath {
  readonly section: string;
  readonly key: string;
}

export interface ProviderCredentialEntry {
  readonly kind: "model" | "voice";
  readonly settings: ProviderSettingsPath;
  /** Environment names in precedence order, as a `.env` file spells them. */
  readonly env: readonly string[];
  /** Bundle-only spellings, checked before `env` in the renderer. */
  readonly rendererEnv: readonly string[];
}

export declare const PROVIDER_CREDENTIALS: Readonly<
  Record<ProviderCredentialId, ProviderCredentialEntry>
>;

export declare const KEYLESS_PROVIDER_IDS: readonly KeylessProviderId[];

export declare const CANONICAL_PROVIDER_IDS: readonly CanonicalProviderId[];

export declare const OPENAI_COMPATIBLE_BUCKET_ID: "openai-compat";

/**
 * The Secure Vault key for a provider.
 *
 * Overloaded rather than always `string | null`: a known id always has a key, and
 * making every call site null-check a total lookup is noise. The `string` arm
 * exists for the core, which resolves an id at runtime from a model string.
 */
export declare function getProviderVaultKey(
  provider: ProviderCredentialId,
): string;
export declare function getProviderVaultKey(provider: string): string | null;

export interface ProviderEnvNameOptions {
  /** `'core'` reads a real environment; `'renderer'` also tries `VITE_` names. */
  readonly surface?: "core" | "renderer";
}

export declare function getProviderEnvNames(
  provider: string,
  options?: ProviderEnvNameOptions,
): string[];

export declare function isKeylessProvider(provider: string): boolean;

declare const providerIds: {
  readonly PROVIDER_CREDENTIALS: typeof PROVIDER_CREDENTIALS;
  readonly KEYLESS_PROVIDER_IDS: typeof KEYLESS_PROVIDER_IDS;
  readonly CANONICAL_PROVIDER_IDS: typeof CANONICAL_PROVIDER_IDS;
  readonly OPENAI_COMPATIBLE_BUCKET_ID: typeof OPENAI_COMPATIBLE_BUCKET_ID;
  readonly getProviderVaultKey: typeof getProviderVaultKey;
  readonly getProviderEnvNames: typeof getProviderEnvNames;
  readonly isKeylessProvider: typeof isKeylessProvider;
};

export default providerIds;
