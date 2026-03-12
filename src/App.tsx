import React, { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useMobile } from "./hooks/useMobile";
import { AppProvider, useAppContext } from "./context/AppContext";
// useVoiceInput is now used internally by useVoiceEngine

import {
  lucaService,
  PersonaType,
  PERSONA_UI_CONFIG,
  switchPersonaTool,
  getAllTools,
} from "./services/lucaService";
import { SafeComponent } from "./components/SafeComponent";
import { liveService } from "./services/liveService";
import { memoryService } from "./services/memoryService";
import {
  awarenessService,
  AwarenessSuggestion,
} from "./services/awarenessService";

import { taskQueue } from "./services/taskQueueService";
import { soundService } from "./services/soundService";
import { voiceService } from "./services/voiceService";
import { settingsService } from "./services/settingsService";
import { UIThemeId } from "./types/lucaPersonality";
import { apiUrl, cortexUrl } from "./config/api";
import { ToolRegistry } from "./services/toolRegistry";
import {
  Message,
  Sender,
  SmartDevice,
  DeviceType,
  ToolExecutionLog,
  OsintProfile,
  SystemStatus,
  PolyPosition,
  UserProfile,
  TacticalLog,
} from "./types";

import {
  Activity,
  Cpu,
  Database,
  Terminal as TerminalIcon,
  Trash2,
  Trash,
  BrainCircuit,
} from "lucide-react";
import { setHexAlpha } from "./config/themeColors";

import GhostBrowser from "./components/GhostBrowser";
import { watchGateway } from "./services/watchGateway";

import { lucaLinkManager } from "./services/lucaLink/manager";
import { lucaLink as lucaLinkService } from "./services/lucaLinkService"; // Guest handler service

import type { ScreenShareHandle } from "./components/ScreenShare";
import conversationService from "./services/conversationService";
import ManagementDashboard from "./components/ManagementDashboard";
import { SettingsModal } from "./components/SettingsModal";
import ChatWidgetMode from "./components/ChatWidgetMode";
import WidgetMode from "./components/WidgetMode";
import LucaCloud from "./components/LucaCloud";

// Helper for device capability check removed temporarily as it's unused

import InvestigationReports from "./components/InvestigationReports";
import VisualCore from "./components/VisualCore";
import { guardService } from "./services/guardService";

// Thought Parser imports removed as they were unused
import VisionHUD from "./components/VisionHUD";

// Layout Modularization Phase 2
import Header from "./components/layout/Header";
import OperationsSidebar from "./components/layout/OperationsSidebar";
import ChatPanel from "./components/layout/ChatPanel";
import OverlayManager from "./components/layout/OverlayManager";
import PanelResizer from "./components/layout/PanelResizer";
import { useAppSystem } from "./hooks/app/useAppSystem";
import { useAppIPC } from "./hooks/app/useAppIPC";
import { useVoiceEngine } from "./hooks/app/useVoiceEngine";
import { useChatController } from "./hooks/app/useChatController";
import { useToolOrchestrator } from "./hooks/app/useToolOrchestrator";
import { BootSequence } from "./hooks/app/useAppSystem";
import OnboardingFlow from "./components/Onboarding/OnboardingFlow";
import { LiquidBackground } from "./components/visual/LiquidBackground.tsx";
import { THEME_PALETTE } from "./config/themeColors";

// --- Mock Initial State ---

// Silencing unused imports/globals

// CHAT_STORAGE_KEY and MAX_HISTORY_LIMIT are now in useChatController

/**
 * Normalize persona name by mapping common aliases to canonical names
 * "normal mode" or "default mode" -> "ASSISTANT" (the default/normal persona)
 * "ruthless mode" or "command mode" -> "RUTHLESS" (efficiency/tactical mode)
 */

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  console.log("[APP] Rendering AppContent...");
  // --- 1. PLATFORM & BASIC STATE ---
  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = !!(
    (window as any).electron && (window as any).electron.ipcRenderer
  );
  const isMobile = useMobile();

  const [currentCwd, setCurrentCwd] = useState<string>("");
  const [opsecStatus, setOpsecStatus] = useState<string>("ACTIVE");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // State required by useAppSystem
  const [bootSequence, setBootSequence] = useState<BootSequence>("INIT");
  const [biosStatus, setBiosStatus] = useState<any>({
    server: "PENDING",
    core: "PENDING",
    vision: "PENDING",
    audio: "PENDING",
  });

  // --- 2. REFS ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<ScreenShareHandle>(null);
  const lucaLinkSocketRef = useRef<any>(null);
  const currentDeviceTypeRef = useRef<any>("desktop");
  const hasAnnouncedRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PANEL LAYOUT STATE ---
  const [panelWidths, setPanelWidths] = useState({
    sidebar: 310,
    chat: 430,
    right: 310,
  });

  // Helper refs for hooks to avoid circular dependencies
  const executeToolRef = useRef<any>(null);
  const handleSendMessageRef = useRef<any>(null);
  const handlePersonaSwitchRef = useRef<any>(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // NEW: UI State (Hoisted for Tool Orchestrator)
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [contextDisplayId, setContextDisplayId] = useState<number>(0);
  const [liveContent, setLiveContent] = useState<any>(null);
  const [input, setInput] = useState("");
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([]);

  const [persona, setPersona] = useState<PersonaType>(() => {
    const settings = settingsService.getSettings();
    return (settings.general?.persona as PersonaType) || "ASSISTANT";
  });

  const [activeThemeId, setActiveThemeId] = useState<UIThemeId>(() => {
    const settings = settingsService.getSettings();
    return (settings.general?.theme as UIThemeId) || "PROFESSIONAL";
  });

  // Watch Settings changes outside of voice subsystem to guarantee UI renders
  useEffect(() => {
    const applyAppSettings = (settings: any) => {
      // Persona & Theme Selection — always apply latest from settings (React deduplicates no-ops)
      const newPersona = settings?.general?.persona;
      const newTheme = settings?.general?.theme;

      if (newPersona) {
        setPersona(newPersona as PersonaType);
      }
      if (newTheme) {
        setActiveThemeId(newTheme as UIThemeId);
      }

      // Interaction Mode (Text vs Voice)
      const preferredMode = settings?.general?.preferredMode;
      if (preferredMode) {
        setIsVoiceMode(preferredMode === "voice");
        setShowVoiceHud(preferredMode === "voice");
      }

      // Transparency Control
      const opacity = settings?.general?.backgroundOpacity ?? 0.45;
      const blur = Math.max(20, settings?.general?.backgroundBlur ?? 40);
      document.documentElement.style.setProperty(
        "--app-bg-opacity",
        opacity.toString(),
      );
      document.documentElement.style.setProperty("--app-bg-blur", `${blur}px`);
    };

    // Apply initially
    applyAppSettings(settingsService.getSettings());

    const handleSettingsChange = (newSettings: any) => {
      applyAppSettings(newSettings);
    };
    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []); // No dependencies — listener is stable, React setters handle dedup

  // Manual definition to break cycle
  const restoreToolsCallback = useCallback(async () => {
    console.log("[App] Restoring tools to registry...");
    const tools = getAllTools();
    for (const tool of tools) {
      if (tool.name) ToolRegistry.register(tool, "CORE");
    }
    ToolRegistry.register(switchPersonaTool, "CORE", [
      "persona",
      "mode",
      "theme",
      "switch",
    ]);
    console.log(`[App] Tools restored. Total: ${ToolRegistry.getAll().length}`);
  }, []);

  // --- 4. VOICE ENGINE (Provides voice context, now takes persona as prop) ---
  const {
    voiceStatus,
    isSpeaking,
    setIsSpeaking,
    voiceBackend,
    setVoiceBackend,
    dictationActive,
    setDictationActive,
    isVoiceMode,
    setIsVoiceMode,
    connectVoiceSession,
    handleCyclePersona,
    voiceHubTranscript,
    isVoiceHubListening,
    voiceHubStatus,
    voiceAmplitude: localAmplitude,
    remoteAmplitude,
    voiceHubError,
    stopVoiceHub,
    forceKillWakeWord,
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    isVadActive,
    setIsVadActive,
  } = useVoiceEngine({
    executeTool: async (name, args) => {
      return executeToolRef.current?.(name, args);
    },
    handleSendMessage: (text, image) =>
      handleSendMessageRef.current?.(text, image),
    persona, // Pass decoupled theme down to voice engine for STT routing
  });

  // --- 5. LOGICAL CONTROLLERS (persona/isVoiceMode dependent) ---
  const [isRebooting, setIsRebooting] = useState(false);

  const handlePersonaSwitch = useCallback(
    async (mode: string) => {
      if (isRebooting || mode === persona) return;
      setIsRebooting(true);
      try {
        const currentGeneral = settingsService.get("general");
        const updates: any = { persona: mode };

        // Auto-sync theme if enabled
        if (currentGeneral.syncThemeWithPersona) {
          updates.theme = mode;
        }

        settingsService.saveSettings({
          general: { ...currentGeneral, ...updates },
        });
      } catch (err) {
        console.error("[App] Persona switch failed:", err);
      } finally {
        setTimeout(() => setIsRebooting(false), 2000);
      }
    },
    [persona, isRebooting],
  );

  useEffect(() => {
    handlePersonaSwitchRef.current = handlePersonaSwitch;
  }, [handlePersonaSwitch]);

  // Alias for backward compatibility & merged UI state
  const voiceAmplitude = Math.max(localAmplitude, remoteAmplitude);
  const localVolume = localAmplitude;
  const localVadActive = isVoiceHubListening; // Approximate mapping

  // Always-On Monitoring State
  const [audioMonitoringActive, setAudioMonitoringActive] = useState(false);
  const [, setVisionMonitoringActive] = useState(false);
  const [, setSentryInstruction] = useState<string | null>(null);
  const [ambientVisionActive, setAmbientVisionActive] = useState(false);
  const [presenceMode, setPresenceMode] = useState<
    "OFF" | "WATCHING" | "SENTRY"
  >("OFF");

  // Autonomy Dashboard State
  const [showAutonomyDashboard, setShowAutonomyDashboard] = useState(false);

  // wake word state
  const [isWakeWordActive, setIsWakeWordActive] = useState(
    () => settingsService.get("voice")?.wakeWordEnabled || false,
  );

  // --- TOOL ORCHESTRATOR ---
  const {
    lucaLink,
    management,
    diagnostics,
    trading,
    voice: voiceSystem,
    visual: visualSystem,
  } = useAppContext();

  const { rightPanelMode, setRightPanelMode, memories } = management;

  const { approvalRequest, setApprovalRequest } = voiceSystem;

  const {
    isVisionActive,
    setIsVisionActive,
    visualData,
    setVisualData: originalSetVisualData,
    voiceSearchResults,
    setVoiceSearchResults,
    visionPerformanceMode,
    setVisionPerformanceMode,
  } = visualSystem;

  // turnLogsRef accumulates TacticalLogs during a single turn (LLM chain)
  // to be injected into the final Chat message as an Action Block.
  const turnLogsRef = useRef<TacticalLog[]>([]);

  const setVisualData = useCallback(
    (data: any) => {
      originalSetVisualData(data);
      if (data?.logs) {
        // Filter out duplicates if any tool calls setVisualData multiple times with same headers
        turnLogsRef.current = [...turnLogsRef.current, ...data.logs].reduce(
          (acc: TacticalLog[], log: TacticalLog) => {
            if (!acc.find((l) => l.id === log.id)) acc.push(log);
            return acc;
          },
          [],
        );
      }
    },
    [originalSetVisualData],
  );

  const {
    devices,
    setDevices,
    setShowRemoteModal,
    showRemoteModal,
    remoteCode,
    showDesktopStream,
    setShowDesktopStream,
    desktopTarget,
    showLucaLinkModal,
    setShowLucaLinkModal,
  } = lucaLink;

  const {
    setShowGhostBrowser,
    ghostBrowserUrl,
    setGhostBrowserUrl,
    setShowGeoTactical,
    showGeoTactical,
    tacticalMarkers,
    trackingTarget,
  } = diagnostics;

  const {
    setMemories,
    setTasks,
    setEvents,
    setGoals,
    installedModules,
    setQueuedTasks,
  } = management;

  // Voice State
  const {
    showVoiceHud,
    setShowVoiceHud,
    ingestionState,
    setIngestionState,
    voiceModel,
    setVoiceAmplitude,
  } = voiceSystem;

  // Trading/OSINT State
  const [osintProfile, setOsintProfile] = useState<OsintProfile | null>(null);
  const [showOsintDossier, setShowOsintDossier] = useState(false);

  // Destructure from trading context (hoisted)
  const {
    showCryptoTerminal,
    setShowCryptoTerminal,
    cryptoWallet,
    setCryptoWallet,
    showForexTerminal,
    setShowForexTerminal,
    forexAccount,
    setForexAccount,
    showPredictionTerminal,
    setShowPredictionTerminal,
    polyPositions,
    setPolyPositions,
  } = trading;

  // Additional UI setters
  const [showMobileFileBrowser, setShowMobileFileBrowser] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showSubsystemDashboard, setShowSubsystemDashboard] = useState(false);
  const [showSkillsMatrix, setShowSkillsMatrix] = useState(false);
  const [stockTerminalSymbol, setStockTerminalSymbol] = useState("");
  const [showStockTerminal, setShowStockTerminal] = useState(false);

  const handleHumanInputSubmit = async (val: string) => {
    // Basic bridge to API as expected by the modal
    try {
      if (humanInputModal) {
        await fetch(apiUrl("/api/web/human-input"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: humanInputModal.sessionId,
            input: val,
          }),
        });
        setHumanInputModal(null);
      }
    } catch (e) {
      console.error("Failed to submit human input", e);
    }
  };

  // approvalRequest and setApprovalRequest migrated to AppContext (via useVoiceSystem)

  const [elevationState, setElevationState] = useState<{
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
  }>({
    lastScanTimestamp: 0,
    authorizedMissionIds: new Set(),
  });

  // isSettingsOpen state removed as it was unused

  // --- CHAT CONTROLLER HOOK ---

  const {
    messages,
    setMessages,
    messagesRef,
    isProcessing,
    handleSendMessage,
    handleStop,
    handleClearChat,
  } = useChatController({
    persona,
    isVoiceMode,
    setVoiceTranscript,
    setVoiceTranscriptSource,
    setIsSpeaking,
    executeTool: async (name, args) => {
      return executeToolRef.current?.(name, args);
    },
    currentCwd,
    toolLogs,
    lucaLinkSocketRef,
    broadcastMessageToMobile: (text: string, sender: "user" | "luca") => {
      if (lucaLinkSocketRef.current && lucaLinkSocketRef.current.connected) {
        lucaLinkSocketRef.current.emit("client:message", {
          type: "response",
          target: "all",
          command: {
            tool: "chat",
            args: { text, sender },
          },
          text: text,
          timestamp: Date.now(),
        });
        console.log(`[LUCA LINK] Broadcasted ${sender} message to mobile`);
      }
    },
    chatEndRef,
    bootSequence,
    turnLogsRef,
    visualData,
  });

  // Sync refs for handleSendMessage
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // --- 3. APP SYSTEM LOGIC (BIOS, Boot, State) ---
  const {
    hostPlatform,
    isKernelLocked,
    localIp,
    appMode,
    isLocalCoreConnected,
  } = useAppSystem({
    messages,
    persona,
    isElectron,
    setMessages,
    setCurrentCwd,
    setMemories,
    setTasks,
    setEvents,
    setBackgroundImage,
    setGhostBrowserUrl,
    hasInitializedRef,
    hasAnnouncedRef,
    restoreTools: restoreToolsCallback,
    // Externalized State
    bootSequence,
    setBootSequence,
    biosStatus,
    setBiosStatus,
    setGoals,
    devices,
    setDevices,
    setOpsecStatus,
  });

  // --- TOOL ORCHESTRATOR ---
  const { executeTool } = useToolOrchestrator({
    persona,
    isVoiceMode,
    messages,
    currentCwd,
    setToolLogs,
    setVoiceSearchResults,
    setVisualData,
    setIngestionState,
    setStockTerminalSymbol,
    setShowStockTerminal,
    setShowSkillsMatrix,
    setShowSubsystemDashboard,
    setShowGhostBrowser,
    setGhostBrowserUrl,
    setShowMobileFileBrowser,
    setShowAutonomyDashboard,
    setShowCodeEditor,
    setShowOsintDossier,
    setOsintProfile,
    setCryptoWallet,
    setForexAccount,
    setLiveContent,
    isLocalCoreConnected,
    hostPlatform,
    isRebooting,
    setIsRebooting,
    attachedImage,
    contextDisplayId,
    currentDeviceType: currentDeviceTypeRef.current,
    setIsVisionActive,
    setIsScreenSharing,
    setVisionPerformanceMode,
    setAudioMonitoringActive,
    setVisionMonitoringActive,
    setSentryInstruction,
    elevationState,
    setElevationState,
    setApprovalRequest,
    handleSendMessage,
    handlePersonaSwitch,
    turnLogsRef,
  });

  useEffect(() => {
    executeToolRef.current = executeTool;
  }, [executeTool]);

  // Voice Command Confirmation State
  const [pendingCommand, setPendingCommand] = useState<{
    original: string;
    interpreted: string;
    confidence?: number;
    isRisky: boolean;
  } | null>(null);

  // Task Queue State

  // NEW: Live Content State (Text Mode)

  // Audio Sensor State
  const [isListeningAmbient] = useState(false);

  // OSINT State

  // Smart TV State
  const [showTVRemote, setShowTVRemote] = useState(false);
  const [activeTV, setActiveTV] = useState<SmartDevice | null>(null);

  // Wireless Manager State
  const [showWirelessManager, setShowWirelessManager] = useState(false);
  const [wirelessTab, setWirelessTab] = useState<
    "WIFI" | "BLUETOOTH" | "HOTSPOT"
  >("WIFI");

  // Mobile Manager State
  const [showMobileManager, setShowMobileManager] = useState(false);

  const [activeMobileDevice, setActiveMobileDevice] =
    useState<SmartDevice | null>(null);

  // WhatsApp State
  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
  const [showTelegramManager, setShowTelegramManager] = useState(false);
  const [showTwitterManager, setShowTwitterManager] = useState(false);
  const [showInstagramManager, setShowInstagramManager] = useState(false);
  const [showLinkedInManager, setShowLinkedInManager] = useState(false);
  const [showDiscordManager, setShowDiscordManager] = useState(false);
  const [showYouTubeManager, setShowYouTubeManager] = useState(false);

  // Network Map State
  const [showNetworkMap, setShowNetworkMap] = useState(false);

  // Vision & Security State
  const [showCamera, setShowCamera] = useState(false);
  const [showAppExplorer, setShowAppExplorer] = useState(false);

  // Hacking Terminal State
  const [showHackingTerminal, setShowHackingTerminal] = useState(false);
  const [hackingLogs] = useState<
    { tool: string; output: string; timestamp: number }[]
  >([]);

  // Logic moved to useAppIPC

  // Sentry toggle logic moved to useAppIPC

  // --- AUTOMATIC VISUAL CORE SUMMONING (Cinematic HUD) ---
  useEffect(() => {
    if (
      visualData &&
      (window as any).electron &&
      (window as any).electron.ipcRenderer &&
      !isCapacitor
    ) {
      // Summoning Priority: Only auto-open for high-value or tactical data
      const HIGH_VALUE_MODES = [
        "SECURITY",
        "HACKING",
        "TACTICAL",
        "GEO",
        "VISION",
        "SOVEREIGNTY",
      ];

      const shouldSummon =
        HIGH_VALUE_MODES.includes(visualData.type) ||
        visualData.summonHUD === true ||
        visualData.isUrgent === true;

      if (shouldSummon) {
        console.log(
          `[HUD] 🛡️ Autonomous Summoning triggered by ${visualData.type}`,
        );
        // Small delay to ensure state is synced via socket before window opens
        setTimeout(() => {
          window.electron?.ipcRenderer?.send("open-visual-core");
        }, 300);
      }
    }
  }, [visualData, isCapacitor]);

  // Skills & Stock Terminal State
  const [showLucaRecorder, setShowLucaRecorder] = useState(false);
  const [showTradingTerminal, setShowTradingTerminal] = useState(false);
  const [showCompetitionPage, setShowCompetitionPage] = useState(false);
  const [showAITradersPage, setShowAITradersPage] = useState(false);

  // Ghost Browser State (Now routed to Smart Screen)

  // Human Input Modal State (for credential prompts)
  const [humanInputModal, setHumanInputModal] = useState<{
    isOpen: boolean;
    prompt: string;
    sessionId: string;
  } | null>(null);

  // Investigation Reports State
  const [showInvestigationReports, setShowInvestigationReports] =
    useState(false);

  // --- GLOBAL BROWSER TRIGGER ---
  useEffect(() => {
    const handleOpenBrowser = (e: any) => {
      const { url, sessionId } = e.detail || {};
      if (url) {
        console.log(
          "[APP] Global Browser Trigger (Smart Screen Routing):",
          url,
          sessionId ? `Session: ${sessionId}` : "",
        );

        // Always route to Smart Screen (Visual Core) for unified rendering
        setGhostBrowserUrl(url);
        setShowGhostBrowser(true);

        // DIRECT IPC SEND - Don't rely on useEffect timing
        if ((window as any).electron && (window as any).electron.ipcRenderer) {
          const payload = { type: "BROWSER", url: url, sessionId: sessionId };
          console.log("[MAIN APP] Sending to Smart Screen via IPC:", payload);
          window.electron.ipcRenderer.send("update-visual-core", payload);
        } else {
          console.warn("[MAIN APP] window.electron not available for IPC");
        }

        // Retire the internal overlay for these manual/auth flows
        // setActiveWebview(null);
      }
    };

    window.addEventListener("luca:open-browser", handleOpenBrowser);
    return () =>
      window.removeEventListener("luca:open-browser", handleOpenBrowser);
  }, [setGhostBrowserUrl, setShowGhostBrowser]);

  // Mobile Navigation State
  const [activeMobileTab, setActiveMobileTab] = useState<
    "SYSTEM" | "TERMINAL" | "DATA"
  >("TERMINAL");

  // NAVIGATION TRACKING: Sync mobile tab state with LucaService for context awareness
  useEffect(() => {
    if (isMobile && activeMobileTab) {
      lucaService.setNavigationState({
        currentScreen: activeMobileTab,
      });
      console.log(`[MOBILE] Navigation Context Updated: ${activeMobileTab}`);
    }
  }, [activeMobileTab, isMobile]);

  // VISION STREAM STATE (For pipe to Data Room)
  const [visionStream, setVisionStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // 1. Desktop Sync (Electron Widgets)
    if (isElectron) {
      window.electron.ipcRenderer.send("sync-widget-state", {
        persona,
        themeHex: PERSONA_UI_CONFIG[activeThemeId as any]?.hex || "#3b82f6",
      });
    }

    // 2. Mobile Sync (Apple Watch)
    if (isCapacitor) {
      watchGateway.updateWatchState({ persona });
    }
  }, [persona, isCapacitor]);

  // --- WATCH COMMAND LISTENERS (Moved to useVoiceEngine) ---
  // --- PERSONA SYNC (Moved to useVoiceEngine) ---

  // LIVE VOICE SETTINGS: Apply voice changes immediately without restart
  // --- LIVE VOICE SETTINGS (Moved to useVoiceEngine) ---

  // NEW: IDE STATE

  // AMBIENT SUGGESTION CHIPS STATE
  const [ambientSuggestions, setAmbientSuggestions] = useState<
    AwarenessSuggestion[]
  >([]);
  const [showSuggestionChips, setShowSuggestionChips] = useState(false);

  // NEW: GOD MODE STATES
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(
    SystemStatus.NORMAL,
  );
  const [isLockdown, setIsLockdown] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); // Full Admin Access
  const [showAdminGrantModal, setShowAdminGrantModal] = useState(false);
  const [adminJustification] = useState("");
  // For persona switching visual
  const [activeAutonomousAction, setActiveAutonomousAction] = useState<{
    intent: string;
    domain: string;
  } | null>(null);

  // NEW: PROFILE MANAGER STATE
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // NEW: GHOST CURSOR STATE (COMPUTER USE VISUALIZATION)
  const [ghostCursor] = useState<{
    x: number;
    y: number;
    type: string;
    active: boolean;
  }>({ x: 0, y: 0, type: "MOVE", active: false });

  // --- SATELLITE BROADCAST HELPER ---
  const broadcastToSatellites = useCallback((data: any) => {
    // Only broadcast if we are connected as a Desktop Core
    if (lucaLinkService.getState().connected) {
      lucaLinkService.send("all", "UI_STATE_SYNC", data);
    }
  }, []);

  // --- WIDGET SYNC LOOP (REAL-TIME-ISH) ---
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      const syncData = {
        // Map Voice Hub State to Widget
        // Unified VAD: Check either local ear or global voice system (cloud/hybrid)
        isVadActive:
          isVoiceHubListening ||
          voiceHubStatus === "THINKING" ||
          isVadActive ||
          localVadActive,
        isSpeaking: isSpeaking,
        transcript: voiceHubTranscript || voiceTranscript,
        transcriptSource: voiceTranscriptSource,
        intent: activeAutonomousAction?.intent,
        // Amplitude: Use real voice amplitude if Luca is speaking, else use local volume if user is speaking
        amplitude: voiceAmplitude,
        persona: persona,
        status: voiceHubStatus, // Pass full status if widget updates to support it
        themeHex:
          THEME_PALETTE[activeThemeId as keyof typeof THEME_PALETTE]?.primary ||
          "#3b82f6",
      };

      window.electron.ipcRenderer.send("sync-widget-state", syncData);
      broadcastToSatellites(syncData);

      // Also push to Watch if on iOS
      if (Capacitor.getPlatform() === "ios") {
        watchGateway.updateWatchState(syncData);
      }
    }
  }, [
    isVadActive,
    localVadActive,
    isSpeaking,
    voiceTranscript,
    voiceAmplitude,
    localVolume,
    persona,
    isVoiceHubListening,
    voiceHubStatus,
    voiceHubTranscript,
  ]);

  // --- SMART SCREEN SYNC (Option B) ---
  // Instead of rendering VisualCore locally, we forward state to the separate window
  useEffect(() => {
    // If we have visual data or a browser URL (and not just closing it)
    if (
      (visualData ||
        (ghostBrowserUrl &&
          ghostBrowserUrl !== "about:blank" &&
          ghostBrowserUrl !== "")) &&
      window.electron &&
      window.electron.ipcRenderer
    ) {
      const payload = visualData || { type: "BROWSER", url: ghostBrowserUrl };
      console.log("[MAIN APP] Sending to Smart Screen via IPC:", payload);
      window.electron.ipcRenderer.send("update-visual-core", payload);

      // AUTO-OPEN: If we have fresh data, ensure the Smart Screen is visible.
      // This links Hologram/Mini-Chat to the Visual Display.
      window.electron.ipcRenderer.send("open-visual-core");
    }
  }, [visualData, ghostBrowserUrl]);

  // --- VOICE HUB LISTENER (THE BRIDGE) ---

  // NEW: KNOWLEDGE INGESTION STATE

  const [showIngestionModal, setShowIngestionModal] = useState(false);

  // --- HUMAN-IN-THE-LOOP SECURITY STATE ---

  // NEW: ELEVATION STATE (Production-Grade Security)

  // NEW: LUCA LINK STATE (MOBILE BRIDGE)

  // lastMessageSourceRef, lastIngestedIndexRef, and ingestionTimerRef moved to useChatController

  // Message persistence and ingestion moved to useChatController

  // --- POLYGLOT MODE (NIGERIAN EAR) ---
  const isPolyglotMode = localStorage.getItem("luca_polyglot_mode") === "true";

  // Effect: When Polyglot transcripts arrive, inject them into the chat
  useEffect(() => {
    // Only process if: 1. Mode is Enabled, 2. We have a transcript, 3. It's 'Final' (not partial - assumed finalized by hook logic/user pause)
    // Actually, useVoiceInput updates 'transcript' constantly.
    // We need a trigger for "User Finished Speaking".
    // For now, let's rely on the user manually toggling or a silence timeout in useVoiceInput.
    // Assuming useVoiceInput clears transcript after processing? No, check useVoiceInput logic.
    // It keeps 'transcript' state. We need a way to consume it.

    // NOTE: 'status' in useVoiceInput switches to 'THINKING' when it gets a result?
    // Checking hook: status goes to 'THINKING' only after successfully receiving a transcript.

    if (isPolyglotMode && voiceHubTranscript && voiceHubStatus === "THINKING") {
      console.log(`[POLYGLOT] Injecting Transcript: ${voiceHubTranscript}`);
      handleSendMessage(voiceHubTranscript, null);
      // Reset handling is tricky here without exposing a 'clear' method from hook.
      // Ideally we should modify useVoiceInput to expose a 'consumeTranscript' or similar.
      // But for now, we'll just guard against double submission by status.
    }
  }, [voiceHubTranscript, voiceHubStatus, isPolyglotMode]);

  // --- SENTINEL LOOP REMOVED ---
  // Now showing only real logs (tool executions, system events, etc.)

  // Logic moved to useAppIPC

  // --- SMART SCREEN IPC LISTENER ---
  // Moved from inside socket effect to top level to fix "Invalid Hook Call" error
  useEffect(() => {
    // Only attach listener if we are in visual_core mode, BUT the hook itself must run unconditionally
    if (
      appMode === "visual_core" &&
      window.electron &&
      window.electron.ipcRenderer
    ) {
      console.log(
        "[SMART SCREEN] IPC Listener registered for visual-core-update",
      );

      // HANDSHAKE: Signal to main process that we're ready to receive data
      console.log("[SMART SCREEN] Sending ready signal to main process");
      window.electron.ipcRenderer.send("visual-core-ready");
    }
  }, [appMode]);

  // Sync profile to service when it changes
  useEffect(() => {
    if (userProfile) {
      lucaService.setUserProfile(userProfile);
    }
  }, [userProfile]);

  // Scroll handling moved to useChatController

  // Logic moved to hooks

  // --- SYNC PLATFORM TO AI ---
  useEffect(() => {
    lucaService.setPlatform(hostPlatform);
  }, [hostPlatform]);

  // Sync Sensor Status with Tray
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      // 1. Broadcast to Widgets (for visuals)
      window.electron.ipcRenderer.send("broadcast-to-widgets", {
        type: "vision-status",
        active: isVisionActive,
        performanceMode: visionPerformanceMode,
      });

      // 2. Broadcast to Main Tray (for submenu)
      window.electron.ipcRenderer.send("sensor-status-update", {
        mic: isVoiceHubListening, // Active live session
        vision: isVisionActive,
        screen: isScreenSharing,
      });
    }
  }, [
    isVisionActive,
    visionPerformanceMode,
    isVoiceHubListening,
    isScreenSharing,
  ]);

  // Logic moved to useAppIPC

  // --- SCREEN CAPTURE HANDLER ---
  // --- SCREEN CAPTURE HANDLER ---

  // --- WAKE-ON-VOICE VISION SYNC ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isVadActive && isScreenSharing) {
      // Immediate capture on wake
      if (screenShareRef.current) {
        screenShareRef.current.captureFrame();
      }

      // Loop every 1s while speaking (high frequency vision)
      interval = setInterval(() => {
        if (screenShareRef.current) {
          screenShareRef.current.captureFrame();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVadActive, isScreenSharing]);

  const handleScreenFrame = (base64: string) => {
    // Strip prefix for Gemini Native processing
    const rawBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
    // Send directly to the live session
    liveService.sendVideoFrame(rawBase64);
  };

  // --- MOBILE REMOTE SUCCESS HANDLER ---
  const handleRemoteSuccess = () => {
    setShowRemoteModal(false);
    soundService.play("SUCCESS");

    // Add a new simulated mobile device if not present
    const existingMobile = devices.find((d) => d.type === DeviceType.MOBILE);
    const newDevice: SmartDevice = existingMobile || {
      id: `mobile_${Date.now()}`,
      name: "Samsung S24 Ultra",
      type: DeviceType.MOBILE,
      isOn: true,
      status: "online",
      location: "Near-Field",
    };

    if (!existingMobile) {
      setDevices((prev) => [newDevice, ...prev]);
    }

    setActiveMobileDevice(newDevice);
    setShowMobileManager(true);

    // Log success
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Remote Uplink Successful. Mobile Control Interface Active.",
        sender: Sender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
  };

  // --- PREDICTION MARKET HANDLER ---
  const handlePlaceBet = (
    marketId: string,
    outcome: "Yes" | "No",
    amount: number,
    title: string,
    price: number,
  ) => {
    const newPos: PolyPosition = {
      id: `pos_${Date.now()}`,
      marketId,
      question: title,
      outcome,
      shares: amount / price,
      avgPrice: price,
      currentPrice: price, // Simulate instant price
      pnl: 0,
    };
    setPolyPositions((prev) => [...prev, newPos]);
    soundService.play("SUCCESS");

    // Log to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `BET EXECUTED: $${amount} on ${outcome} for "${title}". Position tracked.`,
        sender: Sender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
  };

  // handleCyclePersona is now provided by useVoiceEngine

  const handleIngest = (url: string) => {
    setShowIngestionModal(false);
    executeTool("ingestGithubRepo", { url });
  };

  // --- CLEAR CHAT FUNCTION ---
  // handleClearChat moved to useChatController

  // handleClearChat moved to useChatController

  // handleClearChat moved to useChatController

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    // Persist via unified settings service
    settingsService.saveOperatorProfile({
      identity: { name: profile.name },
      personality: { communicationStyle: profile.customInstructions },
    });
    lucaService.setUserProfile(profile);

    // Provide feedback
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: `USER PROFILE UPDATED. HELLO, ${profile.name.toUpperCase()}.`,
        sender: Sender.SYSTEM,
        timestamp: Date.now(),
      },
    ]);
    soundService.play("SUCCESS");
  };

  // --- LUCA LINK COMMAND LISTENER (Mobile Mode) ---
  // This enables the desktop to control this device when running as a mobile app
  useEffect(() => {
    // Enable for ALL devices so Desktop can receive commands from Mobile
    // if (!hasCapability(currentDeviceTypeRef.current as any, "mobile")) return;

    const handleCommand = async (event: any) => {
      const { message } = event.data;
      if (message.type === "command" && message.payload) {
        console.log(
          `[LUCA LINK] Received delegated command: ${message.payload.command}`,
        );
        const { command, args } = message.payload;
        const cmdId = message.commandId;
        const source = message.source;

        // Execute the tool
        try {
          const result = await executeTool(command, args);

          // Send result back to origin (Encrypted)
          if (source) {
            await lucaLinkManager.sendResponse(source, cmdId, {
              result: result,
              deviceId: lucaLinkManager.deviceId,
            });
          }
        } catch (error: any) {
          if (source) {
            await lucaLinkManager.sendResponse(source, cmdId, {
              error: error.message,
              deviceId: lucaLinkManager.deviceId,
            });
          }
        }
      }
    };

    lucaLinkManager.on("command:received", handleCommand);

    return () => {
      lucaLinkManager.off("command:received", handleCommand);
    };
  }, []);

  // --- Interaction Logic ---

  // --- VOICE MESSAGE HANDLER ---
  // handleSendMessage moved to useChatController

  // handleStop moved to useChatController

  // voiceStatus, dictationActive, and dictation injection logic are now managed by useVoiceEngine
  // Voice Hub Listener and Voice Session Management also moved to useVoiceEngine

  // --- VOICE LIFECYCLE MANAGEMENT ---
  // Ensure voice hub stops if isVoiceMode is false (Failsafe)
  useEffect(() => {
    if (!isVoiceMode && isVoiceHubListening) {
      console.log("[APP] Failsafe: Stopping Voice Hub");
      stopVoiceHub();
      setIsVadActive(false);
    }
  }, [isVoiceMode, isVoiceHubListening, stopVoiceHub]);

  // HYBRID: Check if user selected a LOCAL listening model (not cloud Gemini)
  // HYBRID: Determine if we should use the local websocket backend or Cloud Gemini Live
  const shouldUseLocalBackend = () => {
    const voiceSettings = settingsService.get("voice");
    const sttModel = voiceSettings.sttModel || "cloud-gemini";
    const ttsProvider = voiceSettings.provider || "local-luca";

    // 1. If user wants a discrete TTS engine (Local, Google, Native), use discrete backend
    // Only use Live Service if the provider is specifically 'gemini-genai'
    if (ttsProvider !== "gemini-genai") return true;

    // 2. If user wants a local listening model (Moonshine/Whisper/Ollama), we use local backend
    if (settingsService.isModelLocal(sttModel)) return true;

    // Otherwise, use Cloud (Gemini Live) for the best end-to-end experience
    return false;
  };

  const toggleVoiceMode = (overrideMode?: string, forceHud = true) => {
    console.log(
      `[APP] toggleVoiceMode called. Mode: ${overrideMode}, ForceHud: ${forceHud}, CurrentState: ${isVoiceMode}`,
    );
    soundService.play("HOVER");
    if (isVoiceMode && overrideMode !== "DICTATION" && overrideMode !== "OFF") {
      // Logic fix: If already dictating and we get "DICTATION" again, maybe we should ignore or restart?
      // But for now, let's log.
    }

    if (isVoiceMode) {
      if (overrideMode === "DICTATION" && !dictationActive) {
        // Switching from Chat to Dictation?
        console.log("[APP] Switching to Dictation Mode...");
      } else {
        // Stopping - HYBRID CLEANUP
        console.log(
          `[APP] Stopping Voice Session (Backend: ${voiceBackend})...`,
        );
        if (voiceBackend === "local") {
          import("./services/hybridVoiceService").then(
            ({ hybridVoiceService }) => {
              hybridVoiceService.disconnect();
              hybridVoiceService.clearHistory();
            },
          );
        } else {
          liveService.disconnect();
        }
        voiceService.stop();
        setIsVoiceMode(false);
        setIsVadActive(false);
        setDictationActive(false);
        setShowVoiceHud(false);
        return;
      }
    }

    // Turning ON - HYBRID ROUTING
    const useLocal = shouldUseLocalBackend();
    console.log(
      `[APP] Activating Voice Mode (Backend: ${useLocal ? "LOCAL" : "CLOUD"})...`,
    );

    // AUTO-UNLOCK PRIVACY (If user clicks the button, they WANT the mic)
    const privacy = settingsService.get("privacy");
    if (privacy && privacy.micEnabled === false) {
      console.log("[APP] 🔓 Auto-unlocking Microphone for Voice Mode Request");
      settingsService.saveSettings({
        privacy: { ...privacy, micEnabled: true },
      });
    }

    setVoiceBackend(useLocal ? "local" : "cloud");

    if (useLocal) {
      // Using the smarter routing encapsulated in connectVoiceSession
      connectVoiceSession(overrideMode === "DICTATION" ? "DICTATION" : persona);
    } else {
      // Cloud Mode: Use Google Live (liveService)
      connectVoiceSession(overrideMode === "DICTATION" ? "DICTATION" : persona);
    }

    if (overrideMode === "DICTATION") {
      console.log("[APP] Activating DICTATION State...");
      setDictationActive(true);
    }
    setIsVoiceMode(true);
    setShowVoiceHud(forceHud);
  };

  // Stable ref for toggle function to avoid re-binding IPC listeners
  const toggleVoiceModeRef = useRef(toggleVoiceMode);
  // Update ref whenever function changes
  useEffect(() => {
    toggleVoiceModeRef.current = toggleVoiceMode;
  }, [toggleVoiceMode]);

  // --- WIDGET VOICE TOGGLE LISTENER ---
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      const remove = window.electron?.ipcRenderer?.on(
        "trigger-voice-toggle",
        (payload: any) => {
          // Dashboard handles voice sessions for all widgets
          // Widget/Hologram windows just display UI, dashboard does the work

          console.log(
            "[APP] 🎤 Received voice toggle from Widget. Mode:",
            payload?.mode,
          );

          // Handle OFF command
          if (payload?.mode === "OFF") {
            console.log("[APP] 🔇 Received OFF command from Widget");
            if (toggleVoiceModeRef.current) {
              toggleVoiceModeRef.current("OFF", false);
            }
            return;
          }

          // Handle DICTATION mode
          if (payload?.mode === "DICTATION") {
            if (toggleVoiceModeRef.current) {
              toggleVoiceModeRef.current("DICTATION", false);
            }
            return;
          }

          // Handle TOGGLE - Start/Stop regular voice mode (NOT dictation)
          // This is the main action when user clicks the Hologram
          if (payload?.mode === "TOGGLE" || !payload?.mode) {
            if (toggleVoiceModeRef.current) {
              toggleVoiceModeRef.current(undefined, false); // undefined = regular toggle
            }
            return;
          }

          console.warn("[APP] ⚠️ Unknown voice toggle mode:", payload?.mode);
        },
      );

      return () => remove && remove();
    }
  }, []); // Bind ONCE only

  // --- CHAT WIDGET LISTENER ---
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      const remove = window.electron?.ipcRenderer?.on(
        "trigger-chat-message",
        async (payload: any) => {
          let message = "";

          // Handle Object Payload vs Legacy String
          if (typeof payload === "object" && payload.text) {
            message = payload.text;
            if (payload.displayId) setContextDisplayId(payload.displayId);
          } else if (typeof payload === "string") {
            message = payload;
          }

          console.log("[APP] Widget sent message:", message);

          // CRITICAL: Bring main window to front when interacting via widget
          // otherwise Visual Core activates in the background
          if (
            (window as any).electron &&
            (window as any).electron.ipcRenderer
          ) {
            // Request main process to show and focus the window
            window.electron.ipcRenderer.send("request-focus");
          }

          // Force Voice Mode off for text interaction to avoid TTS confusion if mixed
          // But if user wants TTS, they can toggle it.
          // For now, let's just process it.
          const response = await handleSendMessage(message, null);
          if (response) {
            window.electron?.ipcRenderer?.send("reply-chat-widget", response);
          }
        },
      );

      return () => remove && remove();
    }
  }, []);

  // Initialize task queue
  useEffect(() => {
    // Store handleSendMessage reference to avoid dependency issues
    const executeCommand = async (
      command: string,
      onProgress?: (message: string, progress?: number) => void,
    ): Promise<string> => {
      return await new Promise<string>((resolve, reject) => {
        handleSendMessage(command, null, onProgress)
          .then(() => {
            resolve("Command executed");
          })
          .catch(reject);
      });
    };

    taskQueue.setExecutor(executeCommand);
    taskQueue.onStatusUpdate((tasks) => {
      setQueuedTasks(tasks);
    });

    return () => {
      taskQueue.clear();
    };
  }, []); // Empty deps - handleSendMessage is stable

  // --- REFACTOR: IPC HOOK ---
  // Moved here to ensure all refs and state are in scope
  useAppIPC({
    isElectron,
    setIsVoiceMode,
    setAudioMonitoringActive,
    setVisionMonitoringActive,
    setSentryInstruction,
    setIsWakeWordActive,
    setGhostBrowserUrl,
    setVisualData,
    setIsVisionActive,
    setIsScreenSharing,
    stopVoiceHub,
    forceKillWakeWord,
    handlePersonaSwitchRef,
    handleSendMessageRef,
    setToolLogs,
    setDevices,
    setMessages,
    setVoiceAmplitude,
    setShowWhatsAppManager,
    setShowTelegramManager,
    setShowTwitterManager,
    setShowInstagramManager,
    setShowLinkedInManager,
    setShowDiscordManager,
    setShowYouTubeManager,
    setShowRemoteModal,
    setActiveMobileDevice,
    setShowMobileManager,
    localVadActive: voiceHubStatus === "LISTENING",
    appMode,
    isCapacitor: Capacitor.isNativePlatform(),
    devices,
    Sender,
  });

  // --- Presence & Power Management ---
  useEffect(() => {
    if ((window as any).electron?.ipcRenderer) {
      const ipc = (window as any).electron.ipcRenderer;

      const removePowerListener = ipc.on(
        "system-power-event",
        (_event: any, type: string) => {
          if (type === "suspend" || type === "lock") {
            awarenessService.setSystemLock(true);
          } else if (type === "resume" || type === "unlock") {
            awarenessService.setSystemLock(false);
          }
        },
      );

      const onTierChanged = (data: { presenceMode: any }) => {
        setPresenceMode(data.presenceMode);
      };

      const onUserReturned = (data: { mood: string }) => {
        console.log(`[APP] 🚀 User returned! (Mood: ${data.mood})`);
        const prompt = `[SYSTEM RETURN PULSE] The user has just returned to their desk after being away. Their current detected mood is "${data.mood}". Greet them back warmly and mention that you noticed their return. Suggest picking up where you left off.`;
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(prompt, null, undefined, true);
        }
      };

      const onGuardEvent = (event: any) => {
        console.log(`[APP] 🛡️ Guard detected event:`, event);
        const prompt = `[SYSTEM GUARD PULSE] Proactive assistance needed. Detected a situation: "${event.message}". Type: ${event.type}, Priority: ${event.priority}. Action suggested: ${event.actionSuggested}. Contextualize this for the user and offer help quietly.`;
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(prompt, null, undefined, true);
        }
      };

      awarenessService.on("tier-changed", onTierChanged);
      awarenessService.on("user-returned", onUserReturned);
      awarenessService.on("guard-event", onGuardEvent);

      // System Resource Guard
      guardService.on("guard-trigger", onGuardEvent);

      const onAutonomousIntent = async (event: any) => {
        const settings = settingsService.getSettings();
        const agencyLevel = settings.general.agencyLevel;
        const domains = settings.general.autonomousDomains || [];

        if (agencyLevel === "EXECUTIVE" && domains.includes(event.domain)) {
          console.log(`[APP] 🚀 EXECUTIVE AUTO-REMEDIATION START:`, event);
          setActiveAutonomousAction({
            intent: event.intent,
            domain: event.domain,
          });

          const result = await lucaService.executeExecutiveAction(
            event.intent,
            event.domain,
          );

          if (result.success) {
            soundService.play("SUCCESS");
          }

          // Clear status after 5s
          setTimeout(() => setActiveAutonomousAction(null), 5000);
        } else {
          // Fallback to Proactive if not Executive
          onGuardEvent(event);
        }
      };

      guardService.on("autonomous-intent", onAutonomousIntent);

      return () => {
        removePowerListener();
        awarenessService.off("tier-changed", onTierChanged);
        awarenessService.off("user-returned", onUserReturned);
        awarenessService.off("guard-event", onGuardEvent);
        guardService.off("guard-trigger", onGuardEvent);
        guardService.off("autonomous-intent", onAutonomousIntent);
      };
    }
  }, []);

  // Initialize Luca Link guest message handler
  useEffect(() => {
    // Wire up guest messages to Luca AI processing
    const processGuestMessage = async (message: string): Promise<string> => {
      // Add the guest message to chat history
      const guestMessage: Message = {
        id: Date.now().toString(),
        text: message,
        sender: Sender.USER,
        timestamp: Date.now(), // Use number, not Date
      };
      setMessages((prev) => [...prev, guestMessage]);

      // Process with handleSendMessage and return the response
      try {
        if (handleSendMessageRef.current) {
          await handleSendMessageRef.current(message, null);
        }

        // Get the last assistant message as the response
        // Use messagesRef.current for latest state
        const lastAssistant = messagesRef.current
          .filter((m) => m.sender === Sender.LUCA)
          .pop();
        return lastAssistant?.text || "I processed your request.";
      } catch (e) {
        console.error("[GuestHandler] Failed to process:", e);
        throw e;
      }
    };

    // Generate TTS audio for response
    const generateAudio = async (text: string): Promise<string | null> => {
      try {
        // Use the voice service to generate audio
        const settings = settingsService.getSettings();
        if (settings.voice.provider === "local-luca") {
          // Call Cortex TTS and get base64
          const response = await fetch(cortexUrl("/tts"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              voice: settings.voice.voiceId || "amy",
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.type === "audio" && data.data) {
              return data.data; // Already base64
            }
          }
        }
        return null;
      } catch (e) {
        console.warn("[GuestHandler] Audio generation failed:", e);
        return null;
      }
    };

    lucaLinkService.initGuestHandler(processGuestMessage, generateAudio);
    console.log("[App] Luca Link guest handler initialized (Stable)");
  }, []); // Run ONCE on mount

  // GLOBAL KEYBOARD LISTENERS (HOTKEYS)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Alt + V : Voice Mode
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        toggleVoiceMode();
      }
      // Alt + I : IDE
      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setShowCodeEditor((prev) => !prev);
      }
      // Alt + D : Data Room (Visual Core Dashboard)
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setVisualData((prev: any) => {
          if (prev && prev.topic === "DATA_ROOM") return null; // Close if open
          return {
            topic: "DATA_ROOM",
            type: "GENERAL",
            layout: "GRID", // Ignored by VisualCore in favor of DATA_ROOM mode logic
            items: [],
          };
        });
      }
      // Alt + C : Cinema Mode
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setVisualData((prev: any) => {
          if (prev && prev.topic === "CINEMA") return null; // Close if open
          return {
            topic: "CINEMA",
            type: "GENERAL",
            layout: "GRID",
            items: [],
          };
        });
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [isVoiceMode]); // Depend on isVoiceMode for proper toggling context

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix (e.g. "data:image/png;base64,")
        const base64 = reader.result as string;
        const cleanBase64 = base64.split(",")[1];
        setAttachedImage(cleanBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeviceControlClick = async (device: SmartDevice) => {
    soundService.play("KEYSTROKE");
    if (device.type === DeviceType.SMART_TV) {
      setActiveTV(device);
      setShowTVRemote(true);
    } else if (device.type === DeviceType.MOBILE) {
      // FETCH REAL LOCATION for UI action immediately
      const loc = await getRealLocation();
      const locStr = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;

      // Create updated object
      const updatedDevice = { ...device, location: locStr };

      // CRITICAL: Update global devices list so tools can see it
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? updatedDevice : d)),
      );

      // Set active for modal
      setActiveMobileDevice(updatedDevice);
      setShowMobileManager(true);
    }
  };

  const handleWirelessConnect = (id: string, protocol: string) => {
    // Trigger the tool logic from the UI directly
    executeTool("initiateWirelessConnection", {
      targetIdentifier: id,
      protocol: protocol,
    });
    setShowWirelessManager(false);
  };

  // --- HELPER: Dynamic Theme Colors ---
  const getThemeColors = () => {
    if (isLockdown) {
      return {
        primary: "text-rq-red",
        border: "border-rq-red",
        bg: "bg-red-950/40",
        glow: "shadow-[0_0_30px_#ef4444]",
        coreColor: "text-red-500",
        hex: "#ef4444",
        themeName: "ruthless", // Lockdown defaults to dark
      };
    }

    // Use PERSONA_UI_CONFIG for theme colors - decoupled from persona
    const themeConfig =
      PERSONA_UI_CONFIG[activeThemeId as any] || PERSONA_UI_CONFIG.ASSISTANT;

    // Handle system status overrides (CAUTION/CRITICAL)
    if (systemStatus === SystemStatus.CRITICAL) {
      return {
        ...themeConfig,
        primary: "text-rq-red",
        border: "border-rq-red",
        bg: "bg-rq-red-dim",
        glow: "shadow-[0_0_20px_#ef4444]",
        coreColor: "text-red-500",
        hex: "#ef4444",
      };
    } else if (systemStatus === SystemStatus.CAUTION) {
      return {
        ...themeConfig,
        primary: "text-rq-amber",
        border: "border-rq-amber",
        bg: "bg-rq-amber-dim",
        glow: `shadow-[0_0_20px_${THEME_PALETTE.BUILDER.primary}]`,
        coreColor: "text-amber-500",
        hex: THEME_PALETTE.BUILDER.primary,
      };
    }

    return {
      primary: themeConfig.primary,
      border: themeConfig.border,
      bg: themeConfig.bg,
      glow: themeConfig.glow,
      coreColor: themeConfig.coreColor,
      hex: themeConfig.hex || "#3b82f6",
      themeName: themeConfig.themeName || activeThemeId,
    };
  };

  const theme = getThemeColors();

  // --- WEB BACKGROUND SYNC ---
  // Ensure the outer HTML/Body perfectly matches the active theme to prevent edge haze
  useEffect(() => {
    const isElectron =
      typeof window !== "undefined" && !!(window as any).electron;
    if (!isElectron) {
      const isLightTheme =
        theme.themeName?.toLowerCase() === "lucagent" ||
        theme.themeName?.toLowerCase() === "agentic-slate" ||
        theme.themeName?.toLowerCase() === "light";

      const bgColor = isLightTheme ? "#f0f0f5" : "#1c1c1c";
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;
    }
  }, [theme.themeName]);

  // --- THEME SYNC (LUCA LINK) ---
  useEffect(() => {
    if (lucaLinkSocketRef.current?.connected) {
      console.log("[THEME] Syncing theme to mobile nodes:", theme.hex);
      lucaLinkSocketRef.current.emit("client:message", {
        type: "theme_update",
        target: "all",
        theme: {
          hex: theme.hex,
          primary: theme.primary,
          bg: theme.bg,
        },
        timestamp: Date.now(),
      });
    }
  }, [theme.hex, theme.primary, theme.bg]);

  // --- VISUAL CORE SYNC (TV/MIRROR) ---
  useEffect(() => {
    if (lucaLinkSocketRef.current?.connected) {
      let currentMode = "IDLE";
      if (visualData?.topic === "DATA_ROOM") currentMode = "DATA_ROOM";
      else if (visualData?.topic === "CINEMA") currentMode = "CINEMA";
      else if (visualData) currentMode = "DATA";
      else if (ghostBrowserUrl && ghostBrowserUrl !== "about:blank")
        currentMode = "BROWSER";

      console.log("[SYNC] Broadcasting Visual Core state:", currentMode);
      lucaLinkSocketRef.current.emit("client:message", {
        type: "visual_core_sync",
        target: "all",
        data: {
          mode: currentMode,
          visualData: visualData,
          browserUrl: ghostBrowserUrl,
        },
        timestamp: Date.now(),
      });
    }
  }, [visualData, ghostBrowserUrl]);

  // --- THEME TOGGLE SHORTCUT (Shift+T) ---
  useEffect(() => {
    const handleThemeToggle = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "T" || e.key === "t")) {
        const personas: PersonaType[] = [
          "RUTHLESS",
          "ENGINEER",
          "ASSISTANT",
          "HACKER",
        ];
        const current = persona === "DEFAULT" ? "ASSISTANT" : persona;
        const currentIndex = personas.indexOf(current);
        const nextIndex = (currentIndex + 1) % personas.length;
        const nextPersona = personas[nextIndex];

        console.log("[THEME] Cycling persona to:", nextPersona);
        setIsRebooting(true);
        setTimeout(() => {
          setPersona(nextPersona);
          setIsRebooting(false);
        }, 800);
      }
    };

    window.addEventListener("keydown", handleThemeToggle);
    return () => window.removeEventListener("keydown", handleThemeToggle);
  }, [persona]);

  // --- HELPER: Dynamic Glass Style ---
  // --- UTILS ---
  const getRealLocation = async (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 40.7128, lng: -74.006 }), // Fallback to NYC
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
        );
      } else {
        resolve({ lat: 40.7128, lng: -74.006 });
      }
    });
  };

  // --- RENDER: VISUAL CORE MODE (Smart Screen - Widget) ---
  // --- RENDER: VISUAL CORE MODE (Smart Screen - Widget) ---
  if (appMode === "widget") {
    // Start Dictation (Orb Widget)
    return <WidgetMode />;
  }

  if (appMode === "chat") {
    // Mini Chat Widget Mode
    return <ChatWidgetMode />;
  }

  if (appMode === "visual_core") {
    console.log(
      "[SMART SCREEN] Rendering with browserUrl:",
      ghostBrowserUrl,
      "visualData:",
      !!visualData,
    );
    return (
      <div className="w-full h-full bg-transparent flex flex-col overflow-hidden relative">
        <VisualCore
          isVisible={true}
          themeColor={theme.hex}
          visualData={visualData}
          browserUrl={ghostBrowserUrl}
          sessionId={conversationService.getSessionId()}
          videoStream={visionStream}
          onClose={() => {
            if (
              (window as any).electron &&
              (window as any).electron.ipcRenderer
            ) {
              window.electron.ipcRenderer.send("close-visual-core");
            }
          }}
          theme={theme}
          onClearData={() => setVisualData(null)}
        />
        {/* Render VisionHUD invisible to capture stream */}
        <div style={{ display: "none" }}>
          <VisionHUD
            themeColor={theme.hex}
            onStreamReady={setVisionStream}
            isActive={false}
          />
        </div>
      </div>
    );
  }

  // --- RENDER: BROWSER MODE (Standalone Window) ---
  if (appMode === "browser") {
    return (
      <div className="w-full h-screen bg-black/90 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <GhostBrowser
          url={ghostBrowserUrl}
          onClose={() => {
            if (window.electron)
              window.electron.ipcRenderer.send("close-browser");
          }}
          sessionId={`session_${Date.now()}`}
          mode="STANDALONE"
        />
      </div>
    );
  }

  // Removed Background from here (Moved to Root)

  // --- BOOT SEQUENCE RENDER ---
  if (bootSequence !== "READY") {
    const isWeb =
      typeof window !== "undefined" &&
      !(window as any).electron &&
      !(window as any).Capacitor;
    const isLightTheme =
      theme.themeName?.toLowerCase() === "lucagent" ||
      theme.themeName?.toLowerCase() === "light";

    return (
      <div
        className={`h-screen w-full ${isWeb ? (isLightTheme ? "bg-[#f0f0f5]" : "bg-[#1c1c1c]") : "bg-transparent"} flex flex-col items-center justify-center font-mono cursor-default select-none draggable transition-all duration-700 relative overflow-hidden`}
        style={{ color: theme.hex || "#3b82f6" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <LiquidBackground theme={theme} className="fixed inset-0 -z-50" />
        {/* BIOS/KERNEL TERMINAL - Only show if NOT onboarding */}
        {bootSequence !== "ONBOARDING" && (
          <div className="max-w-md w-full space-y-4 p-8 relative z-10">
            <div
              className="flex justify-between items-center border-b pb-2 mb-4"
              style={{ borderColor: `${theme.hex}50` }}
            >
              <span className="text-xs tracking-widest">LUCA BIOS v2.4</span>
              <Activity size={14} className="animate-pulse" />
            </div>

            {bootSequence === "INIT" && (
              <div className="space-y-1 text-xs">
                <div className="opacity-50">&gt; INITIALIZING HARDWARE...</div>
                <div>&gt; CHECKING MEMORY BANKS... OK</div>
                <div>&gt; MOUNTING LOCAL_CORE... PENDING</div>
              </div>
            )}

            {bootSequence === "BIOS" && (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span>&gt; SYSTEM INITIALIZATION:</span>
                  <span
                    className={
                      biosStatus.server === "OK"
                        ? "text-green-500"
                        : biosStatus.server === "FAIL"
                          ? "text-red-500 animate-pulse"
                          : "text-amber-500/50"
                    }
                    style={
                      biosStatus.server !== "OK" && biosStatus.server !== "FAIL"
                        ? { color: theme.hex }
                        : {}
                    }
                  >
                    {biosStatus.server === "OK"
                      ? "COMPLETE"
                      : biosStatus.server === "FAIL"
                        ? "FAILED"
                        : "PENDING..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>&gt; CORTEX CORE (RAG):</span>
                  <span
                    className={
                      biosStatus.core === "OK"
                        ? "text-green-500"
                        : biosStatus.core === "FAIL"
                          ? "text-red-500 animate-pulse"
                          : "text-amber-500/50"
                    }
                    style={
                      biosStatus.core !== "OK" && biosStatus.core !== "FAIL"
                        ? { color: theme.hex }
                        : {}
                    }
                  >
                    {biosStatus.core === "OK"
                      ? "ONLINE"
                      : biosStatus.core === "FAIL"
                        ? "OFFLINE" // Retain FAIL logic for actual failures
                        : "INITIALIZING..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>&gt; VISUAL CORTEX:</span>
                  <span
                    className={
                      biosStatus.vision === "OK"
                        ? "text-green-500"
                        : biosStatus.vision === "FAIL"
                          ? "text-red-500 animate-pulse"
                          : "text-amber-500/50"
                    }
                    style={
                      biosStatus.vision !== "OK" && biosStatus.vision !== "FAIL"
                        ? { color: theme.hex }
                        : {}
                    }
                  >
                    {biosStatus.vision === "OK"
                      ? "ONLINE"
                      : biosStatus.vision === "FAIL"
                        ? "ERROR"
                        : "CALIBRATING..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>&gt; AUDIO RECEPTORS:</span>
                  <span
                    className={
                      biosStatus.audio === "OK"
                        ? "text-green-500"
                        : biosStatus.audio === "FAIL"
                          ? "text-red-500 animate-pulse"
                          : "text-amber-500/50"
                    }
                    style={
                      biosStatus.audio !== "OK" && biosStatus.audio !== "FAIL"
                        ? { color: theme.hex }
                        : {}
                    }
                  >
                    {biosStatus.audio === "OK"
                      ? "ONLINE"
                      : biosStatus.audio === "FAIL"
                        ? "ERROR"
                        : "CALIBRATING..."}
                  </span>
                </div>
                <div className="text-rq-red animate-pulse mt-2">
                  &gt; SECURITY PROTOCOLS: ENGAGED
                </div>
              </div>
            )}

            {bootSequence === "KERNEL" && (
              <div className="flex flex-col items-center justify-center h-32">
                <div
                  className="w-16 h-16 border-4 rounded-full border-t-transparent animate-spin mb-4"
                  style={{
                    borderColor: theme.hex,
                    borderTopColor: "transparent",
                  }}
                ></div>
                <div className="text-sm font-bold tracking-[0.5em] animate-pulse">
                  LOADING LUCA OS
                </div>
              </div>
            )}
          </div>
        )}

        {bootSequence === "ONBOARDING" && (
          <div className="absolute inset-0 z-10">
            <OnboardingFlow
              theme={theme}
              onComplete={(profile, mode) => {
                console.log("[App] Onboarding Complete:", { profile, mode });
                settingsService.saveSettings({
                  general: {
                    ...settingsService.get("general"),
                    setupComplete: true,
                    preferredMode: mode || "text",
                  },
                });
                if (mode) {
                  const isVoice = mode === "voice";
                  setIsVoiceMode(isVoice);
                  setShowVoiceHud(isVoice);
                }
                setBootSequence("READY");
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Removed Browser block from here (Moved Up)

  console.log("[RENDER] Boot Ready. Rendering Main UI...");

  return (
    <>
      <LiquidBackground theme={theme} className="fixed inset-0 -z-50" />
      <SafeComponent componentName="OverlayManager">
        <OverlayManager
          theme={getThemeColors()}
          persona={persona}
          bootSequence={bootSequence}
          ambientVisionActive={ambientVisionActive}
          presenceMode={presenceMode}
          isScreenSharing={isScreenSharing}
          setIsScreenSharing={setIsScreenSharing}
          handleScreenFrame={handleScreenFrame}
          screenShareRef={screenShareRef}
          activeAutonomousAction={activeAutonomousAction}
          backgroundImage={backgroundImage}
          ghostCursor={ghostCursor}
          isRebooting={isRebooting}
          isVoiceMode={isVoiceMode}
          liveContent={liveContent}
          setLiveContent={setLiveContent}
          approvalRequest={approvalRequest}
          setApprovalRequest={setApprovalRequest}
          showAdminGrantModal={showAdminGrantModal}
          setShowAdminGrantModal={setShowAdminGrantModal}
          adminJustification={adminJustification}
          setIsAdminMode={setIsAdminMode}
          setToolLogs={setToolLogs}
          setMessages={setMessages}
          showWhatsAppManager={showWhatsAppManager}
          setShowWhatsAppManager={setShowWhatsAppManager}
          showTelegramManager={showTelegramManager}
          setShowTelegramManager={setShowTelegramManager}
          showTwitterManager={showTwitterManager}
          setShowTwitterManager={setShowTwitterManager}
          showInstagramManager={showInstagramManager}
          setShowInstagramManager={setShowInstagramManager}
          showLinkedInManager={showLinkedInManager}
          setShowLinkedInManager={setShowLinkedInManager}
          showDiscordManager={showDiscordManager}
          setShowDiscordManager={setShowDiscordManager}
          showYouTubeManager={showYouTubeManager}
          setShowYouTubeManager={setShowYouTubeManager}
          showLucaLinkModal={showLucaLinkModal}
          setShowLucaLinkModal={setShowLucaLinkModal}
          localIp={localIp}
          showProfileManager={showProfileManager}
          setShowProfileManager={setShowProfileManager}
          handleSaveProfile={handleSaveProfile}
          userProfile={userProfile}
          showCodeEditor={showCodeEditor}
          setShowCodeEditor={setShowCodeEditor}
          currentCwd={currentCwd}
          showIngestionModal={showIngestionModal}
          setShowIngestionModal={setShowIngestionModal}
          handleIngest={handleIngest}
          ingestionState={ingestionState}
          isLockdown={isLockdown}
          setIsLockdown={setIsLockdown}
          setSystemStatus={setSystemStatus}
          showAutonomyDashboard={showAutonomyDashboard}
          setShowAutonomyDashboard={setShowAutonomyDashboard}
          showVoiceHud={showVoiceHud}
          toggleVoiceMode={toggleVoiceMode}
          voiceAmplitude={voiceAmplitude}
          voiceTranscript={voiceTranscript || ""}
          setVoiceTranscript={setVoiceTranscript}
          voiceTranscriptSource={voiceTranscriptSource || ""}
          setVoiceTranscriptSource={setVoiceTranscriptSource}
          voiceBackend={voiceBackend}
          localVadActive={localVadActive}
          isVadActive={isVadActive}
          voiceSearchResults={voiceSearchResults}
          visualData={visualData}
          setVisualData={setVisualData}
          voiceStatus={voiceStatus || "IDLE"}
          voiceHubError={voiceHubError || ""}
          voiceModel={voiceModel}
          isVisionActive={isVisionActive}
          pendingCommand={pendingCommand}
          setPendingCommand={setPendingCommand}
          showCamera={showCamera}
          setShowCamera={setShowCamera}
          setAttachedImage={setAttachedImage}
          showRemoteModal={showRemoteModal}
          setShowRemoteModal={setShowRemoteModal}
          remoteCode={remoteCode}
          handleRemoteSuccess={handleRemoteSuccess}
          showDesktopStream={showDesktopStream}
          setShowDesktopStream={setShowDesktopStream}
          desktopTarget={desktopTarget}
          isLocalCoreConnected={isLocalCoreConnected}
          showGeoTactical={showGeoTactical}
          setShowGeoTactical={setShowGeoTactical}
          trackingTarget={trackingTarget}
          tacticalMarkers={tacticalMarkers}
          showCryptoTerminal={showCryptoTerminal}
          setShowCryptoTerminal={setShowCryptoTerminal}
          showForexTerminal={showForexTerminal}
          setShowForexTerminal={setShowForexTerminal}
          showPredictionTerminal={showPredictionTerminal}
          setShowPredictionTerminal={setShowPredictionTerminal}
          polyPositions={polyPositions}
          handlePlaceBet={handlePlaceBet as any}
          showOsintDossier={showOsintDossier}
          setShowOsintDossier={setShowOsintDossier}
          osintProfile={osintProfile}
          showTVRemote={showTVRemote}
          setShowTVRemote={setShowTVRemote}
          activeTV={activeTV}
          executeTool={executeTool}
          showWirelessManager={showWirelessManager}
          setShowWirelessManager={setShowWirelessManager}
          handleWirelessConnect={handleWirelessConnect as any}
          wirelessTab={wirelessTab as any}
          showAppExplorer={showAppExplorer}
          setShowAppExplorer={setShowAppExplorer}
          showMobileFileBrowser={showMobileFileBrowser}
          setShowMobileFileBrowser={setShowMobileFileBrowser}
          showMobileManager={showMobileManager}
          setShowMobileManager={setShowMobileManager}
          activeMobileDevice={activeMobileDevice}
          showNetworkMap={showNetworkMap}
          setShowNetworkMap={setShowNetworkMap}
          showHackingTerminal={showHackingTerminal}
          setShowHackingTerminal={setShowHackingTerminal}
          hackingLogs={hackingLogs}
          showSkillsMatrix={showSkillsMatrix}
          setShowSkillsMatrix={setShowSkillsMatrix}
          showLucaRecorder={showLucaRecorder}
          setShowLucaRecorder={setShowLucaRecorder}
          showStockTerminal={showStockTerminal}
          setShowStockTerminal={setShowStockTerminal}
          stockTerminalSymbol={stockTerminalSymbol}
          showTradingTerminal={showTradingTerminal}
          setShowTradingTerminal={setShowTradingTerminal}
          setShowCompetitionPage={setShowCompetitionPage}
          showCompetitionPage={showCompetitionPage}
          showAITradersPage={showAITradersPage}
          setShowAITradersPage={setShowAITradersPage}
          showSubsystemDashboard={showSubsystemDashboard}
          setShowSubsystemDashboard={setShowSubsystemDashboard}
          humanInputModal={humanInputModal}
          setHumanInputModal={setHumanInputModal}
          handleHumanInputSubmit={handleHumanInputSubmit}
        />
      </SafeComponent>

      {/* Main Dashboard Container */}
      <div
        className={`flex flex-col h-screen w-full font-mono overflow-hidden relative transition-all duration-700 ${
          showVoiceHud
            ? "opacity-0 pointer-events-none scale-95"
            : "opacity-100"
        }`}
        style={{
          borderColor: getThemeColors().hex,
          backgroundColor: "transparent",
        }}
      >
        <SafeComponent componentName="Header">
          <Header
            theme={getThemeColors()}
            persona={persona}
            isMobile={isMobile}
            handleCyclePersona={handleCyclePersona}
            isRebooting={isRebooting}
            handleKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                handleCyclePersona();
              }
            }}
            setIsSettingsOpen={setShowSettingsModal}
            isAdminMode={isAdminMode}
            ambientVisionActive={ambientVisionActive}
            setAmbientVisionActive={setAmbientVisionActive}
            showVoiceHud={showVoiceHud}
            setAmbientSuggestions={setAmbientSuggestions}
            setShowSuggestionChips={setShowSuggestionChips}
            hostPlatform={hostPlatform}
            isListeningAmbient={isListeningAmbient}
            isLocalCoreConnected={isLocalCoreConnected}
            isProcessing={isProcessing}
            audioMonitoringActive={audioMonitoringActive}
            setAudioMonitoringActive={setAudioMonitoringActive}
            setVisionMonitoringActive={setVisionMonitoringActive}
            isWakeWordActive={isWakeWordActive}
            isLockdown={isLockdown}
          />
        </SafeComponent>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative z-10 flex h-full">
          {!isMobile && (
            <>
              <div
                className="flex-none h-full overflow-hidden flex flex-col"
                style={{ width: `${panelWidths.sidebar}px` }}
              >
                <SafeComponent componentName="OperationsSidebar">
                  <OperationsSidebar
                    theme={getThemeColors()}
                    isMobile={false}
                    activeMobileTab=""
                    isListeningAmbient={isListeningAmbient}
                    isLocalCoreConnected={isLocalCoreConnected}
                    isProcessing={isProcessing}
                    setWirelessTab={setWirelessTab}
                    setShowWirelessManager={setShowWirelessManager}
                    setShowNetworkMap={setShowNetworkMap}
                    executeTool={executeTool}
                    devices={devices}
                    handleDeviceControlClick={handleDeviceControlClick}
                    installedModules={installedModules}
                    cryptoWallet={cryptoWallet}
                    forexAccount={forexAccount}
                    osintProfile={osintProfile}
                    hackingLogs={hackingLogs}
                    setShowSkillsMatrix={setShowSkillsMatrix}
                    setVisualData={setVisualData}
                    setShowAppExplorer={setShowAppExplorer}
                    setShowLucaRecorder={setShowLucaRecorder}
                    setStockTerminalSymbol={setStockTerminalSymbol}
                    setShowStockTerminal={setShowStockTerminal}
                    setShowTradingTerminal={setShowTradingTerminal}
                    setShowSubsystemDashboard={setShowSubsystemDashboard}
                    setShowInvestigationReports={setShowInvestigationReports}
                    setShowIngestionModal={setShowIngestionModal}
                    setShowCodeEditor={setShowCodeEditor}
                    setShowPredictionTerminal={setShowPredictionTerminal}
                    setShowLucaLinkModal={setShowLucaLinkModal}
                    setShowCryptoTerminal={setShowCryptoTerminal}
                    setShowForexTerminal={setShowForexTerminal}
                    setShowOsintDossier={setShowOsintDossier}
                    setShowHackingTerminal={setShowHackingTerminal}
                  />
                </SafeComponent>
              </div>
              <PanelResizer
                themeColor={getThemeColors().hex}
                onResize={(delta) =>
                  setPanelWidths((p: any) => ({
                    ...p,
                    sidebar: Math.max(250, p.sidebar + delta),
                  }))
                }
              />
            </>
          )}

          {isMobile && activeMobileTab === "SYSTEM" && (
            <div className="flex w-full h-full">
              <OperationsSidebar
                theme={getThemeColors()}
                isMobile={true}
                activeMobileTab="SYSTEM"
                isListeningAmbient={isListeningAmbient}
                isLocalCoreConnected={isLocalCoreConnected}
                isProcessing={isProcessing}
                setWirelessTab={setWirelessTab}
                setShowWirelessManager={setShowWirelessManager}
                setShowNetworkMap={setShowNetworkMap}
                executeTool={executeTool}
                devices={devices}
                handleDeviceControlClick={handleDeviceControlClick}
                installedModules={installedModules}
                cryptoWallet={cryptoWallet}
                forexAccount={forexAccount}
                osintProfile={osintProfile}
                hackingLogs={hackingLogs}
                setShowSkillsMatrix={setShowSkillsMatrix}
                setVisualData={setVisualData}
                setShowAppExplorer={setShowAppExplorer}
                setShowLucaRecorder={setShowLucaRecorder}
                setStockTerminalSymbol={setStockTerminalSymbol}
                setShowStockTerminal={setShowStockTerminal}
                setShowTradingTerminal={setShowTradingTerminal}
                setShowSubsystemDashboard={setShowSubsystemDashboard}
                setShowInvestigationReports={setShowInvestigationReports}
                setShowIngestionModal={setShowIngestionModal}
                setShowCodeEditor={setShowCodeEditor}
                setShowPredictionTerminal={setShowPredictionTerminal}
                setShowLucaLinkModal={setShowLucaLinkModal}
                setShowCryptoTerminal={setShowCryptoTerminal}
                setShowForexTerminal={setShowForexTerminal}
                setShowOsintDossier={setShowOsintDossier}
                setShowHackingTerminal={setShowHackingTerminal}
              />
            </div>
          )}

          {!isMobile && (
            <>
              <div className="flex-1 h-full overflow-hidden flex flex-col">
                <SafeComponent componentName="ChatPanel">
                  <ChatPanel
                    messages={messages}
                    isMobile={false}
                    activeMobileTab=""
                    theme={getThemeColors()}
                    isProcessing={isProcessing}
                    persona={persona as PersonaType}
                    chatEndRef={chatEndRef}
                    handleSendMessage={handleSendMessage}
                    setAmbientSuggestions={setAmbientSuggestions}
                    ambientSuggestions={ambientSuggestions}
                    showSuggestionChips={showSuggestionChips}
                    setShowSuggestionChips={setShowSuggestionChips}
                    showVoiceHud={showVoiceHud}
                    bootSequence={bootSequence}
                    currentCwd={currentCwd}
                    isKernelLocked={isKernelLocked}
                    opsecStatus={opsecStatus}
                    attachedImage={attachedImage}
                    setAttachedImage={setAttachedImage}
                    fileInputRef={fileInputRef}
                    handleFileSelect={handleFileSelect}
                    input={input}
                    setInput={setInput}
                    handleSend={() => {
                      if (handleSendMessageRef.current) {
                        handleSendMessageRef.current(input, attachedImage);
                      }
                    }}
                    isVoiceMode={isVoiceMode}
                    toggleVoiceMode={toggleVoiceMode}
                    showCamera={showCamera}
                    setShowCamera={setShowCamera}
                    handleScreenShare={() =>
                      setIsScreenSharing(!isScreenSharing)
                    }
                    handleClearChat={handleClearChat}
                    handleStop={handleStop}
                  />
                </SafeComponent>
              </div>
            </>
          )}

          {isMobile && activeMobileTab === "TERMINAL" && (
            <div className="flex w-full h-full">
              <ChatPanel
                messages={messages}
                isMobile={true}
                activeMobileTab="TERMINAL"
                theme={getThemeColors()}
                isProcessing={isProcessing}
                persona={persona as PersonaType}
                chatEndRef={chatEndRef}
                handleSendMessage={handleSendMessage}
                setAmbientSuggestions={setAmbientSuggestions}
                ambientSuggestions={ambientSuggestions}
                showSuggestionChips={showSuggestionChips}
                setShowSuggestionChips={setShowSuggestionChips}
                showVoiceHud={showVoiceHud}
                bootSequence={bootSequence}
                currentCwd={currentCwd}
                isKernelLocked={isKernelLocked}
                opsecStatus={opsecStatus}
                attachedImage={attachedImage}
                setAttachedImage={setAttachedImage}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                input={input}
                setInput={setInput}
                handleSend={() => {
                  if (handleSendMessageRef.current) {
                    handleSendMessageRef.current(input, attachedImage);
                  }
                }}
                isVoiceMode={isVoiceMode}
                toggleVoiceMode={toggleVoiceMode}
                showCamera={showCamera}
                setShowCamera={setShowCamera}
                handleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
                handleClearChat={handleClearChat}
                handleStop={handleStop}
              />
            </div>
          )}

          {/* Right Panel or Data Panel */}
          {!isMobile && (
            <>
              <PanelResizer
                themeColor={theme.hex}
                onResize={(delta) =>
                  setPanelWidths((p: any) => ({
                    ...p,
                    right: Math.max(250, p.right - delta),
                  }))
                }
              />
              <section
                className={`flex-none h-full border-l border-white/10 relative overflow-hidden flex flex-col ${
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "glass-panel-light"
                    : "glass-panel"
                }`}
                style={{
                  width: `${panelWidths.right}px`,
                  background:
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(255, 255, 255, 0.5)"
                      : "rgba(0, 0, 0, var(--app-bg-opacity, 0.4))",
                }}
              >
                <div className="flex flex-col h-full w-full overflow-hidden">
                  {/* Content rendered inline to avoid duplicating code across Mobile/Desktop */}
                  <div
                    className="flex flex-none"
                    style={{
                      borderBottom: `1px solid ${setHexAlpha(getThemeColors().hex, 0.2)}`,
                    }}
                  >
                    <button
                      onClick={() => {
                        setRightPanelMode("MANAGE");
                        soundService.play("KEYSTROKE");
                      }}
                      className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                        rightPanelMode === "MANAGE"
                          ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      MANAGE
                    </button>
                    <button
                      onClick={() => {
                        setRightPanelMode("LOGS");
                        soundService.play("KEYSTROKE");
                      }}
                      className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                        rightPanelMode === "LOGS"
                          ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      LOGS
                    </button>
                    <button
                      onClick={() => {
                        setRightPanelMode("MEMORY");
                        soundService.play("KEYSTROKE");
                      }}
                      className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                        rightPanelMode === "MEMORY"
                          ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      MEMORY
                    </button>
                    <button
                      onClick={() => {
                        setRightPanelMode("CLOUD");
                        soundService.play("KEYSTROKE");
                      }}
                      className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                        rightPanelMode === "CLOUD"
                          ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      <BrainCircuit size={14} className="mx-auto" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pl-1 pr-4 py-4 font-mono text-xs relative">
                    {rightPanelMode === "MANAGE" && (
                      <div className="space-y-1">
                        <ManagementDashboard theme={getThemeColors()} />
                      </div>
                    )}

                    {rightPanelMode === "LOGS" && (
                      <div className="space-y-1">
                        {toolLogs.length === 0 && (
                          <div className="text-slate-700 italic">
                            System idle.
                          </div>
                        )}
                        {toolLogs.map((log, i) => (
                          <div
                            key={i}
                            className={`border-l border-slate-800 pl-2 py-1 hover:bg-white/5 transition-colors group font-mono text-[10px]`}
                          >
                            <div className="flex justify-between opacity-50 mb-0.5 text-slate-400">
                              <span
                                className={`font-bold group-hover:text-white transition-colors ${
                                  log.toolName === "SENTINEL_LOOP"
                                    ? "text-slate-500"
                                    : getThemeColors().primary
                                }`}
                              >
                                {log.toolName}
                              </span>
                              <span>
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div
                              className={`font-bold ${
                                log.result.startsWith("ERROR") ||
                                log.result.startsWith("ACTION ABORTED")
                                  ? "text-red-500"
                                  : log.result.includes("SENTINEL")
                                    ? "text-slate-500"
                                    : "text-white"
                              }`}
                            >
                              {log.result.substring(0, 100)}
                              {log.result.length > 100 && "..."}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {rightPanelMode === "MEMORY" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <span
                            style={{ color: getThemeColors().hex }}
                            className="font-bold uppercase tracking-wider"
                          >
                            NEURAL ARCHIVE
                          </span>
                          <button
                            onClick={async () => {
                              soundService.play("KEYSTROKE");
                              await memoryService.wipeMemory();
                              setMemories([]);
                            }}
                            className="text-red-500 hover:text-white transition-colors p-1 rounded hover:bg-red-500/10"
                            title="Format Memory"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {memories.filter(
                          (mem) =>
                            !mem.value.includes("[AMBIENT VISION") &&
                            !mem.value.includes("[SYSTEM INSTRUCTION") &&
                            !mem.key.includes("SYSTEM_INSTRUCTION"),
                        ).length === 0 && (
                          <div className="text-slate-700 italic">
                            Memory banks empty.
                          </div>
                        )}
                        {memories
                          .filter(
                            (mem) =>
                              !mem.value.includes("[AMBIENT VISION") &&
                              !mem.value.includes("[SYSTEM INSTRUCTION") &&
                              !mem.key.includes("SYSTEM_INSTRUCTION"),
                          )
                          .map((mem) => (
                            <div
                              key={mem.id}
                              className="p-3 rounded transition-all group/mem relative bg-white/5 border"
                              style={{
                                borderColor: setHexAlpha(
                                  getThemeColors().hex,
                                  0.2,
                                ),
                                backgroundColor: setHexAlpha(
                                  getThemeColors().hex,
                                  0.05,
                                ),
                              }}
                            >
                              <div className="flex justify-between text-[9px] mb-2 opacity-60">
                                <div className="flex gap-2">
                                  <span className="font-bold tracking-widest text-slate-300">
                                    {new Date(mem.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <button
                                  onClick={async () => {
                                    soundService.play("KEYSTROKE");
                                    const success =
                                      await memoryService.deleteMemory(mem.id);
                                    if (success) {
                                      setMemories((prev) =>
                                        prev.filter((m) => m.id !== mem.id),
                                      );
                                    }
                                  }}
                                  className="opacity-0 group-hover/mem:opacity-100 text-red-500 hover:text-white transition-all p-1"
                                  title="Delete Segment"
                                >
                                  <Trash size={10} />
                                </button>
                              </div>
                              <div className="text-slate-400 opacity-80 max-h-32 overflow-hidden text-ellipsis whitespace-pre-wrap">
                                {mem.value}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {rightPanelMode === "CLOUD" && (
                      <LucaCloud memories={memories} theme={getThemeColors()} />
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Mobile Right Panel or Data Panel */}
          {isMobile && activeMobileTab === "DATA" && (
            <section
              className={`flex-1 flex-col h-full border-l border-white/10 relative overflow-hidden flex ${
                getThemeColors().themeName?.toLowerCase() === "lucagent"
                  ? "glass-panel-light"
                  : "glass-panel"
              }`}
              style={{
                background:
                  getThemeColors().themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(0, 0, 0, 0.4)",
              }}
            >
              <div className="flex flex-col h-full w-full overflow-hidden">
                <div
                  className="flex flex-none"
                  style={{
                    borderBottom: `1px solid ${setHexAlpha(getThemeColors().hex, 0.2)}`,
                  }}
                >
                  <button
                    onClick={() => {
                      setRightPanelMode("MANAGE");
                      soundService.play("KEYSTROKE");
                    }}
                    className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                      rightPanelMode === "MANAGE"
                        ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    MANAGE
                  </button>
                  <button
                    onClick={() => {
                      setRightPanelMode("LOGS");
                      soundService.play("KEYSTROKE");
                    }}
                    className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                      rightPanelMode === "LOGS"
                        ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    LOGS
                  </button>
                  <button
                    onClick={() => {
                      setRightPanelMode("MEMORY");
                      soundService.play("KEYSTROKE");
                    }}
                    className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                      rightPanelMode === "MEMORY"
                        ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    MEMORY
                  </button>
                  <button
                    onClick={() => {
                      setRightPanelMode("CLOUD");
                      soundService.play("KEYSTROKE");
                    }}
                    className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${
                      rightPanelMode === "CLOUD"
                        ? `bg-white/5 ${getThemeColors().primary} border-b-2 ${getThemeColors().border}`
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <BrainCircuit size={14} className="mx-auto" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pl-1 pr-4 py-4 font-mono text-xs relative">
                  {rightPanelMode === "MANAGE" && (
                    <div className="space-y-1">
                      <ManagementDashboard theme={getThemeColors()} />
                    </div>
                  )}

                  {rightPanelMode === "LOGS" && (
                    <div className="space-y-1">
                      {toolLogs.length === 0 && (
                        <div className="text-slate-700 italic">
                          System idle.
                        </div>
                      )}
                      {toolLogs.map((log, i) => (
                        <div
                          key={i}
                          className={`border-l border-slate-800 pl-2 py-1 hover:bg-white/5 transition-colors group font-mono text-[10px]`}
                        >
                          <div className="flex justify-between opacity-50 mb-0.5 text-slate-400">
                            <span
                              className={`font-bold group-hover:text-white transition-colors ${
                                log.toolName === "SENTINEL_LOOP"
                                  ? "text-slate-500"
                                  : getThemeColors().primary
                              }`}
                            >
                              {log.toolName}
                            </span>
                            <span>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div
                            className={`font-bold ${
                              log.result.startsWith("ERROR") ||
                              log.result.startsWith("ACTION ABORTED")
                                ? "text-red-500"
                                : log.result.includes("SENTINEL")
                                  ? "text-slate-500"
                                  : "text-white"
                            }`}
                          >
                            {log.result.substring(0, 100)}
                            {log.result.length > 100 && "..."}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {rightPanelMode === "MEMORY" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span
                          style={{ color: getThemeColors().hex }}
                          className="font-bold uppercase tracking-wider"
                        >
                          NEURAL ARCHIVE
                        </span>
                        <button
                          onClick={async () => {
                            soundService.play("KEYSTROKE");
                            await memoryService.wipeMemory();
                            setMemories([]);
                          }}
                          className="text-red-500 hover:text-white transition-colors p-1 rounded hover:bg-red-500/10"
                          title="Format Memory"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {memories.filter(
                        (mem) => !mem.value.includes("[AMBIENT VISION"),
                      ).length === 0 && (
                        <div className="text-slate-700 italic">
                          Memory banks empty.
                        </div>
                      )}
                      {memories
                        .filter((mem) => !mem.value.includes("[AMBIENT VISION"))
                        .map((mem) => (
                          <div
                            key={mem.id}
                            className="p-3 rounded transition-all group/mem relative bg-white/5 border"
                            style={{
                              borderColor: setHexAlpha(
                                getThemeColors().hex,
                                0.2,
                              ),
                              backgroundColor: setHexAlpha(
                                getThemeColors().hex,
                                0.05,
                              ),
                            }}
                          >
                            <div className="flex justify-between text-[9px] mb-2 opacity-60">
                              <div className="flex gap-2">
                                <span className="font-bold tracking-widest text-slate-300">
                                  {new Date(mem.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <button
                                onClick={async () => {
                                  soundService.play("KEYSTROKE");
                                  const success =
                                    await memoryService.deleteMemory(mem.id);
                                  if (success) {
                                    setMemories((prev) =>
                                      prev.filter((m) => m.id !== mem.id),
                                    );
                                  }
                                }}
                                className="opacity-0 group-hover/mem:opacity-100 text-red-500 hover:text-white transition-all p-1"
                                title="Delete Segment"
                              >
                                <Trash size={10} />
                              </button>
                            </div>
                            <div className="text-slate-400 opacity-80 max-h-32 overflow-hidden text-ellipsis whitespace-pre-wrap">
                              {mem.value}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {rightPanelMode === "CLOUD" && (
                    <LucaCloud memories={memories} theme={getThemeColors()} />
                  )}
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Mobile Navigation Bar */}
        {isMobile && (
          <nav
            className={`flex-none h-16 ${
              getThemeColors().themeName?.toLowerCase() === "lucagent"
                ? "bg-white border-t border-slate-200"
                : "bg-black border-t border-white/10"
            } grid grid-cols-3 items-center z-50`}
          >
            <button
              onClick={() => setActiveMobileTab("SYSTEM")}
              className={`flex flex-col items-center justify-center h-full gap-1 ${
                activeMobileTab === "SYSTEM"
                  ? getThemeColors().primary
                  : "text-slate-500"
              }`}
            >
              <Cpu size={20} />
              <span className="text-[10px] font-bold tracking-widest">
                SYSTEM
              </span>
            </button>
            <button
              onClick={() => setActiveMobileTab("TERMINAL")}
              className={`flex flex-col items-center justify-center h-full gap-1 ${
                activeMobileTab === "TERMINAL"
                  ? getThemeColors().primary
                  : "text-slate-500"
              }`}
            >
              <TerminalIcon size={20} />
              <span className="text-[10px] font-bold tracking-widest">
                TERMINAL
              </span>
            </button>
            <button
              onClick={() => setActiveMobileTab("DATA")}
              className={`flex flex-col items-center justify-center h-full gap-1 ${
                activeMobileTab === "DATA"
                  ? getThemeColors().primary
                  : "text-slate-500"
              }`}
            >
              <Database size={20} />
              <span className="text-[10px] font-bold tracking-widest">
                DATA
              </span>
            </button>
          </nav>
        )}
        {showSettingsModal && (
          <SettingsModal
            theme={getThemeColors()}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
        {showInvestigationReports && (
          <InvestigationReports
            onClose={() => setShowInvestigationReports(false)}
            theme={theme}
          />
        )}
      </div>
    </>
  );
}
