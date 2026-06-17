import type {
  OnboardingRuntimeAdapter,
  OnboardingVisualSettings,
} from "../../components/Onboarding/OnboardingRuntimeAdapter";
import type { OnboardingModelReadiness } from "../../services/onboarding/OnboardingModelModeCoordinator";
import type { LocalRecoveryStep } from "../../services/onboarding/LocalProvisioningService";
import { WebSafeConversationalOnboarding } from "./WebSafeConversationalOnboarding";
import { WebVoiceOnboardingSurface } from "../voice/WebVoiceOnboardingSurface";

const VISUAL_SETTINGS_KEY = "lucaos.web.onboarding.visual-settings";

const defaultVisualSettings: OnboardingVisualSettings = {
  theme: "PROFESSIONAL",
  backgroundOpacity: 0.3,
  backgroundBlur: 40,
  setupComplete: false,
};

const readVisualSettings = (): OnboardingVisualSettings => {
  if (typeof window === "undefined") return defaultVisualSettings;
  try {
    const stored = window.localStorage.getItem(VISUAL_SETTINGS_KEY);
    return stored
      ? { ...defaultVisualSettings, ...JSON.parse(stored) }
      : defaultVisualSettings;
  } catch {
    return defaultVisualSettings;
  }
};

const visualSettingsListeners = new Set<
  (settings: OnboardingVisualSettings) => void
>();

let currentVisualSettings = readVisualSettings();

const notifyVisualSettings = () => {
  for (const listener of visualSettingsListeners) {
    listener(currentVisualSettings);
  }
};

const readiness = (
  mode: OnboardingModelReadiness["mode"],
  warning?: string,
): OnboardingModelReadiness => ({
  mode,
  routes: {},
  warnings: warning
    ? [
        {
          capability: "chat",
          mode,
          provider: mode === "local" ? "local" : "luca-prime",
          readiness: mode === "local" ? "missing_runtime" : "planned",
          reason: warning,
          warnings: [warning],
        },
      ]
    : [],
  blocked: mode === "local",
  canContinue: mode !== "local",
  recommendedLocalModels: {},
});

const unavailable = () => {
  throw new Error(
    "Local provisioning requires LucaOS Desktop or a paired Desktop host.",
  );
};

export const webOnboardingRuntime: OnboardingRuntimeAdapter = {
  platform: "web",
  supportsLocalProvisioning: false,
  skipKernelAwakeningVisual: true,
  ConversationComponent: (props: import("../../components/Onboarding/OnboardingRuntimeAdapter").OnboardingConversationProps) =>
    props.mode === "voice" ? (
      <WebVoiceOnboardingSurface {...props} />
    ) : (
      <WebSafeConversationalOnboarding {...props} />
    ),
  getVisualSettings() {
    return currentVisualSettings;
  },
  subscribeVisualSettings(listener) {
    visualSettingsListeners.add(listener);
    listener(currentVisualSettings);

    return () => {
      visualSettingsListeners.delete(listener);
    };
  },
  saveVisualSettings(next) {
    currentVisualSettings = { ...currentVisualSettings, ...next };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        VISUAL_SETTINGS_KEY,
        JSON.stringify(currentVisualSettings),
      );
    }
    notifyVisualSettings();
  },
  playSound() {
    // Browser audio remains dormant until a user gesture selects a mode/action.
  },
  persistOperatorIdentity(name) {
    window.localStorage.setItem("LUCA_USER_NAME", name);
  },
  saveFaceScanData(faceData) {
    if (faceData) {
      window.localStorage.setItem("lucaos.web.face-scan", faceData);
    }
  },
  clearLocalProvisioningResume() {
    window.localStorage.removeItem("LUCA_LOCAL_ONBOARDING_RESUME_V1");
  },
  readLocalProvisioningResume() {
    return null;
  },
  isRecoverableLocalStep(_step: string): _step is LocalRecoveryStep {
    return false;
  },
  persistLocalProvisioningResume() {},
  applyLocalProvisionPlan: unavailable,
  setLocalDiscoveryOverride() {},
  getModelSize() {
    return undefined;
  },
  subscribeToModels() {
    return () => {};
  },
  resolveLocalHardwarePlan: unavailable,
  buildLocalProvisionPlan: unavailable,
  startLocalProvisioning: unavailable,
  evaluateLocalProvisioningState: unavailable,
  getLocalPlanDownloadBytes: unavailable,
  getProvisionRows() {
    return [];
  },
  getProvisionRetryIds: unavailable,
  retryProvisionTargets: unavailable,
  installOllama: unavailable,
  async applyCloudConfiguration(options) {
    window.localStorage.setItem(
      "lucaos.web.model-route",
      options.showByok ? `byok:${options.provider}` : "luca-prime",
    );
    // Never persist or expose a provider key from the browser onboarding path.
    return readiness(options.showByok ? "byok" : "luca-prime");
  },
  async selectLocalMode() {
    return readiness(
      "local",
      "Local Models require LucaOS Desktop. Install or pair Desktop to continue with a local runtime.",
    );
  },
  async selectConversationMode(mode) {
    return {
      mode,
      readiness: readiness("luca-prime"),
    };
  },
  async confirmSelectedModelRoute() {
    return readiness("luca-prime");
  },
};
