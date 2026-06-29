import React, { Suspense, useState, useEffect, useRef } from "react";
import { THEME_PALETTE, getDynamicContrast } from "../../config/themeColors";
import type { UIThemeId } from "../../types/lucaPersonality";
import HologramFace from "./HologramFace";
import ModeSelect, { ConversationMode } from "./ModeSelect";
import FaceScan from "./FaceScan";
import ConstitutionalAlignment from "./ConstitutionalAlignment";
import ThemeSelectionStep from "./ThemeSelectionStep";
import {
  IdentityVerificationPanel,
  LucaCoreSelectionPanel,
} from "./OnboardingAccessPanels";
import {
  OnboardingLocalPlanReviewPanel,
  type LocalPlanReviewItem,
} from "./OnboardingLocalPlanReviewPanel";
import {
  CalibrationPanel,
  CompletePanel,
  HardwareScanPanel,
  OllamaInstallPanel,
  OllamaWakePanel,
} from "./OnboardingSystemPanels";
import { OnboardingProvisioningPanel } from "./OnboardingProvisioningPanel";
import { OperatorProfile } from "../../types/operatorProfile";
import { useMobile } from "../../hooks/useMobile";
import { apiUrl } from "../../config/api";
import type {
  LocalProvisionPlan,
  ProvisionDownloadState,
  ProvisioningOutcome,
} from "../../services/onboarding/LocalProvisioningService";
import {
  onboardingController,
  type OnboardingStep,
} from "../../services/onboarding/OnboardingController";
import {
  scheduleOnboardingDelay,
  startKernelBootSequence,
  waitForOnboardingDelay,
} from "../../services/onboarding/OnboardingLifecycleService";
import type { OnboardingModelReadiness } from "../../services/onboarding/OnboardingModelModeCoordinator";
import type { OnboardingRuntimeAdapter } from "./OnboardingRuntimeAdapter";
import { LucaCanvasPresenceOrb } from "../visual/LucaCanvasPresenceOrb";
import { LucaHologramShaderPresence } from "../visual/LucaHologramShaderPresence";

type Step = OnboardingStep;

const UI_THEME_IDS = new Set<UIThemeId>([
  "PROFESSIONAL",
  "MASTER_SYSTEM",
  "BUILDER",
  "TERMINAL",
  "AGENTIC_SLATE",
  "DICTATION",
  "LIGHTCREAM",
  "VAPORWAVE",
  "FROST",
]);

const normalizeUIThemeId = (value: string): UIThemeId => {
  const normalized = value.trim().toUpperCase();
  return UI_THEME_IDS.has(normalized as UIThemeId)
    ? (normalized as UIThemeId)
    : "PROFESSIONAL";
};

interface OnboardingFlowProps {
  theme: { primary: string; hex: string };
  runtime: OnboardingRuntimeAdapter;
  onComplete: (
    profile?: Partial<OperatorProfile>,
    mode?: ConversationMode,
  ) => void;
}

// Helper to convert hex to rgba (handles 6 or 8 character hex)
const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
};

const ConversationLoadingFallback: React.FC<{
  accentTextColor: string;
  panelBorderColor: string;
  panelSurfaceColor: string;
}> = ({ accentTextColor, panelBorderColor, panelSurfaceColor }) => (
  <div
    role="status"
    aria-live="polite"
    className="rounded-xl border px-6 py-4 text-xs uppercase tracking-[0.18em] animate-pulse"
    style={{
      color: accentTextColor,
      borderColor: panelBorderColor,
      backgroundColor: panelSurfaceColor,
    }}
  >
    Preparing conversation…
  </div>
);

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  theme,
  runtime,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>("KERNEL_AWAKENING");
  const isMobile = useMobile();
  const initialVisualSettings = useRef(runtime.getVisualSettings()).current;
  const ConversationComponent = runtime.ConversationComponent;

  // Form State
  const [name, setName] = useState("");
  const [currentThemeHex, setCurrentThemeHex] = useState(theme.hex);
  const [currentThemeName, setCurrentThemeName] = useState<string>(
    initialVisualSettings.theme || "PROFESSIONAL",
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    initialVisualSettings.backgroundOpacity,
  );
  const [backgroundBlur, setBackgroundBlur] = useState(
    initialVisualSettings.backgroundBlur,
  );
  const [profile, setProfile] = useState<Partial<OperatorProfile> | null>(null);
  const [conversationMode, setConversationMode] =
    useState<ConversationMode | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [showByok, setShowByok] = useState(false);
  const [byokProvider, setByokProvider] = useState<
    "gemini" | "openai" | "anthropic" | "xai"
  >("gemini");
  const [byokKeys, setByokKeys] = useState<Record<string, string>>({
    gemini: "",
    openai: "",
    anthropic: "",
    xai: "",
  });

  // Hardware & Provisioning State
  const [targetBrainModel, setTargetBrainModel] = useState<string | null>(null);
  const [localProvisionPlan, setLocalProvisionPlan] =
    useState<LocalProvisionPlan | null>(null);
  const [skipVisionForNow, setSkipVisionForNow] = useState(false);
  const [showTechnicalLocalPlan, setShowTechnicalLocalPlan] = useState(false);
  const [downloadStates, setDownloadStates] = useState<
    Record<string, ProvisionDownloadState>
  >({});
  const [provisionError, setProvisionError] = useState(false);
  const [isDownloadingLocal, setIsDownloadingLocal] = useState(false);
  const [provisioningOutcome, setProvisioningOutcome] =
    useState<ProvisioningOutcome>(null);
  const [failedProvisionKeys, setFailedProvisionKeys] = useState<string[]>([]);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [modelReadiness, setModelReadiness] =
    useState<OnboardingModelReadiness | null>(null);
  const [routeWarnings, setRouteWarnings] = useState<string[]>([]);
  const provisionAutoAdvanceRef = useRef(false);

  // Boot Sequence Animation
  const [bootText, setBootText] = useState<string[]>([]);

  const isLightTheme =
    currentThemeName?.toUpperCase() === "LUCAGENT" ||
    currentThemeName?.toUpperCase() === "AGENTIC_SLATE" ||
    currentThemeName?.toUpperCase() === "LIGHTCREAM";

  const currentOpacity = backgroundOpacity;
  const currentContrast = getDynamicContrast(
    currentThemeName || "PROFESSIONAL",
    currentOpacity,
  );
  const useDarkLightThemeContrast = isLightTheme && currentOpacity >= 0.45;
  const accentTextColor = isLightTheme ? currentContrast.text : currentThemeHex;
  const mutedAccentColor = isLightTheme
    ? currentContrast.textMuted
    : `${currentThemeHex}cc`;
  const ambientThemeColor = useDarkLightThemeContrast
    ? currentContrast.text
    : currentThemeHex;
  const panelBorderColor = currentContrast.border;
  const panelSurfaceColor = currentContrast.bgTint;
  const tintedPanelGradient = `linear-gradient(135deg, ${hexToRgba(
    ambientThemeColor,
    useDarkLightThemeContrast ? 0.08 : 0.14,
  )} 0%, ${panelSurfaceColor} 100%)`;

  useEffect(() => {
    try {
      const setupComplete = runtime.getVisualSettings().setupComplete;
      if (setupComplete) {
        runtime.clearLocalProvisioningResume();
        setResumeChecked(true);
        return;
      }

      const saved = runtime.readLocalProvisioningResume();
      if (!saved) {
        setResumeChecked(true);
        return;
      }
      if (!saved?.step || !runtime.isRecoverableLocalStep(saved.step)) {
        runtime.clearLocalProvisioningResume();
        setResumeChecked(true);
        return;
      }

      setTargetBrainModel(saved.targetBrainModel || null);
      setLocalProvisionPlan(saved.localProvisionPlan || null);
      setSkipVisionForNow(Boolean(saved.skipVisionForNow));
      setShowTechnicalLocalPlan(Boolean(saved.showTechnicalLocalPlan));
      setDownloadStates(saved.downloadStates || {});
      setProvisioningOutcome(saved.provisioningOutcome || null);
      setFailedProvisionKeys(saved.failedProvisionKeys || []);
      setStep(saved.step);
    } catch (e) {
      console.warn(
        "[Onboarding] Failed to restore local provisioning state:",
        e,
      );
      runtime.clearLocalProvisioningResume();
    } finally {
      setResumeChecked(true);
    }
  }, [runtime]);

  const resetLocalProvisioningDraft = () => {
    setLocalProvisionPlan(null);
    setDownloadStates({});
    setSkipVisionForNow(false);
    setShowTechnicalLocalPlan(false);
    setProvisioningOutcome(null);
    setFailedProvisionKeys([]);
  };

  const stageLocalProvisionPlan = (plan: LocalProvisionPlan) => {
    setLocalProvisionPlan(plan);
    setSkipVisionForNow(false);
    setShowTechnicalLocalPlan(false);
  };

  const handleConfirmLocalPlan = () => {
    if (!localProvisionPlan) return;
    setProvisionError(false);
    setProvisioningOutcome(null);
    setFailedProvisionKeys([]);
    runtime.applyLocalProvisionPlan(localProvisionPlan, {
      includeVision: !skipVisionForNow,
    });
    runtime.setLocalDiscoveryOverride(true);
    setTargetBrainModel(localProvisionPlan.brain.downloadId || "");
    setStep(onboardingController.afterLocalPlanReview());
  };

  const handleDirectiveAlignmentComplete = () => {
    setStep(onboardingController.afterDirectiveAlignment());
  };

  const handleThemeStepComplete = () => {
    runtime.playSound("SUCCESS");
    setStep(onboardingController.afterThemeSelection());
  };

  const handleThemeChange = (newTheme: string) => {
    runtime.playSound("HOVER");
    const themeId = normalizeUIThemeId(newTheme);
    setCurrentThemeName(themeId);
    const hex = THEME_PALETTE[themeId].primary;
    setCurrentThemeHex(hex);

    runtime.saveVisualSettings({ theme: themeId });
  };

  const handleShowByok = () => {
    runtime.playSound("KEYSTROKE");
    setShowByok(true);
  };

  const handleHideByok = () => {
    setShowByok(false);
  };

  const handleSelectByokProvider = (
    provider: "gemini" | "openai" | "anthropic" | "xai",
  ) => {
    setByokProvider(provider);
    runtime.playSound("HOVER");
  };

  const handleChangeByokKey = (provider: string, value: string) => {
    setByokKeys((prev) => ({
      ...prev,
      [provider]: value,
    }));
  };

  const handleConversationBack = () => {
    setConversationMode(null);
    setStep(onboardingController.backFromConversation());
  };

  const handleConversationComplete = (
    completedProfile: Partial<OperatorProfile>,
  ) => {
    setProfile(completedProfile);
    setStep(onboardingController.afterConversation());
  };

  const handleLocalPlanToggleTechnical = () => {
    setShowTechnicalLocalPlan((current) => !current);
  };

  const handleLocalPlanBack = () => {
    setStep(onboardingController.backToCoreSelection());
  };

  const handleResumeHardwareScan = () => {
    setStep(onboardingController.toHardwareScan());
  };

  const handleContinueWithoutVision = () => {
    setStep(onboardingController.afterProvisioningReady());
  };

  const localPlanReviewItems: LocalPlanReviewItem[] = localProvisionPlan
    ? [
        {
          key: "brain",
          title: "Chat & reasoning",
          subtitle: "Your main local brain for conversations and tool use.",
          modelId: localProvisionPlan.brain.selectionId,
          label: localProvisionPlan.brain.label,
          sizeFormatted: runtime.getModelSize(
            localProvisionPlan.brain.selectionId,
          ),
        },
        {
          key: "stt",
          title: "Voice listening",
          subtitle: "Lets Luca hear and transcribe your speech offline.",
          modelId: localProvisionPlan.stt.id,
          label: localProvisionPlan.stt.label,
          sizeFormatted: runtime.getModelSize(localProvisionPlan.stt.id),
        },
        {
          key: "tts",
          title: "Voice speaking",
          subtitle: "Lets Luca answer aloud with a local voice.",
          modelId: localProvisionPlan.tts.id,
          label: localProvisionPlan.tts.label,
          sizeFormatted: runtime.getModelSize(localProvisionPlan.tts.id),
        },
        {
          key: "vision",
          title: "Vision",
          subtitle:
            "Helps Luca understand screenshots, interfaces, and images.",
          modelId: localProvisionPlan.vision.id,
          label: localProvisionPlan.vision.label,
          optional: true,
          sizeFormatted: runtime.getModelSize(localProvisionPlan.vision.id),
        },
        {
          key: "memory",
          title: "Memory",
          subtitle:
            "Improves retrieval and long-term recall with local embeddings.",
          modelId: localProvisionPlan.memory.id,
          label: localProvisionPlan.memory.label,
          sizeFormatted: runtime.getModelSize(localProvisionPlan.memory.id),
        },
      ]
    : [];

  useEffect(() => {
    if (!resumeChecked) return;

    if (runtime.isRecoverableLocalStep(step)) {
      runtime.persistLocalProvisioningResume({
        step,
        targetBrainModel,
        localProvisionPlan,
        skipVisionForNow,
        showTechnicalLocalPlan,
        downloadStates,
        provisioningOutcome,
        failedProvisionKeys,
        updatedAt: Date.now(),
      });
      return;
    }

    runtime.clearLocalProvisioningResume();
  }, [
    step,
    targetBrainModel,
    localProvisionPlan,
    skipVisionForNow,
    showTechnicalLocalPlan,
    downloadStates,
    provisioningOutcome,
    failedProvisionKeys,
    resumeChecked,
    runtime,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-text-main", currentContrast.text);
    root.style.setProperty("--app-text-muted", currentContrast.textMuted);
    root.style.setProperty("--app-border-main", currentContrast.border);
    root.style.setProperty("--app-bg-tint", currentContrast.bgTint);
  }, [currentContrast, currentThemeName, step]);

  // Sync theme with parent props when changed from tray menu
  useEffect(() => {
    if (theme.hex !== currentThemeHex) {
      setCurrentThemeHex(theme.hex);
    }
  }, [theme.hex, currentThemeHex]);

  // Sync theme hex with parent props when theme is changed externally (e.g., tray menu)
  // NOTE: During onboarding, we priority local state over parent props to avoid reset race conditions.
  useEffect(() => {
    // Only allow parent prop sync if we are in a step that doesn't manage its own theme state
    // or if the onboarding is already completed.
    if (step === "KERNEL_AWAKENING" || step === "DIRECTIVE_ALIGNMENT") {
      const savedTheme = runtime.getVisualSettings().theme;
      if (savedTheme && savedTheme !== currentThemeName) {
        setCurrentThemeName(savedTheme);
        const hex =
          THEME_PALETTE[savedTheme as keyof typeof THEME_PALETTE]?.primary ||
          theme.hex;
        setCurrentThemeHex(hex);
      }
    }
  }, [theme.hex, step, runtime, currentThemeName]);

  useEffect(() => {
    if (!resumeChecked) return;

    if (step === "KERNEL_AWAKENING") {
      if (runtime.skipKernelAwakeningVisual) {
        setStep(onboardingController.afterKernelAwakening());
        return;
      }
      return startKernelBootSequence({
        onMessage: (message) => {
          setBootText((prev) => [...prev, message]);
        },
        onKeystroke: () => {
          runtime.playSound("KEYSTROKE");
        },
        onComplete: () => {
          setStep(onboardingController.afterKernelAwakening());
        },
      });
    }
  }, [step, resumeChecked, runtime]);

  // Manage Hardware Scanning
  useEffect(() => {
    if (step === "HARDWARE_SCAN") {
      const scanHardware = async () => {
        // Artificial delay for UX "Scanning" effect
        await waitForOnboardingDelay(2500);
        const resolution = await runtime.resolveLocalHardwarePlan();

        if (resolution.action === "offer_ollama_install") {
          setTargetBrainModel(resolution.targetBrainModel);
          setStep(onboardingController.toOllamaInstall());
          return;
        }

        stageLocalProvisionPlan(resolution.plan);
        setTargetBrainModel(
          resolution.bypassBrainDownload ? "" : resolution.targetBrainModel,
        );
        setStep(onboardingController.toLocalPlanReview());
      };
      scanHardware();
    }
  }, [step, runtime]);

  // Method called if the user clicks "Proceed with Native Cortex Download"
  const handleProceedWithCortex = () => {
    if (!targetBrainModel) return;
    const plan = runtime.buildLocalProvisionPlan(targetBrainModel, false);
    stageLocalProvisionPlan(plan);
    setStep(onboardingController.toLocalPlanReview());
  };

  // Manage Local Provisioning Triggers
  useEffect(() => {
    if (step === "PROVISION_LOCAL" && localProvisionPlan) {
      provisionAutoAdvanceRef.current = false;
      setProvisionError(false);
      setIsDownloadingLocal(true);
      setProvisioningOutcome(null);
      setFailedProvisionKeys([]);
      runtime.startLocalProvisioning(localProvisionPlan, {
        includeVision: !skipVisionForNow,
      });
    }
  }, [step, localProvisionPlan, skipVisionForNow, runtime]);

  // Track Multi-Model Download Progress
  useEffect(() => {
    if (step !== "PROVISION_LOCAL" || !localProvisionPlan) return;

    const applyProvisionSnapshot = (models?: any[]) => {
      const snapshot = runtime.evaluateLocalProvisioningState(
        localProvisionPlan,
        {
          includeVision: !skipVisionForNow,
          models,
        },
      );

      setDownloadStates(snapshot.downloadStates);
      setFailedProvisionKeys(snapshot.failedProvisionKeys);
      setProvisionError(snapshot.provisionError);
      setIsDownloadingLocal(snapshot.isDownloadingLocal);
      setProvisioningOutcome(snapshot.provisioningOutcome);

      if (snapshot.shouldAutoAdvance && !provisionAutoAdvanceRef.current) {
        provisionAutoAdvanceRef.current = true;
        setTimeout(
          () => setStep(onboardingController.afterProvisioningReady()),
          1200,
        );
      }
    };

    applyProvisionSnapshot();

    const unsubscribe = runtime.subscribeToModels((models) => {
      applyProvisionSnapshot(models);
    });

    return () => unsubscribe();
  }, [step, localProvisionPlan, skipVisionForNow, runtime]);

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      runtime.playSound("SUCCESS");
      runtime.persistOperatorIdentity(name);
      setStep(onboardingController.afterIdentityHandshake());
    }
  };

  const handleActivateCloud = async () => {
    setIsActivating(true);
    resetLocalProvisioningDraft();
    runtime.playSound("SUCCESS");
    await waitForOnboardingDelay(1500);
    const readiness = await runtime.applyCloudConfiguration({
      showByok,
      provider: byokProvider,
      apiKey: showByok ? byokKeys[byokProvider] : "",
    });
    setModelReadiness(readiness);
    setRouteWarnings(readiness.warnings.map((warning) => warning.reason));

    setIsActivating(false);
    setStep(onboardingController.afterCloudActivation());
  };

  const handleGoLocal = async () => {
    runtime.playSound("SUCCESS");
    resetLocalProvisioningDraft();
    const readiness = await runtime.selectLocalMode();
    setModelReadiness(readiness);
    setRouteWarnings(readiness.warnings.map((warning) => warning.reason));
    if (!runtime.supportsLocalProvisioning) {
      alert(
        readiness.warnings[0]?.reason ||
          "Local Models require LucaOS Desktop or a paired Desktop host.",
      );
      return;
    }
    setStep(onboardingController.afterGoLocal());
  };

  const handleInstallOllama = async () => {
    setIsActivating(true);
    runtime.playSound("SUCCESS");
    const result = await runtime.installOllama();
    setIsActivating(false);

    if (result.success) {
      await waitForOnboardingDelay(2000);
      setStep(onboardingController.toHardwareScan());
      return;
    }

    alert(result.message || "Installation failed. Please try manual setup.");
    setStep(onboardingController.toOllamaWake());
  };

  const handleRetryVisionCore = () => {
    if (!localProvisionPlan) return;
    setProvisioningOutcome(null);
    setFailedProvisionKeys([]);
    runtime.retryProvisionTargets(
      [localProvisionPlan.vision.id],
      setDownloadStates,
    );
  };

  const handleRetryProvisioning = () => {
    if (!localProvisionPlan) return;
    setProvisionError(false);
    setProvisioningOutcome(null);
    const retryIds = runtime.getProvisionRetryIds(
      localProvisionPlan,
      failedProvisionKeys,
      {
        includeVision: !skipVisionForNow,
      },
    );
    runtime.retryProvisionTargets(retryIds, setDownloadStates);
  };

  const handleFaceScanComplete = (faceData: string | null) => {
    runtime.saveFaceScanData(faceData);
    setStep(onboardingController.afterFaceScan());
  };

  const handleModeSelect = async (mode: ConversationMode) => {
    setConversationMode(mode);
    runtime.playSound("KEYSTROKE");

    const resolvedMode = await runtime.selectConversationMode(mode);
    if (resolvedMode.mode !== mode) {
      setConversationMode(resolvedMode.mode);
    }
    if (resolvedMode.fallbackMessage) {
      alert(resolvedMode.fallbackMessage);
    }

    const readiness = resolvedMode.readiness;
    setModelReadiness(readiness);
    const warnings = readiness.warnings.map((warning) => warning.reason);
    setRouteWarnings(warnings);
    if (resolvedMode.mode === "voice" && warnings.length > 0) {
      alert(`Voice/model route needs attention:\n\n${warnings.join("\n")}`);
    }
    setStep(onboardingController.afterModeSelection(resolvedMode.mode));
  };

  useEffect(() => {
    if (step === "CALIBRATION") {
      return scheduleOnboardingDelay(() => {
        setStep(onboardingController.afterCalibration());
      }, 1500);
    }

    if (step === "COMPLETE") {
      runtime.playSound("SUCCESS");
      return scheduleOnboardingDelay(() => {
        const finish = async () => {
          const readiness = await runtime.confirmSelectedModelRoute({
            voiceSelected: conversationMode === "voice",
            memoryEnabled: true,
          });
          setModelReadiness(readiness);
          setRouteWarnings(readiness.warnings.map((warning) => warning.reason));
          // Pass the selected conversation mode to the completion handler.
          onComplete(profile || undefined, conversationMode || undefined);
        };
        finish().catch((error) => {
          console.warn(
            "[Onboarding] Route readiness confirmation failed",
            error,
          );
          onComplete(profile || undefined, conversationMode || undefined);
        });
      }, 1500);
    }
  }, [
    step,
    onComplete,
    profile,
    conversationMode,
    isDownloadingLocal,
    runtime,
  ]);

  return (
    <div className="absolute inset-0 z-10 flex min-h-dvh flex-col items-center justify-center overflow-hidden font-mono">
      {/* Background handled by App.tsx (LiquidBackground) */}

      <div
        className="transition-opacity duration-700"
        style={{
          opacity:
            "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.7) / 0.3), 1)) * 0.025)",
        }}
      />

      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity:
            "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.88) / 0.12), 1)) * 0.16)",
          backgroundImage: `radial-gradient(${ambientThemeColor + (isLightTheme ? "60" : "40")} 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* Hologram Face is visible during hardware scanning, downloads, and voice conversation */}
      {!["KERNEL_AWAKENING", "DIRECTIVE_ALIGNMENT", "COMPLETE"].includes(step) &&
        !(runtime.platform === "web" && step === "CONVERSATION") &&
        !(step === "CONVERSATION" && conversationMode === "text") && (
          <HologramFace step={step} />
        )}

      {/* Primary UI Layer */}
      <div
        className={`z-10 relative transition-all duration-700 ease-in-out mx-auto flex flex-col items-center ${
          step === "CONVERSATION"
            ? conversationMode === "voice"
              ? "h-full w-full justify-center"
              : isMobile
                ? "h-full w-full justify-center px-5"
                : "w-[min(80vmin,1000px)] h-[min(75vmin,800px)] justify-center"
            : step === "THEME"
              ? isMobile
                ? "w-[92vw] h-[88vh] max-h-[88vh] justify-start pt-6"
                : "w-full max-w-2xl h-[min(88vh,860px)] max-h-[88vh] px-4 justify-start pt-8"
              : isMobile
                ? "w-full justify-center px-5"
                : "w-[min(90vw,1000px)] justify-center"
        }`}
        style={{
          paddingTop:
            step === "CONVERSATION" ? "0" : "clamp(0.5rem, 2vmin, 1.5rem)",
          paddingBottom:
            step === "CONVERSATION"
              ? "0"
              : "calc(clamp(1rem, 3vmin, 2rem) + env(safe-area-inset-bottom))",
          transform:
            step === "CONVERSATION" && conversationMode === "voice"
              ? "none"
              : "translateZ(0)",
        }}
      >
        {step === "KERNEL_AWAKENING" && !runtime.skipKernelAwakeningVisual && (
          <div className="flex w-full max-w-xl flex-col items-center px-4 text-center">
            <LucaHologramShaderPresence
              size={isMobile ? 190 : 230}
              state="preparing"
              themeColor={ambientThemeColor}
            />
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Preparing LucaOS
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/60 sm:text-base">
              I'm getting your workspace ready.
            </p>
            <div className="mt-7 w-full max-w-md space-y-2 text-left">
              {[
                "Preparing memory context",
                "Loading interaction preferences",
                "Starting chat and voice interface",
                "Securing this session",
              ].map((label, index) => {
                const complete = index < bootText.length;
                const current = index === Math.min(bootText.length, 3);
                return (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-2.5"
                  >
                    <LucaCanvasPresenceOrb
                      size={22}
                      state={complete ? "ready" : current ? "preparing" : "idle"}
                      amplitude={current ? 0.16 : 0}
                      themeColor={ambientThemeColor}
                      lowPower={isMobile}
                      className="shrink-0"
                    />
                    <span
                      className={`text-sm ${
                        complete ? "text-white/75" : "text-white/50"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === "DIRECTIVE_ALIGNMENT" && (
          <ConstitutionalAlignment
            onComplete={handleDirectiveAlignmentComplete}
            themeId={currentThemeName}
            backgroundOpacity={backgroundOpacity}
          />
        )}

        {step === "THEME" && (
          <ThemeSelectionStep
            onComplete={handleThemeStepComplete}
            onThemeChange={handleThemeChange}
            initialTheme={normalizeUIThemeId(currentThemeName)}
            initialBackgroundOpacity={backgroundOpacity}
            initialBackgroundBlur={backgroundBlur}
            showTransparencyControls={runtime.platform === "desktop"}
            onVisualSettingsChange={(next) => {
              if (next.backgroundOpacity !== undefined) {
                setBackgroundOpacity(next.backgroundOpacity);
              }
              if (next.backgroundBlur !== undefined) {
                setBackgroundBlur(next.backgroundBlur);
              }
              runtime.saveVisualSettings(next);
            }}
          />
        )}

        {step === "NEURAL_HANDSHAKE" && (
          <IdentityVerificationPanel
            accentTextColor={accentTextColor}
            ambientThemeColor={ambientThemeColor}
            isLightTheme={isLightTheme}
            mutedAccentColor={mutedAccentColor}
            panelBorderColor={panelBorderColor}
            panelSurfaceColor={panelSurfaceColor}
            name={name}
            onNameChange={setName}
            onSubmit={handleIdentitySubmit}
            hexToRgba={hexToRgba}
            useDarkLightThemeContrast={useDarkLightThemeContrast}
          />
        )}

        {step === "COGNITIVE_CORE_SELECTION" && (
          <LucaCoreSelectionPanel
            isMobile={isMobile}
            accentTextColor={accentTextColor}
            ambientThemeColor={ambientThemeColor}
            isLightTheme={isLightTheme}
            panelBorderColor={panelBorderColor}
            panelSurfaceColor={panelSurfaceColor}
            tintedPanelGradient={tintedPanelGradient}
            showByok={showByok}
            byokProvider={byokProvider}
            byokKeys={byokKeys}
            isActivating={isActivating}
            onActivateCloud={handleActivateCloud}
            onGoLocal={handleGoLocal}
            onShowByok={handleShowByok}
            onHideByok={handleHideByok}
            onSelectByokProvider={handleSelectByokProvider}
            onChangeByokKey={handleChangeByokKey}
            hexToRgba={hexToRgba}
            useDarkLightThemeContrast={useDarkLightThemeContrast}
          />
        )}

        {step === "FACE_SCAN" && (
          <FaceScan
            userName={name}
            compact={isMobile}
            isLightTheme={isLightTheme}
            theme={{ primary: currentThemeName, hex: currentThemeHex }}
            enrollmentEndpoint={apiUrl("/api/admin/enroll-face")}
            onComplete={handleFaceScanComplete}
            onSkip={() => handleFaceScanComplete(null)}
          />
        )}

        {step === "MODE_SELECT" && (
          <ModeSelect
            onSelect={handleModeSelect}
            isLightTheme={isLightTheme}
            modelReadiness={modelReadiness}
            routeWarnings={routeWarnings}
          />
        )}

        {step === "CONVERSATION" && conversationMode && (
          <Suspense
            fallback={
              <div
                className="rounded-2xl border p-6 text-sm font-mono"
                style={{
                  color: accentTextColor,
                  borderColor: panelBorderColor,
                  backgroundColor: panelSurfaceColor,
                }}
              >
                Preparing Luca conversation interface...
              </div>
            }
          >
            <ConversationComponent
              mode={conversationMode}
              userName={name}
              theme={{ primary: currentThemeName, hex: currentThemeHex }}
              onBack={handleConversationBack}
              onComplete={handleConversationComplete}
            />
          </Suspense>
        )}

        {step === "HARDWARE_SCAN" && (
          <HardwareScanPanel accentTextColor={accentTextColor} />
        )}

        {step === "LOCAL_PLAN_REVIEW" && localProvisionPlan && (
          <OnboardingLocalPlanReviewPanel
            accentTextColor={accentTextColor}
            panelBorderColor={panelBorderColor}
            panelSurfaceColor={panelSurfaceColor}
            tintedPanelGradient={tintedPanelGradient}
            estimatedDownload={formatBytes(
              runtime.getLocalPlanDownloadBytes(localProvisionPlan, {
                includeVision: !skipVisionForNow,
              }),
            )}
            showTechnicalLocalPlan={showTechnicalLocalPlan}
            skipVisionForNow={skipVisionForNow}
            reviewItems={localPlanReviewItems}
            onToggleTechnical={handleLocalPlanToggleTechnical}
            onToggleSkipVision={(checked) => setSkipVisionForNow(checked)}
            onConfirm={handleConfirmLocalPlan}
            onBack={handleLocalPlanBack}
          />
        )}

        {step === "OLLAMA_INSTALL" && (
          <OllamaInstallPanel
            accentTextColor={accentTextColor}
            panelBorderColor={panelBorderColor}
            panelSurfaceColor={panelSurfaceColor}
            ambientThemeColor={ambientThemeColor}
            isActivating={isActivating}
            onInstall={handleInstallOllama}
            onUseNative={handleProceedWithCortex}
          />
        )}

        {step === "OLLAMA_WAKE" && (
          <OllamaWakePanel
            accentTextColor={accentTextColor}
            panelBorderColor={panelBorderColor}
            panelSurfaceColor={panelSurfaceColor}
            ambientThemeColor={ambientThemeColor}
            targetBrainModel={targetBrainModel}
            onResumeScan={handleResumeHardwareScan}
            onUseNative={handleProceedWithCortex}
          />
        )}

        {step === "PROVISION_LOCAL" && (
          <OnboardingProvisioningPanel
            accentTextColor={accentTextColor}
            panelBorderColor={panelBorderColor}
            panelSurfaceColor={panelSurfaceColor}
            provisionRows={runtime.getProvisionRows(localProvisionPlan)}
            downloadStates={downloadStates}
            provisioningOutcome={provisioningOutcome}
            provisionError={provisionError}
            onContinueWithoutVision={handleContinueWithoutVision}
            onRetryVisionCore={handleRetryVisionCore}
            onRetryProvisioning={handleRetryProvisioning}
          />
        )}

        {step === "CALIBRATION" && (
          <CalibrationPanel accentTextColor={accentTextColor} />
        )}

        {step === "COMPLETE" && (
          <CompletePanel accentTextColor={accentTextColor} />
        )}
      </div>

      {/* OS Info Footer */}
      {!isMobile &&
        !(step === "CONVERSATION" && conversationMode === "voice") && (
          <div
            className={`absolute bottom-4 text-[10px]  font-mono tracking-widest flex items-center gap-2`}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: accentTextColor }}
            />
            LucaOS v1.0.0 · Personal workspace
          </div>
        )}
    </div>
  );
};

export default OnboardingFlow;
