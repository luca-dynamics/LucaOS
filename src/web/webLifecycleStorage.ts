export const WEB_ONBOARDING_KEY = "lucaos.web.onboardingComplete";
export const WEB_PROFILE_KEY = "lucaos.web.profile";

export interface WebProfile {
  name: string;
  interaction: "chat" | "voice";
  theme: "PROFESSIONAL" | "MASTER_SYSTEM" | "FROST" | "LIGHTCREAM";
  modelRoute: "cloud" | "byok" | "desktop-later";
  personality: "proactive" | "direct";
  backgroundOpacity: number;
  backgroundBlur: number;
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
