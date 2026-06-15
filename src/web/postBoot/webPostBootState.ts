import {
  readWebOnboardingComplete,
  readWebProfile,
} from "../webLifecycleStorage";

export type WebPostBootUserState =
  | "new_user"
  | "returning_user"
  | "partial_setup"
  | "permission_attention";

export interface WebPostBootStateSnapshot {
  userState: WebPostBootUserState;
  displayName?: string;
  hasCompletedOnboarding: boolean;
  preferredInteraction?: "text" | "voice";
  needsVoicePermission?: boolean;
  canEnterShell: boolean;
}

type SafePermissionState = PermissionState | "unknown";
const PERMISSION_TIMEOUT_MS = 250;

async function checkMicrophonePermission(): Promise<SafePermissionState> {
  try {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.permissions?.query !== "function"
    ) {
      return "unknown";
    }

    return (
      await navigator.permissions.query({
        name: "microphone" as PermissionName,
      })
    ).state;
  } catch {
    return "unknown";
  }
}

async function resolveVoicePermissionSafely(): Promise<SafePermissionState> {
  try {
    return await Promise.race([
      checkMicrophonePermission(),
      new Promise<"unknown">((resolve) => {
        setTimeout(() => resolve("unknown"), PERMISSION_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return "unknown";
  }
}

export async function resolveWebPostBootState(): Promise<WebPostBootStateSnapshot> {
  try {
    const hasCompletedOnboarding = readWebOnboardingComplete();
    const profile = readWebProfile();

    if (!hasCompletedOnboarding && !profile) {
      return {
        userState: "new_user",
        hasCompletedOnboarding: false,
        canEnterShell: false,
      };
    }

    if (!hasCompletedOnboarding || !profile?.name) {
      return {
        userState: "partial_setup",
        displayName: profile?.name || undefined,
        hasCompletedOnboarding,
        preferredInteraction:
          profile?.interaction === "voice" ? "voice" : "text",
        canEnterShell: false,
      };
    }

    const preferredInteraction =
      profile.interaction === "voice" ? "voice" : "text";
    const microphonePermission =
      preferredInteraction === "voice"
        ? await resolveVoicePermissionSafely()
        : "unknown";
    const needsVoicePermission = microphonePermission === "denied";

    return {
      userState: needsVoicePermission
        ? "permission_attention"
        : "returning_user",
      displayName: profile.name,
      hasCompletedOnboarding: true,
      preferredInteraction,
      needsVoicePermission,
      canEnterShell: !needsVoicePermission,
    };
  } catch (error) {
    console.warn(
      "[WebPostBootState] Falling back to new_user snapshot",
      error,
    );
    return {
      userState: "new_user",
      hasCompletedOnboarding: false,
      canEnterShell: false,
    };
  }
}
