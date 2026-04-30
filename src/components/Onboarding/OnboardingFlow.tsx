import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { THEME_PALETTE, getDynamicContrast } from "../../config/themeColors";
import { motion } from "framer-motion";
import HologramFace from "./HologramFace";
import ModeSelect, { ConversationMode } from "./ModeSelect";
import ConversationalOnboarding from "./ConversationalOnboarding";
import FaceScan from "./FaceScan";
import ConstitutionalAlignment from "./ConstitutionalAlignment";
import ThemeSelectionStep from "./ThemeSelectionStep";
import { soundService } from "../../services/soundService";
import { settingsService } from "../../services/settingsService";
import { requestVoicePermission } from "../../utils/voicePermissions";
import { personalityService } from "../../services/personalityService";
import { OperatorProfile } from "../../types/operatorProfile";
import { useMobile } from "../../hooks/useMobile";
import { modelManager } from "../../services/ModelManagerService";
import { apiUrl } from "../../config/api";

type Step =
  | "KERNEL_AWAKENING"
  | "DIRECTIVE_ALIGNMENT"
  | "THEME"
  | "NEURAL_HANDSHAKE"
  | "FACE_SCAN"
  | "COGNITIVE_CORE_SELECTION"
  | "HARDWARE_SCAN"
  | "OLLAMA_INSTALL"
  | "OLLAMA_WAKE"
  | "PROVISION_LOCAL"
  | "MODE_SELECT"
  | "CONVERSATION"
  | "CALIBRATION"
  | "COMPLETE";

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
  const [downloadStates, setDownloadStates] = useState<
    Record<string, { progress: number; status: string }>
  >({});
  const [provisionError, setProvisionError] = useState(false);
  const [isDownloadingLocal, setIsDownloadingLocal] = useState(false);

  // Boot Sequence Animation
  const [bootText, setBootText] = useState<string[]>([]);

  useEffect(() => {
    const opacity = settingsService.get("general")?.backgroundOpacity ?? 0.3;
    const dynamicContrast = getDynamicContrast(
      currentThemeName || "PROFESSIONAL",
      opacity,
    );
    const root = document.documentElement;
    root.style.setProperty("--app-text-main", dynamicContrast.text);
    root.style.setProperty("--app-text-muted", dynamicContrast.textMuted);
    root.style.setProperty("--app-border-main", dynamicContrast.border);
    root.style.setProperty("--app-bg-tint", dynamicContrast.bgTint);
  }, [currentThemeName, step]);

  const isLightTheme =
    currentThemeName?.toUpperCase() === "LUCAGENT" ||
    currentThemeName?.toUpperCase() === "AGENTIC_SLATE" ||
    currentThemeName?.toUpperCase() === "LIGHTCREAM";

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
    if (step === "KERNEL_AWAKENING") {
      const messages = [
        "KERNEL AWAKENING IN PROGRESS...",
        "STABILIZING LUCA TENSORS...",
        "GENERATING IDENTITY KEYPAIR [ED25519]...",
        "LUCA AGENT INITIALIZED.",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < messages.length) {
          setBootText((prev) => [...prev, messages[i]]);
          soundService.play("KEYSTROKE");
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setStep("DIRECTIVE_ALIGNMENT"), 1000);
        }
      }, 800);

      return () => clearInterval(interval);
    }
  }, [step]);

  // Manage Hardware Scanning
  useEffect(() => {
    if (step === "HARDWARE_SCAN") {
      const scanHardware = async () => {
        // Artificial delay for UX "Scanning" effect
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await modelManager.refreshStatus();
        const ollamaStatus = await modelManager.getOllamaModels();

        let targetModel = "llama-3.2-1b"; // Safe fallback
        let bypassBrainDownload = false;

        // 1. Silent Ollama Integration (Hybrid Auto-Detect)
        if (
          ollamaStatus.available &&
          ollamaStatus.models &&
          ollamaStatus.models.length > 0
        ) {
          const names = ollamaStatus.models.map((m: any) => m.name);
          if (
            names.some(
              (n: string) =>
                n.includes("qwen2.5:7b") || n.includes("qwen2.5:latest"),
            )
          ) {
            targetModel = "qwen-2.5-7b";
            bypassBrainDownload = true;
          } else if (
            names.some(
              (n: string) =>
                n.includes("phi3:mini") || n.includes("phi3:latest"),
            )
          ) {
            targetModel = "phi-3-mini";
            bypassBrainDownload = true;
          } else if (
            names.some(
              (n: string) =>
                n.includes("llama3.2:1b") || n.includes("llama3.2:latest"),
            )
          ) {
            targetModel = "llama-3.2-1b";
            bypassBrainDownload = true;
          } else {
            targetModel = names[0]; // Fallback to their first installed custom Ollama model
            bypassBrainDownload = true;
          }
        }

        // 2. Native Cortex Hardware Sweep (If Ollama is missing or empty)
        let isHighEndHardware = false;
        if (!bypassBrainDownload) {
          const qwenStatus = modelManager.getModel("qwen-2.5-7b")?.status;
          const phiStatus = modelManager.getModel("phi-3-mini")?.status;

          // Pick highest tier natively supported model based on hardware specs
          if (qwenStatus && qwenStatus !== "unsupported") {
            targetModel = "qwen-2.5-7b";
            isHighEndHardware = true; // They should probably be using Ollama!
          } else if (phiStatus && phiStatus !== "unsupported") {
            targetModel = "phi-3-mini";
            isHighEndHardware = true;
          }
        }

        // 3. Automated Ollama Setup
        if (!ollamaStatus.available && !bypassBrainDownload) {
          const installed = await modelManager.isOllamaInstalled();

          if (installed) {
            // It's installed but not running - try to start it
            const started = await modelManager.startOllama();
            if (started) {
              // Poll for up to 15 seconds to ensure Ollama is actually responding
              let isReady = false;
              for (let i = 0; i < 15; i++) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                const statusCheck = await modelManager.getOllamaModels();
                if (statusCheck && statusCheck.available) {
                  isReady = true;
                  break;
                }
              }

              if (isReady) {
                scanHardware(); // Recursive retry now that it's verified running
                return;
              } else {
                console.warn(
                  "[HardwareScan] Ollama process started but API is unresponsive.",
                );
                // Fall through to high-end hardware check if it failed to boot properly
              }
            }
          } else if (isHighEndHardware) {
            // Powerful machine but no Ollama - offer to install
            setTargetBrainModel(targetModel);
            setStep("OLLAMA_INSTALL");
            return;
          }
        }

        const currentBrain = settingsService.get("brain");
        const currentVoice = settingsService.get("voice");

        const isCustomOllama =
          bypassBrainDownload &&
          !["qwen-2.5-7b", "phi-3-mini", "llama-3.2-1b"].includes(targetModel);

        settingsService.saveSettings({
          brain: {
            ...currentBrain,
            useCustomApiKey: false,
            model: isCustomOllama ? targetModel : `local/${targetModel}`,
            embeddingModel: "local/nomic-embed-text",
          },
          voice: {
            ...currentVoice,
            provider: "local-luca",
            sttModel: "whisper-tiny",
            voiceId: "en_US-amy-medium",
          },
        });

        // Instruct PROVISION_LOCAL to only download the audio models if Ollama handled the Brain
        setTargetBrainModel(bypassBrainDownload ? "" : targetModel);
        setStep("PROVISION_LOCAL");
      };
      scanHardware();
    }
  }, [step]);

  // Method called if the user clicks "Proceed with Native Cortex Download"
  const handleProceedWithCortex = () => {
    const currentBrain = settingsService.get("brain");
    const currentVoice = settingsService.get("voice");

    settingsService.saveSettings({
      brain: {
        ...currentBrain,
        useCustomApiKey: false,
        model: `local/${targetBrainModel}`,
        embeddingModel: "local/nomic-embed-text",
      },
      voice: {
        ...currentVoice,
        provider: "local-luca",
        sttModel: "whisper-tiny",
        voiceId: "en_US-amy-medium",
      },
    });

    settingsService.setLocalDiscoveryOverride(true);
    setStep("PROVISION_LOCAL");
  };

  // Manage Local Provisioning Triggers
  useEffect(() => {
    if (step === "PROVISION_LOCAL") {
      setProvisionError(false);
      setIsDownloadingLocal(true);

      const modelsToEnsure = [
        targetBrainModel,
        "whisper-tiny",
        "piper-amy",
        "nomic-embed-text", // Required for Split-Mind HDC
      ].filter(Boolean) as string[];

      modelsToEnsure.forEach((id) => {
        const m = modelManager.getModel(id);
        if (m && m.status !== "ready" && m.status !== "downloading") {
          modelManager.downloadModel(id);
        }
      });
    }
  }, [step, targetBrainModel]);

  // Track Multi-Model Download Progress
  useEffect(() => {
    const unsubscribe = modelManager.subscribe((models: any[]) => {
      const activeTargets = [
        targetBrainModel,
        "whisper-tiny",
        "piper-amy",
      ].filter(Boolean) as string[];

      const newStates: Record<string, { progress: number; status: string }> =
        {};
      let allReady = activeTargets.length > 0;
      let anyError = false;

      for (const targetId of activeTargets) {
        const m = models.find((mod) => mod.id === targetId);
        if (m) {
          newStates[targetId] = {
            progress: m.downloadProgress || 0,
            status: m.status,
          };
          if (m.status !== "ready") allReady = false;
          if (m.status === "error") anyError = true;
        } else {
          allReady = false;
        }
      }

      setDownloadStates(newStates);

      if (anyError) {
        setProvisionError(true);
      } else if (allReady && step === "PROVISION_LOCAL") {
        setTimeout(() => setStep("MODE_SELECT"), 1200);
      }
    });

    return () => unsubscribe();
  }, [step, targetBrainModel]);

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      soundService.play("SUCCESS");
      localStorage.setItem("LUCA_USER_NAME", name);

      const currentGen = settingsService.get("general");
      settingsService.saveSettings({
        general: { ...currentGen, userName: name },
      });

      personalityService.initializeForOperator(name);
      setStep("FACE_SCAN");
    }
  };

  const handleActivateCloud = async () => {
    setIsActivating(true);
    soundService.play("SUCCESS");

    setTimeout(() => {
      const currentBrain = settingsService.get("brain");
      const currentVoice = settingsService.get("voice");
      const activeKey = showByok ? byokKeys[byokProvider] : "";
      const brainSettings: any = {
        ...currentBrain,
        useCustomApiKey: showByok && !!activeKey,
      };

      if (showByok && activeKey) {
        if (byokProvider === "gemini") {
          brainSettings.geminiApiKey = activeKey;
          brainSettings.model = "gemini-3-flash-preview";
        } else if (byokProvider === "openai") {
          brainSettings.openaiApiKey = activeKey;
          brainSettings.model = "gpt-4.1-mini";
        } else if (byokProvider === "anthropic") {
          brainSettings.anthropicApiKey = activeKey;
          brainSettings.model = "claude-sonnet-4-5";
        } else if (byokProvider === "xai") {
          brainSettings.xaiApiKey = activeKey;
          brainSettings.model = "grok-beta";
        }
      } else {
        brainSettings.model = "gemini-3-flash-preview";
      }

      settingsService.saveSettings({
        brain: {
          ...brainSettings,
          embeddingModel: (showByok && byokProvider === "gemini" ? "gemini-2.1-flash" : "local/nomic-embed-text") as any,
        },
        voice: {
          ...currentVoice,
          provider: "gemini-genai", // Cloud voice (not local-luca)
          voiceId: "Aoede", // Standard Gemini Voice (fixes 1007 "NATIVE" error)
          sttModel: "cloud-gemini", // Standard Gemini STT
        },
      });

      setIsActivating(false);
      setStep("MODE_SELECT");
    }, 1500);
  };

  const handleGoLocal = () => {
    soundService.play("SUCCESS");
    settingsService.setLocalDiscoveryOverride(true);
    setStep("HARDWARE_SCAN");
  };

  const handleFaceScanComplete = (faceData: string | null) => {
    if (faceData) {
      settingsService.saveFaceData(faceData);
    }
    setStep("COGNITIVE_CORE_SELECTION");
  };

  const handleModeSelect = async (mode: ConversationMode) => {
    setConversationMode(mode);
    soundService.play("KEYSTROKE");

    const isElectron = !!(
      (window as any).electron && (window as any).electron.ipcRenderer
    );

    if (!isElectron) {
      // PROACTIVE PERMISSION GATING (Web Version)
      // We only request what is strictly necessary for the selected mode
      if (mode === "voice") {
        console.log("[Onboarding] Voice Mode: Requesting Microphone...");
        const granted = await requestVoicePermission();
        if (!granted) {
          alert(
            "Microphone access is required for voice mode. Falling back to text.",
          );
          setConversationMode("text");
        }
      } else {
        console.log("[Onboarding] Text Mode: No proactive permissions needed.");
      }
    } else {
      // Desktop Version (Lazy Permissions)
      if (mode === "voice") {
        const granted = await requestVoicePermission();
        if (!granted) {
          alert(
            "Microphone access required for voice mode. Falling back to text.",
          );
          setConversationMode("text");
        }
      }
    }

    setStep("CONVERSATION");
  };

  useEffect(() => {
    if (step === "CALIBRATION") {
      const timer = setTimeout(() => {
        setStep("COMPLETE");
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (step === "COMPLETE") {
      soundService.play("SUCCESS");
      const timer = setTimeout(() => {
        // Pass the selected conversation mode to the completion handler
        onComplete(profile || undefined, conversationMode || undefined);
      }, 1500);
      return () => clearTimeout(timer);
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
          backgroundImage: `radial-gradient(${isLightTheme ? currentThemeHex + "60" : currentThemeHex + "40"} 1px, transparent 1px)`,
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
                style={{ color: currentThemeHex }}
              >
                {">"} {text}
              </div>
            ))}
            <div
              className="w-2 h-4 animate-pulse inline-block ml-2"
              style={{ backgroundColor: currentThemeHex }}
            />
          </div>
        )}

        {step === "DIRECTIVE_ALIGNMENT" && (
          <ConstitutionalAlignment onComplete={() => setStep("THEME")} />
        )}

        {step === "THEME" && (
          <ThemeSelectionStep
            onComplete={() => {
              soundService.play("SUCCESS");
              setStep("NEURAL_HANDSHAKE");
            }}
            onThemeChange={(newTheme) => {
              soundService.play("HOVER");
              setCurrentThemeName(newTheme);
              const hex =
                THEME_PALETTE[newTheme as keyof typeof THEME_PALETTE]
                  ?.primary || "#ffffff";
              setCurrentThemeHex(hex);

              const currentGen = settingsService.get("general");
              settingsService.saveSettings({
                general: {
                  ...currentGen,
                  theme: newTheme,
                },
              });
            }}
          />
        )}

        {step === "NEURAL_HANDSHAKE" && (
          <form
            onSubmit={handleIdentitySubmit}
            className="animate-fade-in-up w-full max-w-sm mx-auto"
            style={{ gap: "3vmin", display: "flex", flexDirection: "column" }}
          >
            <div
              className="text-center"
              style={{
                gap: "1.5vmin",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Icon
                name="Terminal"
                variant="Linear"
                className="mx-auto mb-2"
                style={{
                  color: currentThemeHex,
                  width: "clamp(2rem, 10vmin, 4rem)",
                  height: "clamp(2rem, 10vmin, 4rem)",
                }}
              />
              <h1
                className="font-bold tracking-widest uppercase"
                style={{
                  color: currentThemeHex,
                  fontSize: "clamp(1.2rem, 4.5vmin, 2rem)",
                }}
              >
                Luca Handshake
              </h1>
              <p
                className={` text-center font-medium`}
                style={{ fontSize: "clamp(0.6rem, 1.8vmin, 0.85rem)" }}
              >
                Define your operator alias...
              </p>
            </div>

            <div className="space-y-2">
              <label
                className="text-xs uppercase tracking-wider block text-center"
                style={{ color: `${currentThemeHex}80` }}
              >
                Operator Alias
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full border rounded-xl p-3 outline-none transition-all text-center text-lg placeholder-[var(--app-text-muted)] backdrop-blur-md text-[var(--app-text-main)]`}
                placeholder="ENTER NAME"
                style={{
                  borderColor: "var(--app-border-main)",
                  backgroundColor: "var(--app-bg-tint)",
                  boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full max-w-sm mx-auto border rounded-xl py-3 uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                backgroundColor: hexToRgba(currentThemeHex, 0.1),
                backgroundImage: `linear-gradient(135deg, ${hexToRgba(
                  currentThemeHex,
                  0.2,
                )} 0%, ${hexToRgba(currentThemeHex, 0.08)} 100%)`,
                boxShadow: `0 4px 20px ${hexToRgba(
                  currentThemeHex,
                  0.1,
                )}, inset 0 1px 0 ${hexToRgba(currentThemeHex, 0.15)}`,
                color: name ? "var(--app-text-main)" : "var(--app-text-muted)",
              }}
            >
              Initialize Protocol{" "}
              <Icon
                name="AltArrowRight"
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </form>
        )}

        {step === "COGNITIVE_CORE_SELECTION" && (
          <div
            className="animate-fade-in-up w-full px-4 sm:px-6"
            style={{ 
              gap: isMobile ? "3vmin" : "4vmin", 
              display: "flex", 
              flexDirection: "column",
              maxWidth: isMobile ? "420px" : "1000px" 
            }}
          >
            <div
              className="text-center"
              style={{
                gap: "1.5vmin",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="mx-auto mb-2 flex items-center justify-center rounded-full border glass-blur transition-all"
                style={{
                  width: "clamp(2rem, 10vmin, 4rem)",
                  height: "clamp(2rem, 10vmin, 4rem)",
                  borderColor: "var(--app-border-main)",
                  backgroundColor: "var(--app-bg-tint)",
                }}
              >
                <Icon
                  name="Key"
                  variant="Linear"
                  style={{
                    color: currentThemeHex,
                    width: "clamp(1rem, 5vmin, 2rem)",
                    height: "clamp(1rem, 5vmin, 2rem)",
                  }}
                />
              </div>
              <h1
                className="font-bold tracking-widest uppercase"
                style={{
                  color: "var(--app-text-main)",
                  fontSize: "clamp(1.2rem, 4.5vmin, 2rem)",
                }}
              >
                Luca Core
              </h1>
              <p
                className="max-w-md mx-auto font-medium opacity-80"
                style={{ fontSize: "clamp(0.6rem, 1.8vmin, 0.85rem)", color: "var(--app-text-muted)" }}
              >
                Choose how Luca processes your thoughts. Secure local compute or cloud-enhanced agency.
              </p>
            </div>

            {!showByok ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl mx-auto">
                  {/* Luca Prime (Cloud) */}
                  <button
                    type="button"
                    onClick={handleActivateCloud}
                    disabled={isActivating}
                    className="relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl border backdrop-blur-xl transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      background: `linear-gradient(135deg, ${hexToRgba(currentThemeHex, 0.08)} 0%, rgba(255, 255, 255, 0.02) 100%)`,
                      boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`,
                    }}
                  >
                    {/* Recommendation Badge */}
                    {((navigator as any).deviceMemory || 8) < 8 && (
                       <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg border animate-pulse bg-yellow-500/20 border-yellow-500/40" style={{ color: "var(--app-text-main)" }}>
                         LUCA RECOMMEND
                       </div>
                    )}

                    <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                      <Icon
                        name="Stars"
                        variant="Bold"
                        size={isMobile ? 28 : 36}
                        color="var(--app-text-main)"
                        className="group-hover:rotate-12 transition-transform duration-500"
                      />
                    </div>
                    
                    <h3 className="text-sm sm:text-base font-bold tracking-widest uppercase mb-2" style={{ color: "var(--app-text-main)" }}>
                      Luca Prime
                    </h3>
                    <p className="text-[10px] sm:text-xs opacity-70 leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
                      Maximum reasoning power via cloud-managed agency. Multi-modal, lightning fast.
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                      {isActivating ? "Establishing Link..." : "ACTIVATE CLOUD"}
                      {!isActivating && <Icon name="AltArrowRight" size={12} />}
                    </div>
                  </button>

                  {/* Local Core */}
                  <button
                    type="button"
                    onClick={handleGoLocal}
                    className="relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl border backdrop-blur-xl transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
                      boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`,
                    }}
                  >
                    {/* Recommendation Badge */}
                    {((navigator as any).deviceMemory || 8) >= 8 && (
                       <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg border animate-pulse bg-green-500/20 border-green-500/40" style={{ color: "var(--app-text-main)" }}>
                         LUCA RECOMMEND
                       </div>
                    )}

                    <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                      <Icon
                        name="ShieldCheck"
                        variant="Bold"
                        size={isMobile ? 28 : 36}
                        color={currentThemeHex}
                        className="group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    
                    <h3 className="text-sm sm:text-base font-bold tracking-widest uppercase mb-2" style={{ color: "var(--app-text-main)" }}>
                      Go Local 
                    </h3>
                    <p className="text-[10px] sm:text-xs opacity-70 leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
                      100% private, sovereign compute. Your data never leaves this machine. 
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                      INITIALIZE OFFLINE
                      <Icon name="AltArrowRight" size={12} />
                    </div>
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.play("KEYSTROKE");
                      setShowByok(true);
                    }}
                    className="w-full max-w-md mx-auto text-[10px] py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all uppercase tracking-widest font-bold flex items-center justify-center gap-2 glass-blur hover:bg-white/5"
                    style={{
                      color: "var(--app-text-main)",
                    }}
                  >
                    <Icon name="Key" size={14} color={currentThemeHex} />
                    Bring Your Own Key (BYOK)
                  </button>
                  <p className="text-[9px] text-center uppercase tracking-[0.2em] font-bold opacity-40">
                    Managed Professional Gateway
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-6 animate-fade-in w-full max-w-xl mx-auto border rounded-3xl p-6 sm:p-8 backdrop-blur-xl" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowByok(false)}
                    className="text-[9px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    <Icon name="AltArrowLeft" size={10} /> Back
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Provider Selection
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      id: "gemini",
                      name: "Gemini",
                      color: "#4285F4",
                      logo: "/icons/brands/gemini-color.svg",
                    },
                    {
                      id: "openai",
                      name: "OpenAI",
                      color: "#10a37f",
                      logo: "/icons/brands/openai.svg",
                    },
                    {
                      id: "anthropic",
                      name: "Claude",
                      color: "#d97757",
                      logo: "/icons/brands/claude-color.svg",
                    },
                    {
                      id: "xai",
                      name: "xAI",
                      color: "#fff",
                      logo: "/icons/brands/grok.svg",
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setByokProvider(p.id as any);
                        soundService.play("HOVER");
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        byokProvider === p.id
                          ? "border-white/40 bg-white/10 shadow-lg scale-105"
                          : "border-white/5 bg-black/20 opacity-50 hover:opacity-100"
                      }`}
                      style={{
                        borderColor: byokProvider === p.id ? p.color + "40" : "rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        className="rounded-full flex items-center justify-center p-2"
                        style={{
                          width: "3rem",
                          height: "3rem",
                          backgroundColor: byokProvider === p.id ? p.color + "20" : "rgba(255,255,255,0.05)",
                        }}
                      >
                        <img
                          src={p.logo}
                          alt={p.name}
                          className={`w-full h-full object-contain ${
                            p.id === "xai" && !isLightTheme ? "invert" : ""
                          }`}
                        />
                      </div>
                      <span className="text-[8px] uppercase font-bold tracking-tighter">{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest opacity-60 px-1 font-bold">
                    {byokProvider.toUpperCase()} API KEY
                  </label>
                  <input
                    type="password"
                    value={byokKeys[byokProvider]}
                    onChange={(e) =>
                      setByokKeys((prev) => ({
                        ...prev,
                        [byokProvider]: e.target.value,
                      }))
                    }
                    placeholder="ENTER KEY"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-white/30 transition-all font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleActivateCloud}
                  disabled={!byokKeys[byokProvider] || isActivating}
                  className="w-full border rounded-xl py-4 uppercase tracking-widest text-[10px] font-bold transition-all flex items-center justify-center gap-2 group disabled:opacity-30"
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    backgroundColor: hexToRgba(currentThemeHex, 0.2),
                    color: "var(--app-text-main)",
                  }}
                >
                  {isActivating ? "Verifying..." : "Link My Cloud Brain"}
                  {!isActivating && <Icon name="AltArrowRight" size={14} />}
                </button>
              </div>
            )}
          </div>
        )}

        {step === "FACE_SCAN" && (
          <FaceScan
            userName={name}
            compact={isMobile}
            isLightTheme={isLightTheme}
            theme={settingsService.get("general").theme || "PROFESSIONAL"}
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
            onBack={() => setStep("MODE_SELECT")}
            onComplete={(completedProfile) => {
              setProfile(completedProfile);
              setStep("CALIBRATION");
            }}
          />
        )}

        {step === "HARDWARE_SCAN" && (
          <div className="text-center space-y-6 animate-fade-in-up w-full max-w-sm mx-auto">
            <div className="space-y-6">
              <div
                className="border-4 border-t-transparent rounded-full animate-pulse animate-spin mx-auto mix-blend-screen"
                style={{
                  width: "clamp(2.5rem, 10vmin, 4.5rem)",
                  height: "clamp(2.5rem, 10vmin, 4.5rem)",
                  borderColor: currentThemeHex,
                  borderTopColor: "transparent",
                }}
              />
              <div className="space-y-2">
                <h2
                  className="font-bold tracking-widest uppercase"
                  style={{
                    color: currentThemeHex,
                    fontSize: "clamp(1rem, 3vw, 1.25rem)",
                  }}
                >
                  Hardware Scan
                </h2>
                <p
                  className={``}
                  style={{ fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" }}
                >
                  Analyzing architecture tensors...
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "OLLAMA_INSTALL" && (
          <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto relative z-10">
            <div
              className="bg-white/10 p-8 rounded-3xl border backdrop-blur-xl text-center space-y-8 shadow-2xl"
              style={{ borderColor: hexToRgba(currentThemeHex, 0.4) }}
            >
              <div
                className="rounded-2xl mx-auto flex items-center justify-center bg-black/30 border-2"
                style={{
                  borderColor: hexToRgba(currentThemeHex, 0.3),
                  width: "clamp(3rem, 12vmin, 5rem)",
                  height: "clamp(3rem, 12vmin, 5rem)",
                }}
              >
                <Icon
                  name="Cpu"
                  variant="Linear"
                  style={{
                    color: currentThemeHex,
                    width: "50%",
                    height: "50%",
                  }}
                />
              </div>

              <div className="space-y-3">
                <h2
                  className="text-2xl font-bold tracking-widest uppercase"
                  style={{ color: currentThemeHex }}
                >
                  Upgrade to Ollama?
                </h2>
                <p className={`text-sm  leading-relaxed`}>
                  I&apos;ve detected that your hardware is powerful enough to
                  run high-fidelity models locally.
                  <br className="my-2" />
                  Would you like me to install and configure **Ollama**? It will
                  allow me to run much smarter models with near-zero latency.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={async () => {
                    setIsActivating(true);
                    soundService.play("SUCCESS");
                    const result = await modelManager.installOllama();
                    setIsActivating(false);
                    if (result.success) {
                      // Wait briefly then retry scan
                      setTimeout(() => setStep("HARDWARE_SCAN"), 2000);
                    } else {
                      alert(
                        result.message ||
                          "Installation failed. Please try manual setup.",
                      );
                      setStep("OLLAMA_WAKE");
                    }
                  }}
                  disabled={isActivating}
                  className="w-full max-w-md mx-auto flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 rounded-2xl py-5 border border-white/20 uppercase tracking-widest text-sm font-bold transition-all relative group overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-20 mix-blend-screen transition-opacity group-hover:opacity-40"
                    style={{ backgroundColor: currentThemeHex }}
                  />
                  {isActivating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Icon name="Sparkles" variant="Bold" size={18} className="text-yellow-400" />
                  )}
                  <span style={{ color: "var(--app-text-main)" }}>
                    {isActivating ? "Installing..." : "Yes, Let's do it"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedWithCortex}
                  className={`w-full max-w-md mx-auto text-[10px]  uppercase tracking-widest font-bold transition-all`}
                >
                  No thanks, use native models
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "OLLAMA_WAKE" && (
          <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto relative z-10">
            <div
              className="bg-white/5 p-6 rounded-2xl border backdrop-blur-md text-center space-y-6 shadow-xl"
              style={{ borderColor: hexToRgba(currentThemeHex, 0.3) }}
            >
              <div
                className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-black/20 border"
                style={{ borderColor: hexToRgba(currentThemeHex, 0.2) }}
              >
                <Icon
                  name="Cpu"
                  variant="Linear"
                  className="w-6 h-6"
                  style={{ color: currentThemeHex }}
                />
              </div>

              <div className="space-y-2">
                <h2
                  className="text-xl font-bold tracking-widest uppercase"
                  style={{ color: currentThemeHex }}
                >
                  Ollama Detected (Sleeping)
                </h2>
                <p className={`text-xs  leading-relaxed`}>
                  Luca has detected an internal architecture capable of running{" "}
                  <strong>{targetBrainModel}</strong>.
                  <br className="my-2" />
                  To achieve maximum raw speed and bypass the heavy native
                  software download, please open your Mac terminal and execute:
                </p>
              </div>

              <div className="bg-black/40 rounded-lg p-3 font-mono text-sm border border-white/5 font-bold tracking-widest select-all">
                ollama serve
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("HARDWARE_SCAN")}
                  className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-black/20 hover:bg-black/40 rounded-xl py-3 border border-white/10 uppercase tracking-widest text-[10px] font-bold transition-all relative group overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-20 mix-blend-screen transition-opacity group-hover:opacity-40"
                    style={{ backgroundColor: currentThemeHex }}
                  />
                  <Icon
                    name="Activity"
                    variant="Linear"
                    size={12}
                    style={{ color: currentThemeHex }}
                  />
                  <span style={{ color: "var(--app-text-main)" }}>
                    Resume Hardware Scan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedWithCortex}
                  className={`w-full max-w-md mx-auto text-[10px]  uppercase tracking-widest font-bold transition-colors`}
                >
                  Proceed with Native Download
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "PROVISION_LOCAL" && (
          <div className="space-y-6 animate-fade-in-up w-full max-w-md mx-auto relative z-10">
            <div className="text-center space-y-2 mb-8">
              <h2
                className="font-bold tracking-widest uppercase"
                style={{
                  color: currentThemeHex,
                  fontSize: "clamp(1.2rem, 3.5vw, 1.5rem)",
                }}
              >
                Core Integration
              </h2>
              <p
                className={` max-w-sm mx-auto`}
                style={{ fontSize: "clamp(0.6rem, 1.8vw, 0.75rem)" }}
              >
                Downloading optimized cognitive modules.
              </p>
            </div>

            <div className="space-y-4">
              {["whisper-tiny", "piper-amy", targetBrainModel]
                .filter(Boolean)
                .map((modelId) => {
                  const state = downloadStates[modelId as string] || {
                    progress: 0,
                    status: "not_downloaded",
                  };
                  const isError = state.status === "error";
                  const isReady = state.status === "ready";

                  const labels: Record<string, string> = {
                    "whisper-tiny": "Speech Recognition (Whisper)",
                    "piper-amy": "Speech Synthesis (Piper)",
                  };
                  const label =
                    labels[modelId as string] || `Cognitive Brain (${modelId})`;

                  return (
                    <div
                      key={modelId as string}
                      className="space-y-2 bg-white/5 p-4 rounded-xl border backdrop-blur-md transition-all shadow-lg"
                      style={{
                        borderColor: isError
                          ? "#ef444450"
                          : hexToRgba(currentThemeHex, 0.2),
                      }}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                        <span
                          style={{
                            color: "var(--app-text-main)",
                            opacity: 0.9,
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            color: isError
                              ? "#ef4444"
                              : isReady
                                ? currentThemeHex
                                : "inherit",
                          }}
                        >
                          {isError
                            ? "FAILED"
                            : isReady
                              ? "READY"
                              : `${Math.round(state.progress)}%`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${isError ? 100 : state.progress}%`,
                          }}
                          className="h-full"
                          style={{
                            backgroundColor: isError
                              ? "#ef4444"
                              : currentThemeHex,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            {provisionError && (
              <button
                type="button"
                onClick={() => {
                  setProvisionError(false);
                  const modelsToEnsure = [
                    targetBrainModel,
                    "whisper-tiny",
                    "piper-amy",
                  ].filter(Boolean) as string[];
                  // Clear progress and retry
                  modelsToEnsure.forEach((id) => {
                    setDownloadStates((prev) => ({
                      ...prev,
                      [id]: { progress: 0, status: "not_downloaded" },
                    }));
                  });
                  modelsToEnsure.forEach((id) => {
                    const m = modelManager.getModel(id);
                    if (
                      m &&
                      m.status !== "ready" &&
                      m.status !== "downloading"
                    ) {
                      modelManager.downloadModel(id);
                    }
                  });
                }}
                className="w-full max-w-sm mx-auto border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl py-4 uppercase tracking-widest text-sm font-bold transition-all backdrop-blur-md mt-6 flex items-center justify-center gap-2"
              >
                <Icon name="Activity" variant="Linear" size={16} />
                Retry Neural Sync
              </button>
            )}
          </div>
        )}

        {step === "CALIBRATION" && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="space-y-6 animate-pulse">
              <div
                className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto"
                style={{
                  borderColor: currentThemeHex,
                  borderTopColor: "transparent",
                }}
              />
              <div className="space-y-2">
                <h2
                  className="text-xl font-bold tracking-widest uppercase"
                  style={{ color: currentThemeHex }}
                >
                  Calibrating Pathways
                </h2>
                <p className={`text-xs `}>Optimizing cognitive tensors...</p>
              </div>
            </div>
          </div>
        )}

        {step === "COMPLETE" && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
            <div
              className="border-4 rounded-full flex items-center justify-center backdrop-blur-xl"
              style={{
                borderColor: currentThemeHex,
                width: "clamp(4rem, 15vmin, 7rem)",
                height: "clamp(4rem, 15vmin, 7rem)",
              }}
            >
              <Icon
                name="CheckCircle"
                variant="Linear"
                style={{ color: currentThemeHex, width: "50%", height: "50%" }}
              />
            </div>
            <div className="text-center space-y-2">
              <h2
                className="text-2xl font-bold tracking-widest uppercase"
                style={{ color: currentThemeHex }}
              >
                System Ready
              </h2>
              <p className={`text-sm `}>Connection Established</p>
            </div>
          </div>
        )}
      </div>

      {/* OS Info Footer */}
      {!(step === "CONVERSATION" && conversationMode === "voice") && (
        <div
          className={`absolute bottom-4 text-[10px]  font-mono tracking-widest flex items-center gap-2`}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: currentThemeHex }}
          />
          L.U.C.A OS v1.0.0 // PROTOCOL_CONNECTED
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;
