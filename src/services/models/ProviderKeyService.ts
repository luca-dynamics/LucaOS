import { secureVault } from "../secureVault";
import {
  hasUsableSecret,
  isRedactedSecret,
  type ModelProviderKind,
} from "../../types/modelRouting";
import {
  PROVIDER_CREDENTIALS,
  getProviderEnvNames,
  getProviderVaultKey,
  type ProviderCredentialId,
} from "../../shared/llm/providerIds.js";

/**
 * The providers this service resolves a key for.
 *
 * A subset of `ProviderCredentialId`, and `satisfies` proves it: every name here
 * has a row in the shared table, so a typo cannot compile. The table also carries
 * `mistral`, which the core routes to but which has no Settings field for the
 * renderer to read yet.
 *
 * The settings paths and environment names themselves come from that table — this
 * file used to declare its own copies, and the core declared a third set that
 * disagreed with both.
 */
export const PROVIDER_KEY_NAMES = [
  "gemini",
  "openai",
  "anthropic",
  "groq",
  "deepseek",
  "xai",
  "openrouter",
  "deepgram",
  "google",
] as const satisfies readonly ProviderCredentialId[];

export type ProviderKeyName = (typeof PROVIDER_KEY_NAMES)[number];

export interface ProviderKeyState {
  provider: ProviderKeyName;
  hasKey: boolean;
  source: "vault" | "settings" | "environment" | "none";
  redactedDisplay: string;
}

function readEnv(names: readonly string[]): string {
  for (const name of names) {
    const viteValue =
      typeof import.meta !== "undefined"
        ? (import.meta as any).env?.[name]
        : undefined;
    if (hasUsableSecret(viteValue)) return viteValue;
    const processValue =
      typeof process !== "undefined" ? process.env?.[name] : undefined;
    if (hasUsableSecret(processValue)) return processValue;
    const windowValue =
      typeof window !== "undefined"
        ? (window as any).__ENV__?.[name]
        : undefined;
    if (hasUsableSecret(windowValue)) return windowValue;
  }
  return "";
}

export function providerKindToKeyName(
  provider: ModelProviderKind,
): ProviderKeyName | null {
  // Luca Prime is Gemini-backed today. That is an implementation detail the rest
  // of the app must not learn, which is why the mapping lives here and not in a
  // caller.
  if (provider === "luca-prime") return "gemini";
  if ((PROVIDER_KEY_NAMES as readonly string[]).includes(provider)) {
    return provider as ProviderKeyName;
  }
  return null;
}

export function getVaultKey(provider: ProviderKeyName): string {
  return getProviderVaultKey(provider);
}

export function getPlainSettingsKey(
  settings: any,
  provider: ProviderKeyName,
): string {
  const path = PROVIDER_CREDENTIALS[provider].settings;
  return settings?.[path.section]?.[path.key] || "";
}

export async function getProviderKeyState(
  provider: ProviderKeyName,
  settings: any,
  options: { allowEnvironmentFallback?: boolean } = {},
): Promise<ProviderKeyState> {
  const settingsValue = getPlainSettingsKey(settings, provider);
  if (hasUsableSecret(settingsValue)) {
    return {
      provider,
      hasKey: true,
      source: "settings",
      redactedDisplay: redactSecret(settingsValue),
    };
  }

  const vaultKey = getVaultKey(provider);
  try {
    const secured = await secureVault.retrieve(vaultKey);
    if (secured?.success && hasUsableSecret(secured.password)) {
      return {
        provider,
        hasKey: true,
        source: "vault",
        redactedDisplay: redactSecret(secured.password),
      };
    }
  } catch (error) {
    console.warn(
      `[ProviderKeyService] Vault lookup failed for ${provider}`,
      error,
    );
  }

  if (isRedactedSecret(settingsValue)) {
    return { provider, hasKey: false, source: "none", redactedDisplay: "" };
  }

  if (options.allowEnvironmentFallback) {
    const envValue = readEnv(
      getProviderEnvNames(provider, { surface: "renderer" }),
    );
    if (hasUsableSecret(envValue)) {
      return {
        provider,
        hasKey: true,
        source: "environment",
        redactedDisplay: redactSecret(envValue),
      };
    }
  }

  return { provider, hasKey: false, source: "none", redactedDisplay: "" };
}

export async function getProviderApiKey(
  provider: ProviderKeyName,
  settings: any,
  options: { allowEnvironmentFallback?: boolean } = {},
): Promise<string> {
  const { credentialPoolService } = await import("../credentialPoolService");

  // Sync pool from settings if present
  const poolKeys = settings?.brain?.credentialPools?.[provider as string];
  if (Array.isArray(poolKeys) && poolKeys.length > 0) {
    credentialPoolService.registerPool(provider, poolKeys);
  }

  let rawKey = getPlainSettingsKey(settings, provider);
  if (!hasUsableSecret(rawKey)) {
    try {
      const secured = await secureVault.retrieve(getVaultKey(provider));
      if (secured?.success && hasUsableSecret(secured.password)) {
        rawKey = secured.password;
      }
    } catch (error) {
      console.warn(
        `[ProviderKeyService] Vault key retrieval failed for ${provider}`,
        error,
      );
    }
  }

  if (!hasUsableSecret(rawKey) && options.allowEnvironmentFallback) {
    rawKey = readEnv(getProviderEnvNames(provider, { surface: "renderer" }));
  }

  return credentialPoolService.getActiveKey(provider, rawKey) || rawKey || "";
}

export function redactSecret(value: string): string {
  if (!hasUsableSecret(value)) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}
