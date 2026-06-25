export const WEB_ONBOARDING_KEY = "lucaos.web.onboardingComplete";
export const WEB_PROFILE_KEY = "lucaos.web.profile";
export const WEB_PREMIUM_PREFERENCES_KEY = "lucaos.web.premiumPreferences";

export interface WebProfile {
  name: string;
  interaction: "chat" | "voice";
  theme: "PROFESSIONAL" | "MASTER_SYSTEM" | "FROST" | "LIGHTCREAM";
  modelRoute: "cloud" | "byok" | "desktop-later";
  personality: "proactive" | "direct";
  backgroundOpacity: number;
  backgroundBlur: number;
}

/**
 * Additive store for the premium onboarding choices that have no field in the
 * legacy WebProfile (per docs/luca-premium-onboarding-productionization-plan.md,
 * P3). It is kept under its own key so the legacy profile shape stays intact and
 * no premium selection is silently dropped at completion.
 */
export interface WebPremiumPreferences {
  environment?: string;
  presence?: string;
  permissionStyle?: string;
  memoryBoundaries?: string;
  connectTools?: string;
  intelligenceRoute?: string;
}

export function readWebOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WEB_ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

export function readWebProfile(): WebProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(WEB_PROFILE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<WebProfile>;
    return {
      name: parsed.name ?? "",
      interaction: parsed.interaction ?? "chat",
      theme: parsed.theme && ["PROFESSIONAL", "MASTER_SYSTEM", "FROST", "LIGHTCREAM"].includes(parsed.theme) ? parsed.theme : "PROFESSIONAL",
      modelRoute: parsed.modelRoute ?? "cloud",
      personality: parsed.personality ?? "proactive",
      backgroundOpacity: parsed.backgroundOpacity ?? 30,
      backgroundBlur: parsed.backgroundBlur ?? 40,
    };
  } catch {
    return null;
  }
}

export function completeWebOnboarding(profile: WebProfile): void {
  window.localStorage.setItem(WEB_PROFILE_KEY, JSON.stringify(profile));
  window.localStorage.setItem(WEB_ONBOARDING_KEY, "true");
}

const PREMIUM_PREFERENCE_KEYS: Array<keyof WebPremiumPreferences> = [
  "environment",
  "presence",
  "permissionStyle",
  "memoryBoundaries",
  "connectTools",
  "intelligenceRoute",
];

export function readWebPremiumPreferences(): WebPremiumPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(WEB_PREMIUM_PREFERENCES_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<WebPremiumPreferences>;
    const result: WebPremiumPreferences = {};
    for (const key of PREMIUM_PREFERENCE_KEYS) {
      if (typeof parsed[key] === "string") result[key] = parsed[key];
    }
    return result;
  } catch {
    return null;
  }
}

export function writeWebPremiumPreferences(
  preferences: WebPremiumPreferences,
): void {
  if (typeof window === "undefined") return;
  const sanitized: WebPremiumPreferences = {};
  for (const key of PREMIUM_PREFERENCE_KEYS) {
    const value = preferences[key];
    if (typeof value === "string") sanitized[key] = value;
  }
  window.localStorage.setItem(
    WEB_PREMIUM_PREFERENCES_KEY,
    JSON.stringify(sanitized),
  );
}
