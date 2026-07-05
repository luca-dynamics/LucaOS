import ConversationalOnboarding from "../../components/Onboarding/ConversationalOnboarding";
import type { OnboardingRuntimeAdapter } from "../../components/Onboarding/OnboardingRuntimeAdapter";
import { modelManager } from "../../services/ModelManagerService";
import {
  applyLocalProvisionPlan,
  buildLocalProvisionPlan,
  clearLocalProvisioningResume,
  evaluateLocalProvisioningState,
  getLocalPlanDownloadBytes,
  getProvisionRows,
  getProvisionRetryIds,
  isRecoverableLocalStep,
  persistLocalProvisioningResume,
  readLocalProvisioningResume,
  resolveLocalHardwarePlan,
  retryProvisionTargets,
  startLocalProvisioning,
} from "../../services/onboarding/LocalProvisioningService";
import { onboardingModelModeCoordinator } from "../../services/onboarding/OnboardingModelModeCoordinator";
import {
  applyCloudOnboardingConfiguration,
  persistOperatorIdentity,
  resolveOnboardingConversationMode,
  saveFaceScanData,
} from "../../services/onboarding/OnboardingSetupService";
import { settingsService } from "../../services/settingsService";
import { soundService } from "../../services/soundService";
import { realtimeVoiceUiBridge } from "../../services/voice/realtimeVoiceUiBridge";
import { normalizeLucaSkinId } from "../../config/lucaSkins";

export const desktopOnboardingRuntime: OnboardingRuntimeAdapter = {
  platform: "desktop",
  supportsLocalProvisioning: true,
  ConversationComponent: ConversationalOnboarding,
  getVisualSettings() {
    const general = settingsService.get("general");
    return {
      theme: (general.theme as string) || "PROFESSIONAL",
      selectedSkinId: normalizeLucaSkinId(general.selectedSkinId),
      backgroundOpacity: general.backgroundOpacity ?? 0.3,
      backgroundBlur: general.backgroundBlur ?? 40,
      setupComplete: Boolean(general.setupComplete),
    };
  },
  subscribeVisualSettings(listener) {
    listener(this.getVisualSettings());
    return () => {};
  },
  saveVisualSettings(next) {
    settingsService.saveSettings({
      general: { ...settingsService.get("general"), ...next } as any,
    });
  },
  playSound(sound) {
    void soundService.play(sound);
  },
  persistOperatorIdentity,
  saveFaceScanData,
  clearLocalProvisioningResume,
  readLocalProvisioningResume,
  isRecoverableLocalStep,
  persistLocalProvisioningResume,
  applyLocalProvisionPlan,
  setLocalDiscoveryOverride(enabled) {
    settingsService.setLocalDiscoveryOverride(enabled);
  },
  getModelSize(modelId) {
    return modelManager.getModel(modelId)?.sizeFormatted;
  },
  subscribeToModels(listener) {
    return modelManager.subscribe(listener);
  },
  resolveLocalHardwarePlan,
  buildLocalProvisionPlan,
  startLocalProvisioning,
  evaluateLocalProvisioningState,
  getLocalPlanDownloadBytes,
  getProvisionRows,
  getProvisionRetryIds,
  retryProvisionTargets,
  installOllama() {
    return modelManager.installOllama();
  },
  applyCloudConfiguration: applyCloudOnboardingConfiguration,
  selectLocalMode() {
    return onboardingModelModeCoordinator.selectLocalMode();
  },
  async selectConversationMode(mode) {
    realtimeVoiceUiBridge.modeBridge.setMode(mode);
    if (mode === "voice") {
      realtimeVoiceUiBridge.modeBridge.startVoiceSession();
      realtimeVoiceUiBridge.controller.startSession({
        metadata: { source: "onboarding_mode_select" },
      });
    } else {
      realtimeVoiceUiBridge.modeBridge.stopVoiceSession();
      realtimeVoiceUiBridge.controller.stopSession("text_mode_selected");
    }

    const resolved = await resolveOnboardingConversationMode(mode, true);
    const readiness =
      await onboardingModelModeCoordinator.getOnboardingModelReadiness({
        includeVoice: resolved.mode === "voice",
        includeEmbedding: true,
      });
    return { ...resolved, readiness };
  },
  confirmSelectedModelRoute(options) {
    return onboardingModelModeCoordinator.confirmSelectedModelRoute(options);
  },
};
