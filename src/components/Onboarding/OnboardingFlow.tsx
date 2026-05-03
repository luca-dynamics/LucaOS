import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon";
import { THEME_PALETTE, getDynamicContrast } from "../../config/themeColors";
import HologramFace from "./HologramFace";
import ModeSelect, { ConversationMode } from "./ModeSelect";
import ConversationalOnboarding from "./ConversationalOnboarding";
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
import { soundService } from "../../services/soundService";
import { settingsService } from "../../services/settingsService";
import { OperatorProfile } from "../../types/operatorProfile";
import { useMobile } from "../../hooks/useMobile";
import { modelManager } from "../../services/ModelManagerService";
import { apiUrl } from "../../config/api";
import {
  type LocalProvisionPlan,
  type ProvisionDownloadState,
  type ProvisioningOutcome,
  applyLocalProvisionPlan,
  buildLocalProvisionPlan,
  clearLocalProvisioningResume,
  evaluateLocalProvisioningState,
  getLocalPlanDownloadBytes,
  getProvisionDownloadIds,
  getProvisionRetryIds,
  getProvisionRows,
  isRecoverableLocalStep,
  persistLocalProvisioningResume,
  readLocalProvisioningResume,
  resolveLocalHardwarePlan,
  startLocalProvisioning,
  retryProvisionTargets,
} from "../../services/onboarding/LocalProvisioningService";
import {
  onboardingController,
  type OnboardingStep,
} from "../../services/onboarding/OnboardingController";
import {
  applyCloudOnboardingConfiguration,
  resolveOnboardingConversationMode,
  persistOperatorIdentity,
  saveFaceScanData,
} from "../../services/onboarding/OnboardingSetupService";
import {
  scheduleOnboardingDelay,
  startKernelBootSequence,
  waitForOnboardingDelay,
} from "../../services/onboarding/OnboardingLifecycleService";

type Step = OnboardingStep;

interface OnboardingFlowProps {
  theme: { primary: string; hex: string };
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

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  theme,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>("KERNEL_AWAKENING");
  const isMobile = useMobile();

  // Form State
  const [name, setName] = useState("");
  const [currentThemeHex, setCurrentThemeHex] = useState(theme.hex);
  const [currentThemeName, setCurrentThemeName] = useState<string>(
    () => (settingsService.get("general").theme as string) || "ASSISTANT",
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
  const provisionAutoAdvanceRef = useRef(false);

  // Boot Sequence Animation
  const [bootText, setBootText] = useState<string[]>([]);

  const isLightTheme =
    currentThemeName?.toUpperCase() === "LUCAGENT" ||
    currentThemeName?.toUpperCase() === "AGENTIC_SLATE" ||
    currentThemeName?.toUpperCase() === "LIGHTCREAM";

  const currentOpacity =
    settingsService.get("general")?.backgroundOpacity ?? 0.3;
  const currentContrast = getDynamicContrast(
    currentThemeName || "PROFESSIONAL",
    currentOpacity,
  );
  const useDarkLightThemeContrast = isLightTheme && currentOpacity >= 0.45;
  const accentTextColor = isLightTheme
    ? currentContrast.text
    : currentThemeHex;
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
      const setupComplete = settingsService.get("general")?.setupComplete;
      if (setupComplete) {
        clearLocalProvisioningResume();
        setResumeChecked(true);
        return;
      }

      const saved = readLocalProvisioningResume();
      if (!saved) {
        setResumeChecked(true);
        return;
      }
      if (!saved?.step || !isRecoverableLocalStep(saved.step)) {
        clearLocalProvisioningResume();
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
      console.warn("[Onboarding] Failed to restore local provisioning state:", e);
      clearLocalProvisioningResume();
    } finally {
      setResumeChecked(true);
    }
  }, []);

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
    applyLocalProvisionPlan(localProvisionPlan, {
      includeVision: !skipVisionForNow,
    });
    settingsService.setLocalDiscoveryOverride(true);
    setTargetBrainModel(localProvisionPlan.brain.downloadId || "");
    setStep(onboardingController.afterLocalPlanReview());
  };

  const handleDirectiveAlignmentComplete = () => {
    setStep(onboardingController.afterDirectiveAlignment());
  };

  const handleThemeStepComplete = () => {
    soundService.play("SUCCESS");
    setStep(onboardingController.afterThemeSelection());
  };

  const handleThemeChange = (newTheme: string) => {
    soundService.play("HOVER");
    setCurrentThemeName(newTheme);
    const hex =
      THEME_PALETTE[newTheme as keyof typeof THEME_PALETTE]?.primary ||
      "#ffffff";
    setCurrentThemeHex(hex);

    const currentGeneral = settingsService.get("general");
    settingsService.saveSettings({
      general: {
        ...currentGeneral,
        theme: newTheme,
      },
    });
  };

  const handleShowByok = () => {
    soundService.play("KEYSTROKE");
    setShowByok(true);
  };

  const handleHideByok = () => {
    setShowByok(false);
  };

  const handleSelectByokProvider = (
    provider: "gemini" | "openai" | "anthropic" | "xai",
  ) => {
    setByokProvider(provider);
    soundService.play("HOVER");
  };

  const handleChangeByokKey = (provider: string, value: string) => {
    setByokKeys((prev) => ({
      ...prev,
      [provider]: value,
    }));
  };

  const handleConversationBack = () => {
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
          sizeFormatted: modelManager.getModel(localProvisionPlan.brain.selectionId)
            ?.sizeFormatted,
        },
        {
          key: "stt",
          title: "Voice listening",
          subtitle: "Lets Luca hear and transcribe your speech offline.",
          modelId: localProvisionPlan.stt.id,
          label: localProvisionPlan.stt.label,
          sizeFormatted: modelManager.getModel(localProvisionPlan.stt.id)
            ?.sizeFormatted,
        },
        {
          key: "tts",
          title: "Voice speaking",
          subtitle: "Lets Luca answer aloud with a local voice.",
          modelId: localProvisionPlan.tts.id,
          label: localProvisionPlan.tts.label,
          sizeFormatted: modelManager.getModel(localProvisionPlan.tts.id)
            ?.sizeFormatted,
        },
        {
          key: "vision",
          title: "Vision",
          subtitle:
            "Helps Luca understand screenshots, interfaces, and images.",
          modelId: localProvisionPlan.vision.id,
          label: localProvisionPlan.vision.label,
          optional: true,
          sizeFormatted: modelManager.getModel(localProvisionPlan.vision.id)
            ?.sizeFormatted,
        },
        {
          key: "memory",
          title: "Memory",
          subtitle:
            "Improves retrieval and long-term recall with local embeddings.",
          modelId: localProvisionPlan.memory.id,
          label: localProvisionPlan.memory.label,
          sizeFormatted: modelManager.getModel(localProvisionPlan.memory.id)
            ?.sizeFormatted,
        },
      ]
    : [];

  useEffect(() => {
    if (!resumeChecked) return;

    if (isRecoverableLocalStep(step)) {
      persistLocalProvisioningResume({
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

    clearLocalProvisioningResume();
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
      const savedTheme = settingsService.get("general").theme as string;
      if (savedTheme && savedTheme !== currentThemeName) {
        setCurrentThemeName(savedTheme);
        const hex =
          THEME_PALETTE[savedTheme as keyof typeof THEME_PALETTE]?.primary ||
          theme.hex;
        setCurrentThemeHex(hex);
      }
    }
  }, [theme.hex, step]);

  useEffect(() => {
    if (!resumeChecked) return;

    if (step === "KERNEL_AWAKENING") {
      return startKernelBootSequence({
        onMessage: (message) => {
          setBootText((prev) => [...prev, message]);
        },
        onKeystroke: () => {
          soundService.play("KEYSTROKE");
        },
        onComplete: () => {
          setStep(onboardingController.afterKernelAwakening());
        },
      });
    }
  }, [step, resumeChecked]);

  // Manage Hardware Scanning
  useEffect(() => {
    if (step === "HARDWARE_SCAN") {
      const scanHardware = async () => {
        // Artificial delay for UX "Scanning" effect
        await waitForOnboardingDelay(2500);
        const resolution = await resolveLocalHardwarePlan();

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
  }, [step]);

  // Method called if the user clicks "Proceed with Native Cortex Download"
  const handleProceedWithCortex = () => {
    if (!targetBrainModel) return;
    const plan = buildLocalProvisionPlan(targetBrainModel, false);
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
      startLocalProvisioning(localProvisionPlan, {
        includeVision: !skipVisionForNow,
      });
    }
  }, [step, localProvisionPlan, skipVisionForNow]);

  // Track Multi-Model Download Progress
  useEffect(() => {
    if (step !== "PROVISION_LOCAL" || !localProvisionPlan) return;

    const applyProvisionSnapshot = (models?: any[]) => {
      const snapshot = evaluateLocalProvisioningState(localProvisionPlan, {
        includeVision: !skipVisionForNow,
        models,
      });

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

    const unsubscribe = modelManager.subscribe((models: any[]) => {
      applyProvisionSnapshot(models);
    });

    return () => unsubscribe();
  }, [step, localProvisionPlan, skipVisionForNow]);

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      soundService.play("SUCCESS");
      persistOperatorIdentity(name);
      setStep(onboardingController.afterIdentityHandshake());
    }
  };

  const handleActivateCloud = async () => {
    setIsActivating(true);
    resetLocalProvisioningDraft();
    soundService.play("SUCCESS");
    await waitForOnboardingDelay(1500);
    applyCloudOnboardingConfiguration({
      showByok,
      provider: byokProvider,
      apiKey: showByok ? byokKeys[byokProvider] : "",
    });

    setIsActivating(false);
    setStep(onboardingController.afterCloudActivation());
  };

  const handleGoLocal = () => {
    soundService.play("SUCCESS");
    resetLocalProvisioningDraft();
    settingsService.setLocalDiscoveryOverride(true);
    setStep(onboardingController.afterGoLocal());
  };

  const handleInstallOllama = async () => {
    setIsActivating(true);
    soundService.play("SUCCESS");
    const result = await modelManager.installOllama();
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
    retryProvisionTargets([localProvisionPlan.vision.id], setDownloadStates);
  };

  const handleRetryProvisioning = () => {
    if (!localProvisionPlan) return;
    setProvisionError(false);
    setProvisioningOutcome(null);
    const retryIds = getProvisionRetryIds(localProvisionPlan, failedProvisionKeys, {
      includeVision: !skipVisionForNow,
    });
    retryProvisionTargets(retryIds, setDownloadStates);
  };

  const handleFaceScanComplete = (faceData: string | null) => {
    saveFaceScanData(faceData);
    setStep(onboardingController.afterFaceScan());
  };

  const handleModeSelect = async (mode: ConversationMode) => {
    setConversationMode(mode);
    soundService.play("KEYSTROKE");

    const isElectron = !!(
      (window as any).electron && (window as any).electron.ipcRenderer
    );

    const resolvedMode = await resolveOnboardingConversationMode(
      mode,
      isElectron,
    );
    if (resolvedMode.mode !== mode) {
      setConversationMode(resolvedMode.mode);
    }
    if (resolvedMode.fallbackMessage) {
      alert(resolvedMode.fallbackMessage);
    }

    setStep(onboardingController.afterModeSelection(mode));
  };

  useEffect(() => {
    if (step === "CALIBRATION") {
      return scheduleOnboardingDelay(() => {
        setStep(onboardingController.afterCalibration());
      }, 1500);
    }

    if (step === "COMPLETE") {
      soundService.play("SUCCESS");
      return scheduleOnboardingDelay(() => {
        // Pass the selected conversation mode to the completion handler
        onComplete(profile || undefined, conversationMode || undefined);
      }, 1500);
    }
  }, [step, onComplete, profile, conversationMode, isDownloadingLocal]);

  return (
    <div
      className={`absolute inset-0 z-10  font-mono flex flex-col items-center justify-center overflow-hidden`}
    >
      {/* Background handled by App.tsx (LiquidBackground) */}

      <div
        className="glass-noise transition-opacity duration-700"
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
      {!["KERNEL_AWAKENING", "DIRECTIVE_ALIGNMENT"].includes(step) &&
        !(step === "CONVERSATION" && conversationMode === "text") && (
          <HologramFace step={step} />
        )}

      {/* Primary UI Layer */}
      <div
        className={`z-10 relative transition-all duration-700 ease-in-out mx-auto flex flex-col items-center ${
          step === "CONVERSATION"
            ? conversationMode === "voice"
              ? "w-full h-full justify-center"
              : isMobile
                ? "w-[95vw] h-[90vh] px-4 justify-center"
                : "w-[min(80vmin,1000px)] h-[min(75vmin,800px)] justify-center"
            : step === "THEME"
              ? isMobile
                ? "w-[92vw] h-[88vh] max-h-[88vh] justify-start pt-6"
                : "w-full max-w-2xl h-[min(88vh,860px)] max-h-[88vh] px-4 justify-start pt-8"
              : isMobile
                ? "w-[85vw] justify-center"
                : "w-[min(90vw,1000px)] justify-center"
        }`}
        style={{
          padding:
            step === "CONVERSATION" ? "0" : "clamp(0.5rem, 2vmin, 1.5rem)",
          transform:
            step === "CONVERSATION" && conversationMode === "voice"
              ? "none"
              : "translateZ(0)",
        }}
      >
        {step === "KERNEL_AWAKENING" && (
          <div className="space-y-2">
            {bootText.map((text, i) => (
              <div
                key={i}
                className="text-sm animate-fade-in"
                style={{ color: ambientThemeColor }}
              >
                {">"} {text}
              </div>
            ))}
            <div
              className="w-2 h-4 animate-pulse inline-block ml-2"
              style={{ backgroundColor: ambientThemeColor }}
            />
          </div>
        )}

        {step === "DIRECTIVE_ALIGNMENT" && (
          <ConstitutionalAlignment onComplete={handleDirectiveAlignmentComplete} />
        )}

        {step === "THEME" && (
          <ThemeSelectionStep
            onComplete={handleThemeStepComplete}
            onThemeChange={handleThemeChange}
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
          <ModeSelect onSelect={handleModeSelect} isLightTheme={isLightTheme} />
        )}

        {step === "CONVERSATION" && conversationMode && (
          <ConversationalOnboarding
            mode={conversationMode}
            userName={name}
            theme={{ primary: currentThemeName, hex: currentThemeHex }}
            onBack={handleConversationBack}
            onComplete={handleConversationComplete}
          />
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
              getLocalPlanDownloadBytes(localProvisionPlan, {
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
            provisionRows={getProvisionRows(localProvisionPlan)}
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
      {!(step === "CONVERSATION" && conversationMode === "voice") && (
        <div
          className={`absolute bottom-4 text-[10px]  font-mono tracking-widest flex items-center gap-2`}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: accentTextColor }}
          />
          L.U.C.A OS v1.0.0 // PROTOCOL_CONNECTED
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;
