export const WEB_ONBOARDING_KEY = "lucaos.web.onboardingComplete";
export const WEB_PROFILE_KEY = "lucaos.web.profile";

export interface WebProfile {
  name: string;
  interaction: "chat" | "voice";
  theme: "cyan" | "violet" | "neutral";
  modelRoute: "cloud" | "byok" | "desktop-later";
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
    return value ? (JSON.parse(value) as WebProfile) : null;
  } catch {
    return null;
  }
}

export function completeWebOnboarding(profile: WebProfile): void {
  window.localStorage.setItem(WEB_PROFILE_KEY, JSON.stringify(profile));
  window.localStorage.setItem(WEB_ONBOARDING_KEY, "true");
}
