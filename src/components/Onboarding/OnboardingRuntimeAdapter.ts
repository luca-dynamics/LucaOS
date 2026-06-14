import type { ComponentType, Dispatch, SetStateAction } from "react";
import type { OperatorProfile } from "../../types/operatorProfile";
import type {
  LocalHardwareResolution,
  LocalRecoveryStep,
  LocalProvisioningResumeState,
  LocalProvisionPlan,
  ProvisionDownloadState,
  ProvisioningOutcome,
  ProvisionRow,
} from "../../services/onboarding/LocalProvisioningService";
import type {
  OnboardingModelReadiness,
} from "../../services/onboarding/OnboardingModelModeCoordinator";
import type { ConversationMode } from "./ModeSelect";

export type OnboardingSound =
  | "BOOT"
  | "KEYSTROKE"
  | "ALERT"
  | "SUCCESS"
  | "HOVER"
  | "PROCESSING";

export interface OnboardingVisualSettings {
  theme: string;
  backgroundOpacity: number;
  backgroundBlur: number;
  setupComplete: boolean;
}

export interface OnboardingConversationProps {
  mode: ConversationMode;
  userName: string;
  theme?: { primary: string; hex: string };
  onBack?: () => void;
  onComplete: (profile: Partial<OperatorProfile>) => void;
}

export interface OnboardingRuntimeAdapter {
  platform: "desktop" | "web";
  supportsLocalProvisioning: boolean;
  ConversationComponent: ComponentType<OnboardingConversationProps>;
  getVisualSettings(): OnboardingVisualSettings;
  saveVisualSettings(
    settings: Partial<Pick<OnboardingVisualSettings, "theme" | "backgroundOpacity" | "backgroundBlur">>,
  ): void;
  playSound(sound: OnboardingSound): void;
  persistOperatorIdentity(name: string): void;
  saveFaceScanData(faceData: string | null): void;
  clearLocalProvisioningResume(): void;
  readLocalProvisioningResume(): LocalProvisioningResumeState | null;
  isRecoverableLocalStep(step: string): step is LocalRecoveryStep;
  persistLocalProvisioningResume(state: LocalProvisioningResumeState): void;
  applyLocalProvisionPlan(
    plan: LocalProvisionPlan,
    options: { includeVision: boolean },
  ): void;
  setLocalDiscoveryOverride(enabled: boolean): void;
  getModelSize(modelId: string): string | undefined;
  subscribeToModels(listener: (models: any[]) => void): () => void;
  resolveLocalHardwarePlan(): Promise<LocalHardwareResolution>;
  buildLocalProvisionPlan(
    targetBrainModel: string,
    includeVision: boolean,
  ): LocalProvisionPlan;
  startLocalProvisioning(
    plan: LocalProvisionPlan,
    options: { includeVision: boolean },
  ): void;
  evaluateLocalProvisioningState(
    plan: LocalProvisionPlan,
    options: { includeVision: boolean; models?: any[] },
  ): {
    downloadStates: Record<string, ProvisionDownloadState>;
    failedProvisionKeys: string[];
    provisionError: boolean;
    isDownloadingLocal: boolean;
    provisioningOutcome: ProvisioningOutcome;
    shouldAutoAdvance: boolean;
  };
  getLocalPlanDownloadBytes(
    plan: LocalProvisionPlan,
    options: { includeVision: boolean },
  ): number;
  getProvisionRows(plan: LocalProvisionPlan | null): ProvisionRow[];
  getProvisionRetryIds(
    plan: LocalProvisionPlan,
    failedProvisionKeys: string[],
    options: { includeVision: boolean },
  ): string[];
  retryProvisionTargets(
    ids: string[],
    setDownloadStates: Dispatch<
      SetStateAction<Record<string, ProvisionDownloadState>>
    >,
  ): void;
  installOllama(): Promise<{ success: boolean; message?: string }>;
  applyCloudConfiguration(options: {
    showByok: boolean;
    provider: "gemini" | "openai" | "anthropic" | "xai";
    apiKey: string;
  }): Promise<OnboardingModelReadiness>;
  selectLocalMode(): Promise<OnboardingModelReadiness>;
  selectConversationMode(mode: ConversationMode): Promise<{
    mode: ConversationMode;
    fallbackMessage?: string;
    readiness: OnboardingModelReadiness;
  }>;
  confirmSelectedModelRoute(options: {
    voiceSelected: boolean;
    memoryEnabled: boolean;
  }): Promise<OnboardingModelReadiness>;
}
