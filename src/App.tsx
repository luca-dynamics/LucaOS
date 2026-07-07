import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { LucaExperienceMode } from "./experience/experienceMode";
import { toHeaderTier } from "./experience/experienceMode";
import {
  getDefaultRightPanelModeForExperience,
  getRightPanelLabelForMode,
  getVisibleRightPanelModes,
} from "./experience/dashboardDisclosure";
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
import {
  awarenessService,
  AwarenessSuggestion,
} from "./services/awarenessService";

import { taskQueue } from "./services/taskQueueService";
import { soundService } from "./services/soundService";
import { voiceService } from "./services/voiceService";
import { settingsService } from "./services/settingsService";
import { getLucaSkinDefinition } from "./config/lucaSkins";
import { resolveLucaDashboardSkinBoundary } from "./styles/lucaDashboardSkinBoundary";
import { resolveLucaMobileSkinBoundary } from "./styles/lucaMobileSkinBoundary";
import { getLucaSkinMaterialVariables } from "./styles/lucaSkinMaterialBridge";
import { voiceSessionOrchestrator } from "./services/voiceSessionOrchestrator";
import { eventBus } from "./services/eventBus";
import { UIThemeId } from "./types/lucaPersonality";
import { apiUrl, cortexUrl, getConnectionTier } from "./config/api";
import { ToolRegistry, MissionScope } from "./services/toolRegistry";
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

import { Icon } from "./components/ui/Icon";
import {
  applyLucaAppearanceCssVariables,
  buildLucaAppearanceCssVariableState,
} from "./config/lucaAppearanceTokens";

import LucaBrowser from "./components/LucaBrowser";
import { watchGateway } from "./services/watchGateway";

import { lucaLinkManager } from "./services/lucaLink/manager";

import type { ScreenShareHandle } from "./components/ScreenShare";
import conversationService from "./services/conversationService";
import { SettingsModal } from "./components/SettingsModal";
import SandboxedBrowserShell from "./components/browser/SandboxedBrowserShell";
import ChatWidgetMode from "./components/ChatWidgetMode";
import WidgetMode from "./components/WidgetMode";
import HologramMode from "./components/HologramMode";
import {
  createWidgetPresenceSnapshot,
  toHologramUpdate,
  toLucaLinkUiStateSync,
  toWidgetUpdate,
  type WidgetLegacyPayload,
} from "./presence";

// Helper for device capability check removed temporarily as it's unused

import InvestigationReports from "./components/InvestigationReports";
import DarkWebScanner from "./components/DarkWebScanner";
import VisualCore from "./components/VisualCore";
import { guardService } from "./services/guardService";

// Thought Parser imports removed as they were unused
import VisionHUD from "./components/VisionHUD";

// Layout Modularization Phase 2
import Header from "./components/layout/Header";
import OperationsSidebar from "./components/layout/OperationsSidebar";
import ShellPresenceMark from "./components/presence/ShellPresenceMark";
import AppMenu from "./components/layout/AppMenu";
import { LUCA_MOTION_CSS_VARIABLES } from "./styles/lucaPresenceMotion";
import { hasMacTrafficLights } from "./windowControlsOverlay";
import WindowControls from "./components/layout/WindowControls";
import SessionsRail from "./components/left-panel/SessionsRail";
import { useLucaLinkDevices } from "./hooks/useLucaLinkDevices";
import ChatPanel from "./components/layout/ChatPanel";
import OverlayManager from "./components/layout/OverlayManager";
import PanelResizer from "./components/layout/PanelResizer";
import {
  ACTIVITY_RAIL_ICONS,
  DESKTOP_RAIL_WIDTH_PX,
  LEFT_PANEL_COLLAPSED_KEY,
  RIGHT_PANEL_COLLAPSED_KEY,
  leftToggleIcon,
  readCollapsedPreference,
  rightToggleIcon,
  writeCollapsedPreference,
} from "./components/layout/desktopShellModel";
import { useAppSystem } from "./hooks/app/useAppSystem";
import { useAppIPC } from "./hooks/app/useAppIPC";
import { useVoiceEngine } from "./hooks/app/useVoiceEngine";
import { useChatController } from "./hooks/app/useChatController";
import { useToolOrchestrator } from "./hooks/app/useToolOrchestrator";
import { BootSequence } from "./hooks/app/useAppSystem";
import { LucaPremiumOnboardingPreview } from "./components/Onboarding/LucaPremiumOnboardingPreview";
import { mapLucaOnboardingFlowToDesktopCompletion } from "./components/Onboarding/lucaOnboardingCompletionBridge";
import { useLucaLocalEndpointStatus } from "./hooks/useLucaLocalEndpointStatus";
import { LiquidBackground } from "./components/visual/LiquidBackground.tsx";
import { EdgePresence } from "./components/presence";
import { THEME_PALETTE } from "./config/themeColors";
import { isElectron as checkElectron, isWeb } from "./utils/env";
import ControlPanel from "./components/right-panel/ControlPanel";
import ActivityPanel from "./components/right-panel/ActivityPanel";
import MemoryControlPanel from "./components/right-panel/MemoryControlPanel";
import TraceLogsPanel from "./components/right-panel/TraceLogsPanel";
import { SkillPermissionGrantProvider } from "./components/SkillPermissionGrantContext";
import { isRightPanelMode } from "./components/right-panel/rightPanelModel";
import {
  mobileNavigationLabel,
  type MobileNavigationTab,
} from "./components/layout/mobileNavigationModel";
import {
  lucaShellActiveControlStyle,
  lucaShellActiveIndicatorStyle,
  lucaShellActiveTabStyle,
  lucaShellClassNames,
  lucaShellControlStyle,
  lucaShellHeaderGhostControlStyle,
  lucaShellDividerStyle,
  lucaShellMutedTextStyle,
  lucaShellPanelSurfaceStyle,
  lucaShellRailSurfaceStyle,
  lucaShellTabStyle,
  lucaShellWorkspaceSurfaceStyle,
} from "./styles/lucaShellStyles";
import {
  lucaMobileActiveIndicatorStyle,
  lucaMobileActiveTabStyle,
  lucaMobileClassNames,
  lucaMobileContentSurfaceStyle,
  lucaMobileDividerStyle,
  lucaMobileInactiveTabStyle,
  lucaMobileNavActiveStyle,
  lucaMobileNavInactiveStyle,
  lucaMobileNavSurfaceStyle,
  lucaMobilePanelSurfaceStyle,
} from "./styles/lucaMobileShellStyles";
import { resolveLucaPlatformBackgroundPolicy } from "./styles/lucaPlatformBackgroundPolicy";
import { resolveLucaMaterialHostPolicy } from "./styles/lucaMaterialSettings";
import { readCurrentWebAccessPolicy } from "./config/webAccessPolicy";
import {
  resolveBrowserSafeBootState,
  shouldShowBootShell,
} from "./config/browserSafeBootResolver";
import WebRuntimeCapabilityStrip from "./components/web/WebRuntimeCapabilityStrip";

// --- Mock Initial State ---

// Silencing unused imports/globals

// CHAT_STORAGE_KEY and MAX_HISTORY_LIMIT are now in useChatController

function normalizePersonaValue(value: unknown): PersonaType {
  if (typeof value === "string" && value.trim()) {
    return value as PersonaType;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (
      entries.length > 0 &&
      entries.every(
        ([key, item]) => /^\d+$/.test(key) && typeof item === "string",
      )
    ) {
      return entries
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, item]) => item)
        .join("") as PersonaType;
    }

    const candidate =
      (value as any).persona ??
      (value as any).name ??
      (value as any).id ??
      (value as any).value;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate as PersonaType;
    }
  }

  return "ASSISTANT";
}

/**
 * Normalize persona name by mapping common aliases to canonical names
 * "normal mode" or "default mode" -> "ASSISTANT" (the default/normal persona)
 * "ruthless mode" or "command mode" -> "RUTHLESS" (efficiency/tactical mode)
 */

export default function App() {
  return (
    <AppProvider>
      <SkillPermissionGrantProvider>
        <AppContent />
      </SkillPermissionGrantProvider>
    </AppProvider>
  );
}

function AppContent() {
  // console.log("[APP] Rendering AppContent...");
  // --- 1. PLATFORM & BASIC STATE ---
  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = checkElectron();
  const desktopPlatformLabel =
    typeof window !== "undefined" && (window as any).luca?.platform === "darwin"
      ? "on macOS"
      : typeof window !== "undefined" &&
          (window as any).luca?.platform === "win32"
        ? "on Windows"
        : isElectron
          ? "on desktop"
          : "in browser";
  const lucaBrandDisplayStyle: React.CSSProperties = {
    fontFamily:
      '"Segoe UI Variable Display", Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontWeight: 650,
    letterSpacing: "-0.025em",
  };
  const bootDebugEnabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("bootDebug") === "1";
  const webAccessPolicy = useMemo(
    () => readCurrentWebAccessPolicy({ isElectronRuntime: isElectron }),
    [isElectron],
  );
  const browserSafeBootState = useMemo(
    () =>
      resolveBrowserSafeBootState(webAccessPolicy, {
        releaseTarget: import.meta.env.VITE_LUCA_RELEASE_TARGET,
        runtimeTarget: import.meta.env.VITE_LUCA_RUNTIME_TARGET,
        appMode: import.meta.env.VITE_LUCA_APP_MODE,
        hostname: typeof window !== "undefined" ? window.location.hostname : "",
        isElectronRuntime: isElectron,
      }),
    [webAccessPolicy, isElectron],
  );
  const isBrowserSafeWebInterface = browserSafeBootState.bootResolved;
  const isMobile = useMobile();
  const platformBackgroundPolicy = useMemo(
    () =>
      resolveLucaPlatformBackgroundPolicy({
        isMobileViewport: isMobile,
        isNativeMobile: isCapacitor,
        isDesktopNative: isElectron,
      }),
    [isMobile, isCapacitor, isElectron],
  );

  const { status: localEndpointStatus } = useLucaLocalEndpointStatus();
  const systemRamBytes = (() => {
    const gb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return typeof gb === "number" ? gb * 1e9 : undefined;
  })();

  const [currentCwd, setCurrentCwd] = useState<string>("");
  const [opsecStatus, setOpsecStatus] = useState<string>("ACTIVE");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // State required by useAppSystem
  const [bootSequence, setBootSequence] = useState<BootSequence>(() =>
    isBrowserSafeWebInterface ? "READY" : "INIT",
  );
  const [showBrowserSafeBootShell, setShowBrowserSafeBootShell] = useState(
    isBrowserSafeWebInterface,
  );
  const [browserSafeBootResolved, setBrowserSafeBootResolved] = useState(
    !isBrowserSafeWebInterface,
  );
  const [biosStatus, setBiosStatus] = useState<any>({
    server: "PENDING",
    core: "PENDING",
    vision: "PENDING",
    audio: "PENDING",
  });
  const hasLoggedWebBootDiagnosticRef = useRef(false);

  useEffect(() => {
    if (!isBrowserSafeWebInterface) {
      setBrowserSafeBootResolved(true);
      setShowBrowserSafeBootShell(false);
      return;
    }

    setBrowserSafeBootResolved(false);
    setShowBrowserSafeBootShell(true);
    setBootSequence("READY");
    setBiosStatus({
      server: "API REQUIRED",
      core: "DESKTOP REQUIRED",
      vision: "DISABLED IN WEB",
      audio: "DISABLED IN WEB",
      ollama: "DESKTOP REQUIRED",
    });

    const resolveWebBoot = () => {
      // Web-only hard fail-safe: once the intro/fallback fires, force the
      // browser-safe app shell to render even though desktop/local readiness
      // remains unavailable in a deployed browser.
      setBootSequence("READY");
      setBrowserSafeBootResolved(true);
      setShowBrowserSafeBootShell(false);
      setBiosStatus({
        server: "API REQUIRED",
        core: "DESKTOP REQUIRED",
        vision: "DISABLED IN WEB",
        audio: "DISABLED IN WEB",
        ollama: "DESKTOP REQUIRED",
        desktopRuntimeStatus: "desktop-required",
        localServicesStatus: "skipped",
        nativeActionsStatus: "disabled_in_web",
      });
    };

    const browserSafeBootTimer = window.setTimeout(
      resolveWebBoot,
      browserSafeBootState.minVisualDurationMs,
    );
    const browserSafeFallbackTimer = window.setTimeout(
      resolveWebBoot,
      browserSafeBootState.fallbackTimeoutMs,
    );

    return () => {
      window.clearTimeout(browserSafeBootTimer);
      window.clearTimeout(browserSafeFallbackTimer);
    };
  }, [browserSafeBootState, isBrowserSafeWebInterface]);

  // Reveal the Electron main window only once the app is past boot
  // (READY/ONBOARDING). The native boot splash stays up through the entire React
  // boot, so the redundant in-app boot screen is never shown — and the window
  // never flashes empty. No-op outside Electron (window.luca is undefined).
  const hasSignaledHostReadyRef = useRef(false);
  useEffect(() => {
    if (hasSignaledHostReadyRef.current) return;
    if (bootSequence === "READY" || bootSequence === "ONBOARDING") {
      hasSignaledHostReadyRef.current = true;
      const reveal = () =>
        (
          window as unknown as { luca?: { notifyReady?: () => void } }
        ).luca?.notifyReady?.();
      // Wait for the destination UI (onboarding/dashboard) to actually paint in
      // the still-hidden window before revealing it — so the boot splash hands
      // off straight to onboarding with no black holding-screen flash in between.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(reveal, 80)),
      );
    }
  }, [bootSequence]);

  useEffect(() => {
    if (!isBrowserSafeWebInterface && !bootDebugEnabled) return;
    if (hasLoggedWebBootDiagnosticRef.current) return;
    hasLoggedWebBootDiagnosticRef.current = true;

    console.info(
      `[LucaOS web boot] mode=${browserSafeBootState.runtimeMode}`,
      {
        releaseTarget: import.meta.env.VITE_LUCA_RELEASE_TARGET || "",
        runtimeTarget: import.meta.env.VITE_LUCA_RUNTIME_TARGET || "",
        appMode: import.meta.env.VITE_LUCA_APP_MODE || "",
        hostname: typeof window !== "undefined" ? window.location.hostname : "",
        shouldRenderBrowserSafeApp:
          webAccessPolicy.shouldRenderBrowserSafeApp,
        resolverActive: browserSafeBootState.bootResolved,
        bootSequence,
        showBootShell: showBrowserSafeBootShell,
        browserSafeBootResolved,
        fallbackTimeoutMs: browserSafeBootState.fallbackTimeoutMs,
        readiness: browserSafeBootState.readiness,
        reason: browserSafeBootState.reason,
      },
    );
  }, [
    bootDebugEnabled,
    bootSequence,
    browserSafeBootResolved,
    browserSafeBootState,
    isBrowserSafeWebInterface,
    showBrowserSafeBootShell,
    webAccessPolicy,
  ]);

  // --- 2. REFS ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<ScreenShareHandle>(null);
  const lucaLinkSocketRef = useRef<any>(null);
  const currentDeviceTypeRef = useRef<any>("desktop");
  const hasAnnouncedRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- PANEL LAYOUT STATE ---
  const [panelWidths, setPanelWidths] = useState({
    sidebar: 320,
    chat: 430,
    right: 380,
  });

  // Desktop-only collapsible side panels (UI shell layout only). Persisted via
  // the existing `luca_*` localStorage preference convention.
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(() =>
    readCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY),
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() =>
    readCollapsedPreference(RIGHT_PANEL_COLLAPSED_KEY),
  );
  useEffect(() => {
    writeCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, leftPanelCollapsed);
  }, [leftPanelCollapsed]);
  useEffect(() => {
    writeCollapsedPreference(RIGHT_PANEL_COLLAPSED_KEY, rightPanelCollapsed);
  }, [rightPanelCollapsed]);
  const [connectionTier, setConnectionTier] = useState<
    "LAN" | "LOCAL" | "CLOUD" | "OFFLINE"
  >("LOCAL");

  // Helper refs for hooks to avoid circular dependencies
  const executeToolRef = useRef<any>(null);
  const handleSendMessageRef = useRef<any>(null);
  const handlePersonaSwitchRef = useRef<any>(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // --- 1. SYSTEM TRANSPARENCY CLEANUP (Definitive Fix for Ghost Backgrounds) ---
  useEffect(() => {
    if (isElectron) {
      // Forcefully clear any backgrounds set by index.tsx or other side-effects
      document.documentElement.style.backgroundColor = "transparent";
      document.body.style.backgroundColor = "transparent";

      // Add a class for global CSS overrides
      document.documentElement.classList.add("is-electron");
    } else if (isWeb()) {
      // Web fallback: ensure we have a background if index.tsx didn't set it
      // but only if it's currently transparent
      // Note: we'll use a local check for isLight here
      const themeId = settingsService.get?.("general")?.theme;
      const isLightMode = PERSONA_UI_CONFIG[themeId as any]?.isLight || false;
      if (
        !document.documentElement.style.backgroundColor ||
        document.documentElement.style.backgroundColor === "transparent"
      ) {
        document.documentElement.style.backgroundColor = isLightMode
          ? "var(--luca-background-base, #f6f7f9)"
          : "var(--luca-background-base, #101215)";
      }
    }
  }, [isElectron]);

  // NEW: UI State (Hoisted for Tool Orchestrator)
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [contextDisplayId, setContextDisplayId] = useState<number>(0);
  const [liveContent, setLiveContent] = useState<any>(null);
  const [input, setInput] = useState("");
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([]);

  const [persona, setPersona] = useState<PersonaType>(() => {
    const settings = settingsService.getSettings();
    return normalizePersonaValue(settings.general?.persona);
  });

  const [activeThemeId, setActiveThemeId] = useState<UIThemeId>(() => {
    const settings = settingsService.getSettings();
    return (settings.general?.theme as UIThemeId) || "PROFESSIONAL";
  });

  const [experienceMode, setExperienceMode] = useState<LucaExperienceMode>(
    () => settingsService.getSettings().general.experienceMode,
  );

  const [selectedSkinId, setSelectedSkinId] = useState<unknown>(
    () => settingsService.getSettings().general.selectedSkinId,
  );

  // The being's other bodies: LucaLink-paired devices, live. Display-only.
  const lucaLinkBodyDevices = useLucaLinkDevices();
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.3);
  const [backgroundBlur, setBackgroundBlur] = useState<number>(40);
  // Live material preview: the Appearance sliders broadcast while dragging;
  // the boundary recomputes and the WHOLE app follows. Cancel/close restores
  // persisted values via the same event.
  useEffect(() => {
    const onPreview = (event: Event) => {
      const detail = (event as CustomEvent<{ opacity?: number; blur?: number }>)
        .detail;
      if (typeof detail?.opacity === "number") setBackgroundOpacity(detail.opacity);
      if (typeof detail?.blur === "number") setBackgroundBlur(detail.blur);
    };
    window.addEventListener("luca:material-preview", onPreview);
    return () => window.removeEventListener("luca:material-preview", onPreview);
  }, []);

  // Watch Settings changes outside of voice subsystem to guarantee UI renders
  useEffect(() => {
    const applyAppSettings = (settings: any) => {
      // Honor the user's motion preference alongside the OS-level media query:
      // the class silences DOM animations the same way prefers-reduced-motion does.
      document.documentElement.classList.toggle(
        "luca-reduce-motion",
        Boolean(settings?.general?.reduceMotion),
      );
      // Persona & Theme Selection — always apply latest from settings (React deduplicates no-ops)
      const newPersona = settings?.general?.persona;
      const newTheme = settings?.general?.theme;
      const newExperienceMode = settings?.general?.experienceMode;
      const nextSelectedSkinId = settings?.general?.selectedSkinId;
      const effectivePersona = normalizePersonaValue(newPersona);
      const hasStoredSettings = settingsService.hasStoredSettings?.() ?? true;
      // Preserve saved themes exactly, but let true first-run/no-storage boots
      // resolve through the system-aware Silver/Graphite appearance policy.
      const effectiveTheme = hasStoredSettings
        ? ((newTheme ?? "PROFESSIONAL") as UIThemeId)
        : undefined;

      setPersona(effectivePersona);
      if (newTheme) {
        setActiveThemeId(newTheme as UIThemeId);
      }
      if (newExperienceMode) {
        setExperienceMode(newExperienceMode as LucaExperienceMode);
      }
      setSelectedSkinId(nextSelectedSkinId);

      // Interaction Mode (Text vs Voice)
      const preferredMode = settings?.general?.preferredMode;
      if (preferredMode) {
        setIsVoiceMode(preferredMode === "voice");
        setShowVoiceHud(preferredMode === "voice");
      }

      // Transparency Control
      const opacity = settings?.general?.backgroundOpacity ?? 0.3;
      const blur = settings?.general?.backgroundBlur ?? 40; // Defaulting to high-frost tactical look

      setBackgroundOpacity(opacity);
      setBackgroundBlur(blur);

      // Unified Typography Engine
      const fontScale = settings?.general?.fontScale ?? 1.0;
      const fontFamily =
        settings?.general?.fontFamily ?? '"Inter", system-ui, sans-serif';

      // Dynamic Contrast Engine + premium semantic token variables. Existing
      // --app-* variables remain additive compatibility; --luca-* variables are
      // the new material-aware layer consumed by Boot and LiquidBackground.
      const cssVariableState = buildLucaAppearanceCssVariableState({
        theme: effectiveTheme,
        persona: effectivePersona,
        backgroundOpacity: opacity,
        backgroundBlur: blur,
        fontScale,
        fontFamily,
        hostPolicy: resolveLucaMaterialHostPolicy({
          isMobileViewport: isMobile,
          isNativeMobile: isCapacitor,
          isDesktopNative: isElectron,
        }),
      });
      const skinMaterialVariables = getLucaSkinMaterialVariables({
        skinId: nextSelectedSkinId,
        hostKind: isMobile ? "mobile-web" : "desktop-web",
        reducedMotion: false,
        reducedTransparency: false,
      });
      const skinDefinition = getLucaSkinDefinition(nextSelectedSkinId);
      const skinIsLight =
        skinDefinition.modeAffinity === "light" ||
        skinDefinition.modeAffinity === "warm";
      applyLucaAppearanceCssVariables(
        document.documentElement,
        {
          ...cssVariableState.variables,
          ...skinMaterialVariables,
          "--app-primary": skinMaterialVariables["--luca-accent-primary"],
          "--app-core-hex": skinMaterialVariables["--luca-accent-primary"],
          "--app-text-main": skinMaterialVariables["--luca-text-primary"],
          "--app-text-muted": skinMaterialVariables["--luca-text-secondary"],
          "--app-border-main": skinMaterialVariables["--luca-accent-soft"],
          "--app-bg-main": skinMaterialVariables["--luca-background-base"],
          "--app-bg-tint": skinMaterialVariables["--luca-surface-hover"],
          "--app-theme-type": skinIsLight ? "light" : "dark",
        },
      );

      // Class-based light/dark compatibility follows the selected skin, not
      // legacy persona config flags.
      if (skinIsLight) {
        document.documentElement.classList.add("light-mode");
      } else {
        document.documentElement.classList.remove("light-mode");
      }
    };

    // Apply initially
    applyAppSettings(settingsService.getSettings());

    const handleSettingsChange = (newSettings: any) => {
      applyAppSettings(newSettings);
    };
    settingsService.on("settings-changed", handleSettingsChange);

    // Connection Tier Polling
    const tierInterval = setInterval(() => {
      setConnectionTier(getConnectionTier());
    }, 5000);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
      clearInterval(tierInterval);
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

  // AGI Panel State — Agent Mode & Cognitive Engine
  const [showAgentMode, setShowAgentMode] = useState(false);
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);

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
  const visibleRightPanelModes = useMemo(
    () => getVisibleRightPanelModes(experienceMode),
    [experienceMode],
  );
  const displayedRightPanelMode = getDefaultRightPanelModeForExperience(
    experienceMode,
    rightPanelMode,
  );

  useEffect(() => {
    if (displayedRightPanelMode !== rightPanelMode) {
      setRightPanelMode(displayedRightPanelMode);
    }
  }, [displayedRightPanelMode, rightPanelMode, setRightPanelMode]);

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
    voiceAmplitude,
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
    activeMissionScope: MissionScope; // Scoped Mission Arming
  }>({
    lastScanTimestamp: 0,
    authorizedMissionIds: new Set(),
    activeMissionScope: MissionScope.NONE,
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
    localCoreReadinessLevel,
    localCoreReadinessReason,
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
    browserSafeInterface: isBrowserSafeWebInterface,
  });

  const effectiveConnectionTier = useMemo(() => {
    // If the local core is disconnected and we aren't explicitly in Cloud mode,
    // force the UI connection tier to OFFLINE to clearly indicate the outage.
    if (!isLocalCoreConnected && connectionTier !== "CLOUD") {
      return "OFFLINE";
    }
    return connectionTier;
  }, [isLocalCoreConnected, connectionTier]);

  useEffect(() => {
    voiceSessionOrchestrator.setLocalCoreConnected(isLocalCoreConnected);
  }, [isLocalCoreConnected]);

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
  const [showWeChatManager, setShowWeChatManager] = useState(false);

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
  const [showDarkWebScanner, setShowDarkWebScanner] = useState(false);

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
  const [activeMobileTab, setActiveMobileTab] =
    useState<MobileNavigationTab>("TERMINAL");

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

  useEffect(() => {
    // 3. EventBus Notification Listeners (Phase 1 Integration)
    const handleNotification = (event: any) => {
      const typeLabel = (event.type || event.priority || "INFO").toUpperCase();
      const content = `[${typeLabel}] ${event.message}`;

      setMessages((prev: any) => {
        // Prevent duplicate notifications
        if (
          prev.length > 0 &&
          prev[prev.length - 1].content.includes(event.message)
        ) {
          return prev;
        }

        return [
          ...prev,
          {
            id: "notif_" + Date.now() + Math.random(),
            role: "system", // Trigger System Message Bubble with rich icons
            content: content,
            timestamp: Date.now(),
          },
        ];
      });
    };

    const handleChatNotification = (data: any) => {
      setMessages((prev: any) => [
        ...prev,
        {
          id: "chat_notif_" + Date.now() + Math.random(),
          role: data.role || "assistant",
          content: data.content,
          timestamp: Date.now(),
        },
      ]);
    };

    // Generic Priority/Type Listeners
    eventBus.on("notification:info", handleNotification);
    eventBus.on("notification:warning", handleNotification);
    eventBus.on("notification:error", handleNotification);
    eventBus.on("notification:success", handleNotification);
    eventBus.on("notification:trading", handleNotification);

    // Priority specific
    eventBus.on("notification:LOW", handleNotification);
    eventBus.on("notification:MEDIUM", handleNotification);
    eventBus.on("notification:HIGH", handleNotification);
    eventBus.on("notification:CRITICAL", handleNotification);

    // Direct Chat Injection
    eventBus.on("chat:notification", handleChatNotification);

    return () => {
      eventBus.off("notification:info", handleNotification);
      eventBus.off("notification:warning", handleNotification);
      eventBus.off("notification:error", handleNotification);
      eventBus.off("notification:success", handleNotification);
      eventBus.off("notification:trading", handleNotification);
      eventBus.off("notification:LOW", handleNotification);
      eventBus.off("notification:MEDIUM", handleNotification);
      eventBus.off("notification:HIGH", handleNotification);
      eventBus.off("notification:CRITICAL", handleNotification);
      eventBus.off("chat:notification", handleChatNotification);
    };
  }, [setMessages]);

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
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    string | undefined
  >(undefined);

  // Open Settings Modal directly to a specific tab via custom event
  // (e.g. clicking the MCP indicator pill in ChatWidgetInput dispatches this)
  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab;
      setSettingsInitialTab(tab || undefined);
      setShowSettingsModal(true);
    };
    window.addEventListener("luca:open-settings", handleOpenSettings);
    // Pairing is unified on the Link a device modal; the settings tab (and
    // anything else) opens it through this event instead of owning its own QR.
    const handleOpenLucaLink = () => setShowLucaLinkModal(true);
    window.addEventListener("luca:open-lucalink", handleOpenLucaLink);
    return () => {
      window.removeEventListener("luca:open-settings", handleOpenSettings);
      window.removeEventListener("luca:open-lucalink", handleOpenLucaLink);
    };
  }, []);

  // Listen for governed panel-open events dispatched by GovernedToolExecutionService
  useEffect(() => {
    const handleOpenRightPanel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const panel = detail?.panel;
      if (typeof panel === "string" && isRightPanelMode(panel)) {
        setRightPanelMode(panel);
      }
    };
    window.addEventListener("luca:open-right-panel", handleOpenRightPanel);
    return () =>
      window.removeEventListener("luca:open-right-panel", handleOpenRightPanel);
  }, [setRightPanelMode]);
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
    if (lucaLinkManager.relay.getState().connected) {
      lucaLinkManager.relay.send("all", "UI_STATE_SYNC", data);
    }
  }, []);

  // --- HELPER: Dynamic Theme Colors ---
  const getThemeColors = useCallback(() => {
    const skinDefinition = getLucaSkinDefinition(selectedSkinId);
    const skinMaterialVariables = getLucaSkinMaterialVariables({
      skinId: selectedSkinId,
      hostKind: isMobile ? "mobile-web" : "desktop-web",
      reducedMotion: false,
      reducedTransparency: false,
    });
    const skinAccent = skinMaterialVariables["--luca-accent-primary"];
    const skinBackground = skinMaterialVariables["--luca-background-base"];
    const skinIsLight =
      skinDefinition.modeAffinity === "light" ||
      skinDefinition.modeAffinity === "warm";
    const skinTheme = {
      primary: skinAccent,
      border: skinMaterialVariables["--luca-accent-soft"],
      bg: skinBackground,
      glow: skinMaterialVariables["--luca-shadow-glow"],
      coreColor: skinAccent,
      hex: skinAccent,
      themeName: skinDefinition.id,
      isLight: skinIsLight,
    };

    if (isLockdown) {
      return {
        ...skinTheme,
        primary: "text-rq-red",
        border: "border-rq-red",
        bg: "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
        glow: "shadow-[0_0_30px_#ef4444]",
        coreColor: "text-[var(--luca-danger,#f87171)]",
        hex: "#ef4444",
      };
    }

    // Use PERSONA_UI_CONFIG for theme colors - decoupled from persona
    const themeConfig =
      PERSONA_UI_CONFIG[activeThemeId as any] || PERSONA_UI_CONFIG.ASSISTANT;

    // Handle system status overrides (CAUTION/CRITICAL)
    if (systemStatus === SystemStatus.CRITICAL) {
      return {
        ...skinTheme,
        primary: "text-rq-red",
        border: "border-rq-red",
        bg: "bg-rq-red-dim",
        glow: "shadow-[0_0_20px_#ef4444]",
        coreColor: "text-[var(--luca-danger,#f87171)]",
        hex: "#ef4444",
      };
    } else if (systemStatus === SystemStatus.CAUTION) {
      return {
        ...skinTheme,
        primary: "text-rq-amber",
        border: "border-rq-amber",
        bg: "bg-rq-amber-dim",
        glow: `shadow-[0_0_20px_${THEME_PALETTE.BUILDER.primary}]`,
        coreColor: "text-[var(--luca-warning,#f2b23e)]",
        hex: THEME_PALETTE.BUILDER.primary,
      };
    }

    return {
      ...themeConfig,
      ...skinTheme,
    };
  }, [isLockdown, activeThemeId, systemStatus, selectedSkinId, isMobile]);

  const theme = useMemo(() => getThemeColors(), [getThemeColors]);

  // --- WIDGET SYNC LOOP (REAL-TIME-ISH) ---
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      const syncData: WidgetLegacyPayload = {
        isVadActive:
          isVoiceHubListening ||
          voiceHubStatus === "THINKING" ||
          isVadActive ||
          localVadActive,
        isSpeaking: isSpeaking,
        amplitude: voiceAmplitude,
        transcript: voiceHubTranscript || voiceTranscript,
        transcriptSource: voiceTranscriptSource,
        intent: activeAutonomousAction?.intent,
        persona: persona,
        status: voiceHubStatus,
        themeHex: theme.hex,
        elevationState: elevationState,
        approvalRequest: (voiceSystem as any).approvalRequest,
      };
      const presenceSnapshot = createWidgetPresenceSnapshot(syncData);
      const widgetSyncData = toWidgetUpdate(presenceSnapshot, syncData);
      const hologramSyncData = toHologramUpdate(presenceSnapshot, syncData);
      const lucaLinkSyncData = {
        ...syncData,
        ...toLucaLinkUiStateSync(presenceSnapshot),
      };

      (window as any).electron.ipcRenderer.send(
        "sync-widget-state",
        widgetSyncData,
        hologramSyncData,
      );
      broadcastToSatellites(lucaLinkSyncData);

      if (Capacitor.getPlatform() === "ios") {
        watchGateway.updateWatchState(widgetSyncData);
      }
    }
  }, [
    isVadActive,
    localVadActive,
    isSpeaking,
    voiceAmplitude,
    voiceTranscript,
    persona,
    voiceHubStatus,
    voiceHubTranscript,
    elevationState,
    theme,
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

      // Ready signal: tell the main process the app can receive data.
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

  const toggleVoiceMode = (
    overrideMode?: string,
    forceHud = true,
    context: string = "voice-dashboard",
  ) => {
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
      connectVoiceSession(
        overrideMode === "DICTATION" ? "DICTATION" : persona,
        context,
      );
    } else {
      // Cloud Mode: Use Google Live (liveService)
      connectVoiceSession(
        overrideMode === "DICTATION" ? "DICTATION" : persona,
        context,
      );
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
              toggleVoiceModeRef.current(
                undefined,
                false,
                payload?.context || "voice-dashboard",
              ); // Pass context
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
    setShowWeChatManager,
    setShowRemoteModal,
    setActiveMobileDevice,
    setShowMobileManager,
    localVadActive: voiceHubStatus === "LISTENING",
    appMode,
    isCapacitor: Capacitor.isNativePlatform(),
    devices,
    Sender,
    // Sovereign Sync
    persona,
    activeThemeId,
    isSpeaking,
    isThinking: isProcessing,
    opacity: backgroundOpacity,
    blur: backgroundBlur,
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

    lucaLinkManager.relay.initGuestHandler(processGuestMessage, generateAudio);
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

  // --- WEB BACKGROUND SYNC ---
  useEffect(() => {
    const skinMaterialVariables = getLucaSkinMaterialVariables({
      skinId: selectedSkinId,
      hostKind: isMobile ? "mobile-web" : "desktop-web",
    });
    if (isWeb()) {
      const bgColor = skinMaterialVariables["--luca-background-base"];
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;
    } else {
      document.documentElement.style.backgroundColor = "transparent";
      document.body.style.backgroundColor = "transparent";
    }
  }, [selectedSkinId, isMobile]);

  // --- THEME SYNC (LUCA LINK) ---
  useEffect(() => {
    if (lucaLinkSocketRef.current?.connected) {
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

        setIsRebooting(true);
        setTimeout(() => {
          setPersona(normalizePersonaValue(nextPersona));
          setIsRebooting(false);
        }, 800);
      }
    };

    window.addEventListener("keydown", handleThemeToggle);
    return () => window.removeEventListener("keydown", handleThemeToggle);
  }, [persona]);

  if (appMode === "widget") {
    // Start Dictation (Orb Widget)
    return <WidgetMode />;
  }

  if (appMode === "chat") {
    // Mini Chat Widget Mode
    return <ChatWidgetMode />;
  }

  if (appMode === "hologram") {
    // Dedicated Hologram Face Mode
    return <HologramMode />;
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
      <div className="w-full h-screen border rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--luca-surface-solid, var(--luca-background-elevated))",
          borderColor: "var(--luca-border-strong, var(--app-border-main))",
          boxShadow: "var(--luca-shadow-soft)",
        }}>
        <LucaBrowser
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

  const dashboardSkinBoundary = useMemo(
    () =>
      resolveLucaDashboardSkinBoundary({
        selectedSkinId,
        // Main dashboard shell has no narrower host-policy object here. Use the
        // static desktop-web policy instead of assuming native glass or mobile
        // application semantics at this controlled boundary.
        hostKind: "desktop-web",
        reducedMotion: false,
        reducedTransparency: false,
        // User material (Settings -> Appearance) — live, so the sliders act
        // on the whole app, not just behind the Settings modal.
        userMaterialOpacity: backgroundOpacity,
        userMaterialBlurPx: backgroundBlur,
      }),
    [selectedSkinId, backgroundOpacity, backgroundBlur],
  );

  const mobileSkinBoundary = useMemo(
    () =>
      resolveLucaMobileSkinBoundary({
        selectedSkinId,
        hostKind: "mobile-web",
      }),
    [selectedSkinId],
  );

  // --- BOOT SEQUENCE RENDER ---
  if (
    shouldShowBootShell({
      bootSequence,
      showBootShell: showBrowserSafeBootShell,
      browserSafeBootResolved:
        isBrowserSafeWebInterface && browserSafeBootResolved,
    })
  ) {
    return (
      <div
        className="h-screen w-full bg-transparent cursor-default select-none draggable transition-all duration-300 relative overflow-hidden"
        style={{ color: "var(--app-text-main)" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* The window is never uncontrollable: the frameless shell keeps its
            own min/max/close through boot and onboarding, in the same zone
            they occupy once the header exists. */}
        <div className="luca-window-drag absolute right-1 top-1 z-[70] flex items-center gap-0.5">
          <WindowControls allowElectronRouteFallback />
        </div>
        {bootSequence === "ONBOARDING" ? (
          <div className="absolute inset-0 z-10">
            <LucaPremiumOnboardingPreview
              hostKind="desktop-app"
              supportsLocalProvisioning={isElectron}
              localEndpointStatus={localEndpointStatus}
              systemRamBytes={systemRamBytes}
              style={{ minHeight: "100dvh" }}
              onComplete={(flow) => {
                const { setupComplete, preferredMode, premiumPreferences } =
                  mapLucaOnboardingFlowToDesktopCompletion(flow);
                settingsService.saveSettings({
                  general: {
                    ...settingsService.get("general"),
                    setupComplete,
                    preferredMode,
                    premiumOnboardingPreferences: premiumPreferences,
                  },
                });
                const isVoice = preferredMode === "voice";
                setIsVoiceMode(isVoice);
                setShowVoiceHud(isVoice);
                setBootSequence("READY");
              }}
            />
          </div>
        ) : (
          // Redundant in-app boot screen (the "KERNEL ACCESS" face + readiness
          // cards) is eradicated: boot runs silently behind a calm dark holding
          // screen. On Electron the native splash covers boot and the window is
          // only revealed at READY/ONBOARDING, so this is never even seen.
          <div className="absolute inset-0" style={{ background: "#111417" }} />
        )}
      </div>
    );
  }

  // Removed Browser block from here (Moved Up)

  // console.log("[RENDER] Boot Ready. Rendering Main UI...");

  return (
    <SafeComponent
      componentName={
        isBrowserSafeWebInterface
          ? "Browser-safe LucaOS app shell"
          : "LucaOS app shell"
      }
      fallback={
        isBrowserSafeWebInterface ? (
          <div
            className="min-h-screen flex items-center justify-center p-6 font-sans"
            style={{
              background: "var(--luca-background-base, #101215)",
              color: "var(--luca-text-primary, #f4f6f8)",
            }}
          >
            <div
              className="max-w-lg rounded-2xl border p-6"
              style={{
                background: "var(--luca-surface-solid, var(--luca-background-elevated))",
                borderColor: "var(--luca-border-strong, var(--app-border-main))",
                boxShadow: "var(--luca-shadow-soft)",
              }}
            >
              <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--luca-text-secondary)" }}>
                Browser-safe shell failed to initialize
              </p>
              <h1 className="mt-3 text-2xl font-semibold" style={{ color: "var(--luca-text-primary)" }}>
                Desktop runtime unavailable in browser
              </h1>
              <p className="mt-3 text-sm" style={{ color: "var(--luca-text-secondary)" }}>
                LucaOS exited boot, but a browser-safe shell component failed.
                Native/local capabilities remain disabled instead of returning
                to the boot screen.
              </p>
            </div>
          </div>
        ) : undefined
      }
    >
      {bootDebugEnabled && isBrowserSafeWebInterface && (
        <div className="fixed left-3 top-3 z-[9999] rounded border px-3 py-2 text-[10px] font-mono pointer-events-none"
          style={{
            background: "var(--luca-surface-solid, var(--luca-background-elevated))",
            borderColor: "var(--luca-border-strong, var(--app-border-main))",
            color: "var(--luca-accent-primary, #4f8cff)",
            boxShadow: "var(--luca-shadow-soft)",
          }}>
          <div>[LucaOS web boot]</div>
          <div>resolverActive={String(browserSafeBootState.bootResolved)}</div>
          <div>bootSequence={bootSequence}</div>
          <div>showBootShell={String(showBrowserSafeBootShell)}</div>
          <div>resolved={String(browserSafeBootResolved)}</div>
          <div>fallbackTimeoutMs={browserSafeBootState.fallbackTimeoutMs}</div>
        </div>
      )}
      {platformBackgroundPolicy.shouldUseMobileStableBackground ? (
        <div
          className={`fixed inset-0 -z-50 ${lucaMobileClassNames.app}`}
          data-luca-background-policy={platformBackgroundPolicy.mode}
          style={platformBackgroundPolicy.backdropStyle}
        />
      ) : (
        <>
          {/*
            Desktop web cannot show real desktop wallpaper through a browser tab.
            Its LiquidBackground is an internal LucaOS page material over solid
            premium fallback tokens; native desktop remains transparent-ready
            when the host window is safely configured for OS glass later.
          */}
          {platformBackgroundPolicy.usesBrowserSafeLiquidFallback && (
            <div
              className="fixed inset-0 -z-50"
              data-luca-background-policy={platformBackgroundPolicy.mode}
              style={platformBackgroundPolicy.backdropStyle}
            />
          )}
          {platformBackgroundPolicy.shouldRenderLiquidBackground && (
            <LiquidBackground theme={theme} className="fixed inset-0 -z-50" />
          )}
          {/* Presence edge glow removed — the app reads cleaner without a
              glowing frame around the whole window. */}
        </>
      )}
      <SafeComponent componentName="OverlayManager">
        <OverlayManager
          theme={theme}
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
          showWeChatManager={showWeChatManager}
          setShowWeChatManager={setShowWeChatManager}
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
          showAgentMode={showAgentMode}
          setShowAgentMode={setShowAgentMode}
          showThoughtProcess={showThoughtProcess}
          setShowThoughtProcess={setShowThoughtProcess}
          toolLogs={toolLogs}
          showVoiceHud={showVoiceHud}
          toggleVoiceMode={toggleVoiceMode}
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
          elevationState={elevationState}
          showRemoteModal={showRemoteModal}
          setShowRemoteModal={setShowRemoteModal}
          remoteCode={remoteCode}
          handleRemoteSuccess={handleRemoteSuccess}
          showDesktopStream={showDesktopStream}
          setShowDesktopStream={setShowDesktopStream}
          desktopTarget={desktopTarget}
          isLocalCoreConnected={isLocalCoreConnected}
          localCoreReadinessLevel={localCoreReadinessLevel}
          localCoreReadinessReason={localCoreReadinessReason}
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
        className={`flex flex-col gap-0 p-0 font-mono overflow-hidden relative transition-all duration-300 ${
          showVoiceHud
            ? "opacity-0 pointer-events-none scale-95"
            : "opacity-100"
        }`}
        style={{
          ...LUCA_MOTION_CSS_VARIABLES,
          ...(isMobile
            ? mobileSkinBoundary.materialVariables
            : dashboardSkinBoundary.materialVariables),
          ...(window.electron
            ? {
                width: "117.65vw",
                height: "117.65vh",
                transform: "scale(0.85)",
                transformOrigin: "top left",
                borderColor:
                  "var(--luca-border-subtle, var(--app-border-main))",
                background:
                  platformBackgroundPolicy.rootApplicationStyle.background,
              }
            : {
                width: "100vw",
                height: "100vh",
                borderColor:
                  "var(--luca-border-subtle, var(--app-border-main))",
                background:
                  platformBackgroundPolicy.rootApplicationStyle.background,
              }),
        }}
      >
        {/* Header dissolved into the shell (Phase 3): the status/controls
            cluster renders at the top of the CENTER column and the brand at the
            top of the LEFT rail, so all three panels rise to the very top
            as one desktop workspace instead of sitting under a full-width band. */}

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative z-10 flex flex-col h-full gap-0 p-0">
          {/* ── The HEADER: full-width, owned by the middle — header + canvas
              are ONE environment spanning the window. It carries only
              environment things: the panel toggles at its edges, status, and
              the window-controls zone (html.luca-wco). The side panels are
              sheets docked BELOW it and never touch it. ── */}
          {!isMobile && (
            <div
              className="luca-window-drag flex flex-none h-14 items-stretch"
              style={{
                background: "var(--luca-background-elevated, var(--app-bg-main, #1b2025))",
                color: "var(--luca-text-primary, var(--app-text-main))",
              }}
            >
              <div className="flex-1 min-w-0 flex items-stretch">
                {/* macOS: the native traffic lights overlay the band's
                    top-left (centered via trafficLightPosition) — the band
                    insets so the menu never sits under them. */}
                <div
                  className="flex items-center gap-1 pl-3"
                  style={hasMacTrafficLights() ? { paddingLeft: 76 } : undefined}
                >
                  {/* Identity anchors the band's left edge (unplugged from
                      the sidebar sheet) — the menu and toggle sit beside it,
                      and the brand stays present even with panels collapsed. */}
                  <span className="mr-2 flex items-center gap-2.5">
                    <SafeComponent componentName="PresenceMark">
                      <ShellPresenceMark size={24} />
                    </SafeComponent>
                    <span className="min-w-0 flex flex-col justify-center leading-none">
                      <span
                        className="text-[14px]"
                        style={{
                          color: "var(--luca-text-primary, var(--app-text-main))",
                          ...lucaBrandDisplayStyle,
                        }}
                      >
                        LucaOS
                      </span>
                      <span
                        className="mt-1 truncate text-[10px]"
                        style={{
                          color:
                            "var(--luca-text-tertiary, var(--app-text-muted))",
                        }}
                      >
                        {desktopPlatformLabel} · present
                      </span>
                    </span>
                  </span>
                  <AppMenu
                    onNewSession={handleClearChat}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    onToggleLeftPanel={() =>
                      setLeftPanelCollapsed(!leftPanelCollapsed)
                    }
                    onToggleRightPanel={() =>
                      setRightPanelCollapsed(!rightPanelCollapsed)
                    }
                  />
                  <button
                    type="button"
                    aria-label={leftToggleIcon(leftPanelCollapsed).label}
                    title={leftToggleIcon(leftPanelCollapsed).label}
                    onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    className={`p-1.5 rounded-lg border transition-colors ${lucaShellClassNames.control}`}
                    style={lucaShellHeaderGhostControlStyle}
                  >
                    <Icon name={leftToggleIcon(leftPanelCollapsed).name} size={16} />
                  </button>
                </div>
                <div className="luca-band-embed flex-1 min-w-0 flex flex-col">
                <SafeComponent componentName="Header">
                  <Header
                    hideBrand
                    theme={theme}
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
                    setShowVoiceHud={setShowVoiceHud}
                    setAmbientSuggestions={setAmbientSuggestions}
                    setShowSuggestionChips={setShowSuggestionChips}
                    hostPlatform={hostPlatform}
                    isListeningAmbient={isListeningAmbient}
                    isProcessing={isProcessing}
                    audioMonitoringActive={audioMonitoringActive}
                    setAudioMonitoringActive={setAudioMonitoringActive}
                    setVisionMonitoringActive={setVisionMonitoringActive}
                    isWakeWordActive={isWakeWordActive}
                    isLockdown={isLockdown}
                    connectionTier={effectiveConnectionTier}
                    tier={toHeaderTier(experienceMode)}
                  />
                </SafeComponent>
                </div>
                <div className="flex items-center gap-1 pr-2">
                  <button
                    type="button"
                    aria-label={rightToggleIcon(rightPanelCollapsed).label}
                    title={rightToggleIcon(rightPanelCollapsed).label}
                    onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                    className={`p-1.5 rounded-lg border transition-colors ${lucaShellClassNames.control}`}
                    style={lucaShellHeaderGhostControlStyle}
                  >
                    <Icon name={rightToggleIcon(rightPanelCollapsed).name} size={16} />
                  </button>
                  {/* Window controls: the shell's OWN buttons (no native
                      overlay) — same ghost skin and size as every other
                      header control. WindowControls self-gates per platform. */}
                  <span className="ml-2 flex items-center gap-1">
                    <WindowControls />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* The environment: the canvas surface spans the whole row; the
              side panels are chrome surfaces sitting ON TOP of it. */}
          <div
            className={`flex-1 min-h-0 flex ${lucaShellClassNames.workspace}`}
            style={lucaShellWorkspaceSurfaceStyle}
          >
          {!isMobile && !leftPanelCollapsed && (
            <>
              <div
                className={`flex-none h-full overflow-hidden flex flex-col relative border-r ${lucaShellClassNames.panel}`}
                style={{
                  ...lucaShellPanelSurfaceStyle,
                  boxShadow: "6px 0 18px -10px rgba(0,0,0,0.5)",
                  width: `${panelWidths.sidebar}px`,
                }}
              >
                <SafeComponent componentName="SessionsRail">
                  <SessionsRail />
                </SafeComponent>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <SafeComponent componentName="OperationsSidebar">
                  <OperationsSidebar
                    experienceMode={experienceMode}
                    theme={theme}
                    isMobile={false}
                    activeMobileTab=""
                    isListeningAmbient={isListeningAmbient}
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
                    setShowDarkWebScanner={setShowDarkWebScanner}
                    setShowIngestionModal={setShowIngestionModal}
                    setShowCodeEditor={setShowCodeEditor}
                    setShowPredictionTerminal={setShowPredictionTerminal}
                    setShowLucaLinkModal={setShowLucaLinkModal}
                    setShowCryptoTerminal={setShowCryptoTerminal}
                    setShowForexTerminal={setShowForexTerminal}
                    setShowOsintDossier={setShowOsintDossier}
                    setShowHackingTerminal={setShowHackingTerminal}
                    connectionTier={effectiveConnectionTier}
                    onLockdown={() => setIsLockdown(true)}
                    onPlaySound={(sound) => soundService.play(sound)}
                    setShowAgentMode={setShowAgentMode}
                    setShowThoughtProcess={setShowThoughtProcess}
                  />
                </SafeComponent>
                </div>
              </div>
              <PanelResizer
                themeColor={theme.hex}
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
            <div
              className={`flex w-full h-full ${lucaMobileClassNames.content}`}
              style={lucaMobileContentSurfaceStyle}
            >
              <OperationsSidebar
                experienceMode={experienceMode}
                theme={theme}
                isMobile={true}
                activeMobileTab="SYSTEM"
                isListeningAmbient={isListeningAmbient}
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
                setShowDarkWebScanner={setShowDarkWebScanner}
                setShowIngestionModal={setShowIngestionModal}
                setShowCodeEditor={setShowCodeEditor}
                setShowPredictionTerminal={setShowPredictionTerminal}
                setShowLucaLinkModal={setShowLucaLinkModal}
                setShowCryptoTerminal={setShowCryptoTerminal}
                setShowForexTerminal={setShowForexTerminal}
                setShowOsintDossier={setShowOsintDossier}
                setShowHackingTerminal={setShowHackingTerminal}
                connectionTier={effectiveConnectionTier}
                onLockdown={() => setIsLockdown(true)}
                onPlaySound={(sound) => soundService.play(sound)}
                setShowAgentMode={setShowAgentMode}
                setShowThoughtProcess={setShowThoughtProcess}
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
                    theme={theme}
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
                        setInput("");
                        setAttachedImage(null);
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
                    setMessages={setMessages}
                  />
                </SafeComponent>
              </div>
            </>
          )}

          {isMobile && activeMobileTab === "TERMINAL" && (
            <div
              className={`flex w-full h-full ${lucaMobileClassNames.content}`}
              style={lucaMobileContentSurfaceStyle}
            >
              <ChatPanel
                messages={messages}
                isMobile={true}
                activeMobileTab="TERMINAL"
                theme={theme}
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
                    setInput("");
                    setAttachedImage(null);
                  }
                }}
                isVoiceMode={isVoiceMode}
                toggleVoiceMode={toggleVoiceMode}
                showCamera={showCamera}
                setShowCamera={setShowCamera}
                handleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
                handleClearChat={handleClearChat}
                handleStop={handleStop}
                setMessages={setMessages}
              />
            </div>
          )}

          {/* Right Panel or Data Panel */}
          {!isMobile && !rightPanelCollapsed && (
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
                className={`flex-none h-full border-l relative overflow-hidden flex flex-col ${lucaShellClassNames.panel}`}
                style={{
                  ...lucaShellPanelSurfaceStyle,
                  boxShadow: "-6px 0 18px -10px rgba(0,0,0,0.5)",
                  width: `${panelWidths.right}px`,
                }}
              >
                <div className="flex flex-col h-full w-full overflow-hidden">
                  <div
                    className="flex flex-none h-11 items-stretch border-b"
                    style={lucaShellDividerStyle}
                  >
                    {visibleRightPanelModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setRightPanelMode(mode);
                          soundService.play("KEYSTROKE");
                        }}
                        className={`flex-1 flex items-center justify-center text-[13px] font-medium transition-colors relative border-b-2 ${
                          displayedRightPanelMode === mode
                            ? lucaShellClassNames.activeTab
                            : lucaShellClassNames.tab
                        }`}
                        style={
                          displayedRightPanelMode === mode
                            ? lucaShellActiveTabStyle
                            : lucaShellTabStyle
                        }
                      >
                        {getRightPanelLabelForMode(experienceMode, mode)}
                        {mode === "CONTROL" &&
                          displayedRightPanelMode === "CONTROL" && (
                            <span
                              className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${lucaShellClassNames.activeIndicator}`}
                              style={lucaShellActiveIndicatorStyle}
                              aria-hidden="true"
                            />
                          )}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto pl-1 pr-4 py-4 font-mono text-xs relative">
                    {displayedRightPanelMode === "CONTROL" && (
                      <ControlPanel
                        theme={theme}
                        tasks={management.tasks}
                        events={management.events}
                        goals={management.goals}
                        experienceMode={experienceMode}
                        devices={[...lucaLinkBodyDevices, ...devices]}
                        workspaceLabel={currentCwd}
                      />
                    )}
                    {displayedRightPanelMode === "ACTIVITY" && (
                      <ActivityPanel theme={theme} experienceMode={experienceMode} />
                    )}
                    {displayedRightPanelMode === "MEMORY" && (
                      <MemoryControlPanel
                        theme={theme}
                        memories={memories}
                        setMemories={setMemories}
                        experienceMode={experienceMode}
                      />
                    )}
                    {displayedRightPanelMode === "LOGS" && (
                      <TraceLogsPanel theme={theme} toolLogs={toolLogs} />
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Mobile DATA keeps minimal access to the same safe, state-only panels without redesigning the mobile shell. */}
          {isMobile && activeMobileTab === "DATA" && (
            <section
              className={`flex-1 flex-col h-full border-l relative overflow-hidden flex ${lucaMobileClassNames.panel}`}
              style={lucaMobilePanelSurfaceStyle}
            >
              <div className="flex flex-col h-full w-full overflow-hidden">
                <div
                  className="flex flex-none border-b"
                  style={lucaMobileDividerStyle}
                >
                  {visibleRightPanelModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setRightPanelMode(mode);
                        soundService.play("KEYSTROKE");
                      }}
                      className={`flex-1 py-3 text-[11px] font-medium transition-colors relative border-b-2 ${
                        displayedRightPanelMode === mode
                          ? lucaMobileClassNames.tabActive
                          : lucaMobileClassNames.tab
                      }`}
                      style={
                        displayedRightPanelMode === mode
                          ? lucaMobileActiveTabStyle
                          : lucaMobileInactiveTabStyle
                      }
                    >
                      {getRightPanelLabelForMode(experienceMode, mode)}
                      {displayedRightPanelMode === mode && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-1/2 top-1 -translate-x-1/2 h-1 w-5 rounded-full border ${lucaMobileClassNames.indicator}`}
                          style={lucaMobileActiveIndicatorStyle}
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto pl-1 pr-4 py-4 font-mono text-xs relative">
                  {displayedRightPanelMode === "CONTROL" && (
                    <ControlPanel
                      theme={theme}
                      tasks={management.tasks}
                      events={management.events}
                      goals={management.goals}
                      experienceMode={experienceMode}
                    />
                  )}
                  {displayedRightPanelMode === "ACTIVITY" && (
                    <ActivityPanel theme={theme} experienceMode={experienceMode} />
                  )}
                  {displayedRightPanelMode === "MEMORY" && (
                    <MemoryControlPanel
                      theme={theme}
                      memories={memories}
                      setMemories={setMemories}
                      experienceMode={experienceMode}
                    />
                  )}
                  {displayedRightPanelMode === "LOGS" && (
                    <TraceLogsPanel theme={theme} toolLogs={toolLogs} />
                  )}
                </div>
              </div>
            </section>
          )}
          </div>
        </main>

        {/* Mobile Navigation Bar */}
        {isMobile && (
          <nav
            className={`flex-none h-16 border-t grid grid-cols-3 items-center z-50 ${lucaMobileClassNames.nav}`}
            style={lucaMobileNavSurfaceStyle}
          >
            {[
              { tab: "SYSTEM" as const, icon: "Cpu" as const },
              { tab: "TERMINAL" as const, icon: "Terminal" as const },
              { tab: "DATA" as const, icon: "Database" as const },
            ].map(({ tab, icon }) => {
              const active = activeMobileTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveMobileTab(tab)}
                  className={`mx-2 flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
                    active
                      ? lucaMobileClassNames.navItemActive
                      : lucaMobileClassNames.navItem
                  }`}
                  style={
                    active
                      ? lucaMobileNavActiveStyle
                      : lucaMobileNavInactiveStyle
                  }
                >
                  <Icon name={icon} size={20} />
                  <span className="text-[10px] font-bold tracking-widest">
                    {mobileNavigationLabel(tab)}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
        {showSettingsModal && (
          <SettingsModal
            theme={theme}
            initialTab={settingsInitialTab}
            onClose={() => {
              setShowSettingsModal(false);
              setSettingsInitialTab(undefined); // reset so normal re-open starts on default tab
            }}
          />
        )}
        {showInvestigationReports && (
          <InvestigationReports
            onClose={() => setShowInvestigationReports(false)}
            theme={theme}
          />
        )}
        {showDarkWebScanner && (
          <DarkWebScanner
            onClose={() => setShowDarkWebScanner(false)}
            theme={theme}
          />
        )}
        {/* PR #134: gated browser shell. Self-managed; only surfaces after an
            approved open_approved_safe_url governed execution (approval + Run once). */}
        <SandboxedBrowserShell />
      </div>
    </SafeComponent>
  );
}
