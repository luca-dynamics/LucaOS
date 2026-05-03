export type OnboardingStep =
  | "KERNEL_AWAKENING"
  | "DIRECTIVE_ALIGNMENT"
  | "THEME"
  | "NEURAL_HANDSHAKE"
  | "FACE_SCAN"
  | "COGNITIVE_CORE_SELECTION"
  | "HARDWARE_SCAN"
  | "LOCAL_PLAN_REVIEW"
  | "OLLAMA_INSTALL"
  | "OLLAMA_WAKE"
  | "PROVISION_LOCAL"
  | "MODE_SELECT"
  | "CONVERSATION"
  | "CALIBRATION"
  | "COMPLETE";

export type OnboardingConversationMode = "text" | "voice";

export const onboardingController = {
  afterKernelAwakening(): OnboardingStep {
    return "DIRECTIVE_ALIGNMENT";
  },

  afterDirectiveAlignment(): OnboardingStep {
    return "THEME";
  },

  afterThemeSelection(): OnboardingStep {
    return "NEURAL_HANDSHAKE";
  },

  afterIdentityHandshake(): OnboardingStep {
    return "FACE_SCAN";
  },

  afterFaceScan(): OnboardingStep {
    return "COGNITIVE_CORE_SELECTION";
  },

  afterCloudActivation(): OnboardingStep {
    return "MODE_SELECT";
  },

  afterGoLocal(): OnboardingStep {
    return "HARDWARE_SCAN";
  },

  toHardwareScan(): OnboardingStep {
    return "HARDWARE_SCAN";
  },

  toLocalPlanReview(): OnboardingStep {
    return "LOCAL_PLAN_REVIEW";
  },

  toOllamaInstall(): OnboardingStep {
    return "OLLAMA_INSTALL";
  },

  toOllamaWake(): OnboardingStep {
    return "OLLAMA_WAKE";
  },

  afterLocalPlanReview(): OnboardingStep {
    return "PROVISION_LOCAL";
  },

  afterNativeCortexChoice(): OnboardingStep {
    return this.toLocalPlanReview();
  },

  backToCoreSelection(): OnboardingStep {
    return "COGNITIVE_CORE_SELECTION";
  },

  afterProvisioningReady(): OnboardingStep {
    return "MODE_SELECT";
  },

  afterModeSelection(_mode: OnboardingConversationMode): OnboardingStep {
    return "CONVERSATION";
  },

  backFromConversation(): OnboardingStep {
    return "MODE_SELECT";
  },

  afterConversation(): OnboardingStep {
    return "CALIBRATION";
  },

  afterCalibration(): OnboardingStep {
    return "COMPLETE";
  },
};
