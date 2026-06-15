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

async function readMicrophonePermission(): Promise<PermissionState | undefined> {
  if (
    typeof navigator === "undefined" ||
    !navigator.permissions?.query
  ) {
    return undefined;
  }

  try {
    return (
      await navigator.permissions.query({
        name: "microphone" as PermissionName,
      })
    ).state;
  } catch {
    return undefined;
  }
}

export async function resolveWebPostBootState(): Promise<WebPostBootStateSnapshot> {
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
      preferredInteraction: profile?.interaction === "voice" ? "voice" : "text",
      canEnterShell: false,
    };
  }

  const preferredInteraction =
    profile.interaction === "voice" ? "voice" : "text";
  const microphonePermission =
    preferredInteraction === "voice"
      ? await readMicrophonePermission()
      : undefined;
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
}
