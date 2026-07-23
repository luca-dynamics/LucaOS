import { secureVault } from "../secureVault";
import {
  hasUsableSecret,
  isRedactedSecret,
  type ModelProviderKind,
} from "../../types/modelRouting";

export type ProviderKeyName =
  | "gemini"
  | "openai"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "xai"
  | "openrouter"
  | "deepgram"
  | "google";

export interface ProviderKeyState {
  provider: ProviderKeyName;
  hasKey: boolean;
  source: "vault" | "settings" | "environment" | "none";
  redactedDisplay: string;
}

const PROVIDER_SETTING_PATH: Record<
  ProviderKeyName,
  { section: string; key: string }
> = {
  gemini: { section: "brain", key: "geminiApiKey" },
  openai: { section: "brain", key: "openaiApiKey" },
  anthropic: { section: "brain", key: "anthropicApiKey" },
  groq: { section: "brain", key: "groqApiKey" },
  deepseek: { section: "brain", key: "deepseekApiKey" },
  xai: { section: "brain", key: "xaiApiKey" },
  openrouter: { section: "brain", key: "openRouterApiKey" },
  deepgram: { section: "voice", key: "deepgramApiKey" },
  google: { section: "voice", key: "googleApiKey" },
};

const ENV_NAMES: Record<ProviderKeyName, string[]> = {
  gemini: ["VITE_API_KEY", "VITE_GEMINI_API_KEY", "API_KEY", "GEMINI_API_KEY"],
  openai: ["VITE_OPENAI_API_KEY", "OPENAI_API_KEY"],
  anthropic: ["VITE_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY"],
  groq: ["VITE_GROQ_API_KEY", "GROQ_API_KEY"],
  deepseek: ["VITE_DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY"],
  xai: ["VITE_XAI_API_KEY", "XAI_API_KEY"],
  openrouter: ["VITE_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
  deepgram: ["VITE_DEEPGRAM_API_KEY", "DEEPGRAM_API_KEY"],
  google: ["VITE_GOOGLE_API_KEY", "GOOGLE_API_KEY"],
};

function readEnv(names: string[]): string {
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
  if (provider === "luca-prime") return "gemini";
  if (
    [
      "gemini",
      "openai",
      "anthropic",
      "groq",
      "deepseek",
      "xai",
      "openrouter",
      "deepgram",
      "google",
    ].includes(provider)
  ) {
    return provider as ProviderKeyName;
  }
  return null;
}

export function getVaultKey(provider: ProviderKeyName): string {
  const path = PROVIDER_SETTING_PATH[provider];
  return `setting:${path.section}:${path.key}`;
}

export function getPlainSettingsKey(
  settings: any,
  provider: ProviderKeyName,
): string {
  const path = PROVIDER_SETTING_PATH[provider];
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
    const envValue = readEnv(ENV_NAMES[provider]);
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
    rawKey = readEnv(ENV_NAMES[provider]);
  }

  return credentialPoolService.getActiveKey(provider, rawKey) || rawKey || "";
}

export function redactSecret(value: string): string {
  if (!hasUsableSecret(value)) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}
