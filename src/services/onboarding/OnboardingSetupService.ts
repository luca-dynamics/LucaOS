import { personalityService } from "../personalityService";
import { settingsService } from "../settingsService";
import { requestVoicePermission } from "../../utils/voicePermissions";

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

export const applyCloudOnboardingConfiguration = (options: {
  showByok: boolean;
  provider: OnboardingByokProvider;
  apiKey: string;
}) => {
  const currentBrain = settingsService.get("brain");
  const currentVoice = settingsService.get("voice");
  const brainSettings: any = {
    ...currentBrain,
    useCustomApiKey: options.showByok && !!options.apiKey,
  };

  if (options.showByok && options.apiKey) {
    if (options.provider === "gemini") {
      brainSettings.geminiApiKey = options.apiKey;
      brainSettings.model = "gemini-3-flash-preview";
    } else if (options.provider === "openai") {
      brainSettings.openaiApiKey = options.apiKey;
      brainSettings.model = "gpt-4.1-mini";
    } else if (options.provider === "anthropic") {
      brainSettings.anthropicApiKey = options.apiKey;
      brainSettings.model = "claude-sonnet-4-5";
    } else if (options.provider === "xai") {
      brainSettings.xaiApiKey = options.apiKey;
      brainSettings.model = "grok-beta";
    }
  } else {
    brainSettings.model = "gemini-3-flash-preview";
  }

  settingsService.saveSettings({
    brain: {
      ...brainSettings,
      embeddingModel: (
        options.showByok && options.provider === "gemini"
          ? "gemini-2.1-flash"
          : "local/nomic-embed-text"
      ) as any,
    },
    voice: {
      ...currentVoice,
      provider: "gemini-genai",
      voiceId: "Aoede",
      sttModel: "cloud-gemini",
    },
  });
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
