import { personalityService } from "../personalityService";
import { settingsService } from "../settingsService";
import { requestVoicePermission } from "../../utils/voicePermissions";
import { onboardingModelModeCoordinator } from "./OnboardingModelModeCoordinator";

export type OnboardingByokProvider =
  | "gemini"
  | "openai"
  | "anthropic"
  | "xai";

export type OnboardingConversationMode = "text" | "voice";

export interface OnboardingModeResolution {
  mode: OnboardingConversationMode;
  fallbackMessage?: string;
}

export const persistOperatorIdentity = (name: string) => {
  localStorage.setItem("LUCA_USER_NAME", name);

  const currentGeneral = settingsService.get("general");
  settingsService.saveSettings({
    general: { ...currentGeneral, userName: name },
  });

  personalityService.initializeForOperator(name);
};

export const saveFaceScanData = (faceData: string | null) => {
  if (!faceData) return;
  settingsService.saveFaceData(faceData);
};

export const applyCloudOnboardingConfiguration = async (options: {
  showByok: boolean;
  provider: OnboardingByokProvider;
  apiKey: string;
}) => {
  if (options.showByok) {
    return onboardingModelModeCoordinator.selectByokMode({
      provider: options.provider,
      apiKey: options.apiKey,
    });
  }

  return onboardingModelModeCoordinator.selectLucaPrimeMode();
};

export const resolveOnboardingConversationMode = async (
  requestedMode: OnboardingConversationMode,
  isElectron: boolean,
): Promise<OnboardingModeResolution> => {
  if (requestedMode !== "voice") {
    return { mode: requestedMode };
  }

  const granted = await requestVoicePermission();
  if (granted) {
    return { mode: requestedMode };
  }

  return {
    mode: "text",
    fallbackMessage: isElectron
      ? "Microphone access required for voice mode. Falling back to text."
      : "Microphone access is required for voice mode. Falling back to text.",
  };
};
