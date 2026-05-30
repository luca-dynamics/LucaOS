import React, { useState, useEffect, useRef } from "react";
import LucaBrowser from "./LucaBrowser";
import {
  createDisplaySession,
  markDisplaySessionOpen,
  closeDisplaySession,
} from "../services/runtime/VisualCoreDisplaySessionService";
import { shouldRecordVisualCoreDisplaySession } from "../services/runtime/VisualCoreDisplayGovernance";
import {
  sandboxedBrowserShellService,
} from "../services/runtime/SandboxedBrowserShellService";
import { toVisualCoreAuditSafeUrl } from "../services/runtime/VisualCoreRemoteCommandPolicy";
import { recordRemoteCommand } from "../services/runtime/VisualCoreRemoteCommandService";
import {
  visualCoreModeTransitionService,
  isTransitionAllowed,
} from "../services/runtime/VisualCoreModeTransitionService";
import type { VisualCoreModeTransitionSource } from "../types/visualCoreModeTransitions";
import type { VisualCoreRemoteCommandKind, VisualCoreRemoteCommandSource } from "../types/visualCoreRemoteCommands";
import VisualDataPresenter from "./VisualDataPresenter";
import CinemaPlayer from "./CinemaPlayer";
import CastPicker from "./CastPicker";
import { Icon } from "./ui/Icon";
import { PERSONA_UI_CONFIG } from "../config/themeColors";
import { SmartDevice } from "../types";
import SovereigntyDashboard from "./visual/SovereigntyDashboard";
import OsintDossier from "./OsintDossier";
import StockTerminal from "./StockTerminal";
import { AutonomyDashboard } from "./AutonomyDashboard";
import SubsystemDashboard from "./SubsystemDashboard";
import CodeEditor from "./CodeEditor";
import SkillsMatrix from "./SkillsMatrix";
import CryptoTerminal from "./CryptoTerminal";
import ForexTerminal from "./ForexTerminal";
import PredictionTerminal from "./PredictionTerminal";
import NetworkMap from "./NetworkMap";
import HackingTerminal from "./HackingTerminal";
import InvestigationReports from "./InvestigationReports";
import GeoTacticalView from "./GeoTacticalView";
import LiveContentDisplay from "./LiveContentDisplay";
import MobileFileBrowser from "./MobileFileBrowser";
import VisionHUD from "./VisionHUD";
import { LucaRecorder } from "./LucaRecorder";
import TelegramManager from "./TelegramManager";
import WhatsAppManager from "./WhatsAppManager";
import WirelessManager from "./WirelessManager";
import IngestionModal from "./IngestionModal";
import SignalVisualizer from "./visual/SignalVisualizer";
import TacticalStream from "./visual/TacticalStream";
import { LiquidBackground } from "./visual/LiquidBackground";
import { SubsystemPulse } from "./visual/SubsystemPulse";

export type VisualCoreMode =
  | "IDLE"
  | "BROWSER"
  | "DATA"
  | "CINEMA"
  | "DATA_ROOM"
  | "SECURITY"
  | "SOVEREIGNTY"
  | "OSINT"
  | "STOCKS"
  | "AUTONOMY"
  | "SUBSYSTEMS"
  | "CODE_EDITOR"
  | "SKILLS"
  | "CRYPTO"
  | "FOREX"
  | "PREDICTIONS"
  | "NETWORK"
  | "HACKING"
  | "REPORTS"
  | "GEO"
  | "LIVE"
  | "FILES"
  | "VISION"
  | "RECORDER"
  | "TELEGRAM"
  | "WHATSAPP"
  | "WIRELESS"
  | "INGESTION"
  | "TACTICAL";

// PR #143 — VisualCore BROWSER mode now uses the governed LucaBrowser adapter.
// Remote BROWSER_NAVIGATE commands create/bind to a governed shell session and
// switch VisualCore into BROWSER mode via the governed path. No automation,
// no DOM read, no click/type/scroll, no screenshot/OCR/vision.
const VISUAL_CORE_REMOTE_BROWSER_NAVIGATION_ENABLED = true;

interface VisualCoreProps {
  isVisible: boolean;
  onClose: () => void;
  // Browser Props
  browserUrl: string;
  // Data Props
  visualData: any;
  onClearData: () => void;
  // Session
  // Casting Props
  devices?: SmartDevice[];
  onCast?: (deviceId: string) => void;
  sessionId: string;
  themeColor?: string;
  videoStream?: MediaStream | null;
  persona?: "RUTHLESS" | "ENGINEER" | "HACKER" | "ASSISTANT" | "LUCAGENT";
  // Cinema Casting
  cinemaUrl?: string;
  cinemaSourceType?:
    | "youtube"
    | "local"
    | "stream"
    | "file"
    | "webview"
    | "mirror";
  cinemaTitle?: string;
  theme?: { hex: string; primary: string; border: string; bg: string };
}

const VisualCore: React.FC<VisualCoreProps> = ({
  isVisible,
  onClose,
  browserUrl,
  visualData,
  onClearData,

  devices = [],
  onCast,
  themeColor: propThemeColor,
  videoStream,
  persona = "RUTHLESS",
  cinemaUrl,
  cinemaSourceType = "stream",
  cinemaTitle = "Now Streaming",
  theme,
  sessionId = "LUCA-CORE",
}) => {
  const [mode, setMode] = useState<VisualCoreMode>("IDLE");
  const [showCastPicker, setShowCastPicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [remoteCommand, setRemoteCommand] = useState<any>(null);
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState(browserUrl || "");

  // PR #141 — record-only governed display session tracking (no behavior change).
  const displaySessionIdRef = useRef<string | null>(null);
  const displaySessionModeRef = useRef<VisualCoreMode | null>(null);

  // PR #143 — governed LucaBrowser adapter session for BROWSER mode.
  const browserShellSessionIdRef = useRef<string | null>(null);

  // PR #145 — governed mode transition guard. Every setMode() call passes
  // through this helper so transitions are policy-evaluated and audited.
  const requestModeTransition = React.useCallback(
    (toMode: VisualCoreMode, source: VisualCoreModeTransitionSource) => {
      const record = visualCoreModeTransitionService.recordTransition({
        fromMode: mode,
        toMode,
        source,
        hasBrowserSession: !!browserShellSessionIdRef.current,
      });
      if (isTransitionAllowed(record.status)) {
        setMode(toMode);
      }
    },
    [mode],
  );

  // PR #142 — throttle high-frequency telemetry recording (sync/voice) so the
  // bounded remote-command audit buffer is not flooded. Discrete remote
  // commands are recorded unthrottled.
  const telemetryThrottleRef = useRef<Record<string, number>>({});

  // Sovereign Sync States
  const [syncState, setSyncState] = useState({
    persona: persona || "ASSISTANT",
    themeId: "PROFESSIONAL",
    isSpeaking: false,
    isThinking: false,
    amplitude: 0,
    opacity: 0.85,
    blur: 20,
  });

  // Derive theme color from persona if not explicitly provided
  const getContextTheme = (type?: string) => {
    switch (type) {
      case "FINANCE":
      case "CRYPTO":
      case "STOCKS":
      case "FOREX":
        return "#eab308"; // Gold/Yellow (Finance)
      case "INTELLIGENCE":
      case "OSINT":
      case "REPORTS":
        return "#06b6d4"; // Cyan (Intelligence)
      case "SECURITY":
      case "HACKING":
      case "TACTICAL":
        return "#ef4444"; // Red (Security)
      case "SYSTEM":
      case "Subsystems":
        return "#3b82f6"; // Blue (System)
      default:
        return null;
    }
  };

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // [SOVEREIGN SYNC] Listen for Main App State
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;

    // PR #142 — throttle helper (inlined here to keep the effect dependency-free).
    const recordTelemetry = (
      kind: VisualCoreRemoteCommandKind,
      source: VisualCoreRemoteCommandSource,
      intervalMs: number,
    ) => {
      const now = Date.now();
      const last = telemetryThrottleRef.current[kind] ?? 0;
      if (now - last < intervalMs) return;
      telemetryThrottleRef.current[kind] = now;
      recordRemoteCommand({ kind, source });
    };

    const handleSync = (state: any) => {
      console.log("[VisualCore] Received Sovereign State Sync:", state);
      // PR #142 — record-only telemetry audit; no execution change.
      recordTelemetry("SYNC_APP_STATE", "app_state_sync", 5000);
      setSyncState((prev) => ({ ...prev, ...state }));
    };

    const handleVoice = (data: { amplitude: number }) => {
      // PR #142 — record-only telemetry audit; throttled to avoid flooding.
      recordTelemetry("WIDGET_VOICE_DATA", "voice_widget", 5000);
      setSyncState((prev) => ({ ...prev, amplitude: data.amplitude }));
    };

    const removeSync = window.electron.ipcRenderer.on("sync-app-state", handleSync);
    const removeVoice = window.electron.ipcRenderer.on("widget-voice-data", handleVoice);

    const handleRemoteControl = (command: any) => {
      console.log("[VisualCore] Received Remote Command:", command);

      // PR #142 — govern/audit every remote command BEFORE any existing
      // behavior. Records only; never executes or drives VisualCore.
      recordRemoteCommand({
        type: command?.type,
        value: command?.value,
        source: "ipc_remote_control",
        metadata: {
          legacyBehaviorStillActive: VISUAL_CORE_REMOTE_BROWSER_NAVIGATION_ENABLED,
        },
      });

      if (command.type === "BROWSER_NAVIGATE") {
        // PR #143 — governed LucaBrowser adapter path. Opens a governed
        // shell session for the URL and switches VisualCore to BROWSER mode.
        // No automation, no DOM read, no click/type/scroll.
        if (VISUAL_CORE_REMOTE_BROWSER_NAVIGATION_ENABLED && typeof command.value === "string" && command.value.trim()) {
          const result = sandboxedBrowserShellService.openApprovedSafeUrl({
            url: command.value,
            title: "VisualCore governed browser session",
            source: "visual_core_remote_browser_navigate",
          });
          if (result.status === "open" || result.status === "open_requested") {
            browserShellSessionIdRef.current = result.shellSessionId;
            requestModeTransition("BROWSER", "remote_command");
            setCurrentBrowserUrl(command.value);
          }
        }
      }

      setRemoteCommand(command);
      // Auto-clear after a delay if it's a one-shot command
      if (command.type !== "PERSISTENT") {
        setTimeout(() => setRemoteCommand(null), 500);
      }
    };
    const removeRemote = window.electron.ipcRenderer.on("visual-core-remote-control", handleRemoteControl);

    return () => {
      if (removeSync) removeSync();
      if (removeVoice) removeVoice();
      if (removeRemote) removeRemote();
    };
  }, []);

  const themeColor =
    theme?.hex || 
    getContextTheme(visualData?.type) || 
    propThemeColor || 
    PERSONA_UI_CONFIG[syncState.persona]?.hex || 
    PERSONA_UI_CONFIG.DEFAULT.hex;
  const isLight =
    themeColor === "#ffffff" ||
    themeColor === "#e2e8f0" ||
    persona === "ASSISTANT" ||
    persona === "LUCAGENT";

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- AUTO-DISMISS LOGIC (Industrial Grade Lifecycle) ---
  useEffect(() => {
    if (!isVisible) return;

    let dismissTimer: NodeJS.Timeout;

    // 1. Explicit Duration (TTL) if provided by the tool/agent
    if (visualData?.duration && visualData.duration > 0) {
      console.log(`[VisualCore] Setting auto-dismiss timer: ${visualData.duration}ms`);
      dismissTimer = setTimeout(() => {
        console.log("[VisualCore] TTL Expired. Auto-dismissing...");
        onClose();
      }, visualData.duration);
    }
    // 2. Idle timeout: If in IDLE mode for too long, auto-hide
    else if (mode === "IDLE") {
      console.log("[VisualCore] In IDLE mode. Setting 60s auto-hide timer.");
      dismissTimer = setTimeout(() => {
        console.log("[VisualCore] Idle timeout. Auto-hiding...");
        onClose();
      }, 60000); // 60 seconds idle
    }

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [mode, visualData, isVisible, onClose]);

  // Auto-switch modes based on props updates
  useEffect(() => {
    console.log(
      "[VisualCore] Mode switch check - browserUrl:",
      browserUrl,
      "visualData:",
      !!visualData,
      "isVisible:",
      isVisible,
    );

    // BROWSER mode takes priority when a valid URL is provided.
    // PR #143 — create a governed shell session for the prop-driven URL.
    if (browserUrl && browserUrl !== "about:blank" && browserUrl !== "") {
      console.log(
        "[VisualCore] Switching to governed BROWSER mode with URL:",
        browserUrl,
      );
      if (!browserShellSessionIdRef.current) {
        const result = sandboxedBrowserShellService.openApprovedSafeUrl({
          url: browserUrl,
          title: "VisualCore governed browser session",
          source: "visual_core_prop_update",
        });
        if (result.status === "open" || result.status === "open_requested") {
          browserShellSessionIdRef.current = result.shellSessionId;
        }
      }
      requestModeTransition("BROWSER", "prop_update");
      return;
    }

    if (visualData) {
      if (visualData.topic === "DATA_ROOM" || visualData.type === "DATA_ROOM") {
        requestModeTransition("DATA", "prop_update");
      } else if (visualData.type === "CINEMA") {
        requestModeTransition("CINEMA", "prop_update");
      } else if (
        visualData.topic === "SECURITY" ||
        visualData.type === "SECURITY"
      ) {
        requestModeTransition("SECURITY", "prop_update");
      } else if (
        visualData.topic === "GLOBAL_SOVEREIGNTY" ||
        visualData.type === "SOVEREIGNTY"
      ) {
        requestModeTransition("SOVEREIGNTY", "prop_update");
      } else if (
        visualData.type === "OSINT" ||
        visualData.type === "INTELLIGENCE" // Map generalized type to OSINT mode
      ) {
        requestModeTransition("OSINT", "prop_update");
      } else if (
        visualData.type === "STOCKS" ||
        visualData.type === "FINANCE" // Map generalized type to STOCKS mode
      ) {
        requestModeTransition("STOCKS", "prop_update");
      } else if (visualData.type === "AUTONOMY") {
        requestModeTransition("AUTONOMY", "prop_update");
      } else if (visualData.type === "SUBSYSTEMS") {
        requestModeTransition("SUBSYSTEMS", "prop_update");
      } else if (visualData.type === "CODE_EDITOR") {
        requestModeTransition("CODE_EDITOR", "prop_update");
      } else if (visualData.type === "SKILLS") {
        requestModeTransition("SKILLS", "prop_update");
      } else if (visualData.type === "CRYPTO") {
        requestModeTransition("CRYPTO", "prop_update");
      } else if (visualData.type === "FOREX") {
        requestModeTransition("FOREX", "prop_update");
      } else if (visualData.type === "PREDICTIONS") {
        requestModeTransition("PREDICTIONS", "prop_update");
      } else if (visualData.type === "NETWORK") {
        requestModeTransition("NETWORK", "prop_update");
      } else if (visualData.type === "HACKING") {
        requestModeTransition("HACKING", "prop_update");
      } else if (visualData.type === "REPORTS") {
        requestModeTransition("REPORTS", "prop_update");
      } else if (visualData.type === "GEO") {
        requestModeTransition("GEO", "prop_update");
      } else if (visualData.type === "LIVE") {
        requestModeTransition("LIVE", "prop_update");
      } else if (visualData.type === "FILES") {
        requestModeTransition("FILES", "prop_update");
      } else if (visualData.type === "VISION") {
        requestModeTransition("VISION", "prop_update");
      } else if (visualData.type === "RECORDER") {
        requestModeTransition("RECORDER", "prop_update");
      } else if (visualData.type === "TELEGRAM") {
        requestModeTransition("TELEGRAM", "prop_update");
      } else if (visualData.type === "WHATSAPP") {
        requestModeTransition("WHATSAPP", "prop_update");
      } else if (visualData.type === "WIRELESS") {
        requestModeTransition("WIRELESS", "prop_update");
      } else if (visualData.type === "INGESTION") {
        requestModeTransition("INGESTION", "prop_update");
      } else if (
        visualData.type === "TACTICAL" ||
        visualData.type === "SYSTEM" // Map generalized type to TACTICAL mode (Blue Theme)
      ) {
        requestModeTransition("TACTICAL", "prop_update");
      } else if (visualData.type === "SHOW_DISPLAY") {
        requestModeTransition("DATA", "prop_update");
      } else {
        requestModeTransition("DATA", "prop_update");
      }
      return;
    }

    // Auto-switch to CINEMA when a cinema URL or videoStream is provided
    if (cinemaUrl || videoStream) {
      requestModeTransition("CINEMA", "prop_update");
      return;
    }

    if (isVisible && !browserUrl && !visualData && !cinemaUrl && !videoStream) {
      requestModeTransition("IDLE", "system");
    }
  }, [visualData, browserUrl, isVisible, cinemaUrl, videoStream, requestModeTransition]);

  // [DISPLAY GOVERNANCE] PR #141 — record-only governed display sessions for
  // low-risk display modes (IDLE/DATA/DATA_ROOM/REPORTS/SUBSYSTEMS/SOVEREIGNTY).
  // This only writes audit/lifecycle records; it NEVER changes mode switching,
  // rendering, IPC, or browser behavior, and NEVER governs sensitive modes.
  useEffect(() => {
    const closeCurrent = () => {
      if (displaySessionIdRef.current) {
        closeDisplaySession(displaySessionIdRef.current);
        displaySessionIdRef.current = null;
        displaySessionModeRef.current = null;
      }
    };

    if (!isVisible) {
      closeCurrent();
      return;
    }

    // Sensitive / non-ready modes are never governed here — just close any
    // prior low-risk display session record.
    if (!shouldRecordVisualCoreDisplaySession(mode)) {
      closeCurrent();
      return;
    }

    // Already recording this mode — nothing to do.
    if (displaySessionModeRef.current === mode && displaySessionIdRef.current) {
      return;
    }

    closeCurrent();
    const record = createDisplaySession({ mode, source: "prop_update" });
    markDisplaySessionOpen(record.visualSessionId);
    displaySessionIdRef.current = record.visualSessionId;
    displaySessionModeRef.current = mode;
  }, [mode, isVisible]);

  // [INTERACTION] Feedback to Brain
  const handleInteraction = (type: string, details: any) => {
    // PR #142 — record-only interaction-feedback audit; throttled, no execution
    // change. Existing IPC send behavior is unchanged.
    const now = Date.now();
    const last = telemetryThrottleRef.current.VISUAL_CORE_INTERACTION ?? 0;
    if (now - last >= 1000) {
      telemetryThrottleRef.current.VISUAL_CORE_INTERACTION = now;
      recordRemoteCommand({
        kind: "VISUAL_CORE_INTERACTION",
        source: "visual_interaction",
        metadata: { interactionType: type },
      });
    }
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send("visual-core-interaction", {
        type,
        details,
        timestamp: Date.now(),
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[150] flex flex-col animate-in fade-in duration-700 border shadow-2xl rounded-xl overflow-hidden transition-all duration-500`}
      style={{
        backgroundColor: isLight
          ? `rgba(255, 255, 255, ${syncState.opacity})`
          : `rgba(0, 0, 0, ${syncState.opacity})`,
        borderColor: isLight
          ? "rgba(0, 0, 0, 0.1)"
          : "rgba(255, 255, 255, 0.15)",
        boxShadow: `0 0 80px -20px ${themeColor}30, inset 0 0 40px ${themeColor}10`,
        backdropFilter: `blur(${syncState.blur}px)`,
      }}
    >
      {/* Cinematic HUD Background Grain/Noise */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* LIQUID BACKGROUND SYNC */}
      <LiquidBackground 
        color={themeColor}
        amplitude={syncState.amplitude}
        isThinking={syncState.isThinking}
        isSpeaking={syncState.isSpeaking}
        opacity={0.4}
      />

      {/* GLOBAL SIGNAL VISUALIZER BACKGROUND */}
      <SignalVisualizer
        themeColor={themeColor}
        mode={
          mode === "SECURITY" || mode === "HACKING" || mode === "TACTICAL"
            ? "BINARY"
            : "SPECTRAL"
        }
        opacity={mode === "IDLE" ? 0.3 : 0.15}
      />

      {/* Visual Core Header / Status Bar - DRAGGABLE AREA */}
      <div
        className={`h-12 border-b flex items-center justify-between px-6 glass-blur cursor-move transition-colors duration-500`}
        style={
          {
            WebkitAppRegion: "drag",
            backgroundColor: isLight
              ? "rgba(0,0,0,0.03)"
              : "rgba(255,255,255,0.05)",
            borderColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.1)",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Icon
              name="Activity"
              size={18}
              className={mode !== "IDLE" ? "animate-pulse" : ""}
              style={{
                color:
                  mode !== "IDLE"
                    ? themeColor
                    : isLight
                      ? "#94a3b8"
                      : "#64748b",
              }}
            />
            <span
              className={`text-[10px] font-mono font-bold tracking-[0.4em] uppercase ${isLight ? "text-slate-900" : "text-white/90"}`}
            >
              {mode === "BROWSER"
                ? "LUCA_BROWSER_GOVERNED"
                : "LUCA_TACTICAL_HUD"}
            </span>
          </div>
          {/* Mode Tabs - NON-DRAGGABLE */}
          <div
            className="flex gap-2 ml-8"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              onClick={() => {
                // PR #145 — create a governed browser session before transitioning.
                if (!browserShellSessionIdRef.current) {
                  const defaultUrl = currentBrowserUrl || "https://google.com";
                  const result = sandboxedBrowserShellService.openApprovedSafeUrl({
                    url: defaultUrl,
                    title: "VisualCore governed browser session",
                    source: "visual_core_local_ui",
                  });
                  if (result.status === "open" || result.status === "open_requested") {
                    browserShellSessionIdRef.current = result.shellSessionId;
                  }
                }
                requestModeTransition("BROWSER", "local_ui");
              }}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "BROWSER"
                  ? {
                      backgroundColor: `${themeColor}33`,
                      color: themeColor,
                      borderColor: `${themeColor}80`,
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Ghost
            </button>
            <button
              onClick={() => requestModeTransition("DATA", "local_ui")}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "DATA"
                  ? {
                      backgroundColor: `${themeColor}33`,
                      color: themeColor,
                      borderColor: `${themeColor}80`,
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Data
            </button>
            <button
              onClick={() => requestModeTransition("CINEMA", "local_ui")}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all`}
              style={
                mode === "CINEMA"
                  ? {
                      backgroundColor: `${themeColor}33`,
                      color: themeColor,
                      borderColor: `${themeColor}80`,
                    }
                  : {
                      color: "#64748b",
                    }
              }
            >
              Cinema
            </button>

            {/* CAST BUTTON */}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button
              onClick={() => setShowCastPicker(true)}
              className="p-1.5 rounded-full text-slate-400 transition-colors"
              style={
                {
                  ":hover": {
                    color: themeColor,
                    backgroundColor: `${themeColor}33`,
                  },
                } as any
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.color = themeColor;
                e.currentTarget.style.backgroundColor = `${themeColor}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Cast to IoT Device"
            >
              <Icon name="Cast" size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <Icon name="X" size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        {/* IDLE SCREEN - Subsystem Activity Matrix */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-1000 ${
            mode === "IDLE" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <SubsystemPulse color={themeColor} amplitude={syncState.amplitude} />

          <div className="text-center z-10 space-y-6">
            <div className="relative inline-block">
              <h1
                className={`text-8xl font-thin tracking-[0.25em] font-mono transition-colors duration-500 ${isLight ? "text-slate-900" : "text-white"}`}
                style={{ textShadow: `0 0 30px ${themeColor}40` }}
              >
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </h1>
              <div className="absolute -top-4 -right-12">
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-mono tracking-widest opacity-40 uppercase ${isLight ? "text-slate-900" : "text-white"}`}>
                    NODE_ID: {sessionId.substring(0, 8)}
                  </span>
                  <span className={`text-[9px] font-mono tracking-widest opacity-40 uppercase ${isLight ? "text-slate-900" : "text-white"}`}>
                    UTC {currentTime.getUTCHours()}:{currentTime.getUTCMinutes().toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-1000"
              style={{ color: themeColor }}
            >
              <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.5em]">
                <div className="w-16 h-px opacity-20 bg-current" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span className="font-bold">CORE_HANDSHAKE: ACTIVE</span>
                </div>
                <div className="w-16 h-px opacity-20 bg-current" />
              </div>
              
              <div className="text-[8px] font-mono opacity-40 uppercase tracking-[0.3em] flex gap-6">
                <span>MEM_ALLOC: OK</span>
                <span>UPLINK: SECURE</span>
                <span>LATENCY: 14ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* DATA LAYER (Visual Data Stream) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center bg-black/80 glass-blur ${
            mode === "DATA" || mode === "DATA_ROOM"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {visualData ? (
            <VisualDataPresenter
              data={visualData}
              theme={{
                primary: themeColor,
                border: themeColor,
                bg: `${themeColor}20`,
                glow: `0 0 20px ${themeColor}50`,
              }}
              onClose={onClearData}
              onInteraction={handleInteraction}
              remoteCommand={remoteCommand}
            />
          ) : (
            <div className="text-slate-500 font-mono text-sm tracking-widest">
              WAITING FOR VISUAL DATA...
            </div>
          )}
        </div>

        {/* CINEMA LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "CINEMA"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "CINEMA" && (
            <CinemaPlayer
              onClose={() => requestModeTransition("IDLE", "component_close")}
              videoUrl={
                cinemaUrl ||
                visualData?.data?.url ||
                visualData?.url ||
                visualData?.items?.[0]?.videoUrl
              }
              videoStream={videoStream}
              sourceType={videoStream ? "mirror" : cinemaSourceType}
              title={videoStream ? "Ghost Mirror Active" : cinemaTitle}
              themeColor={themeColor}
            />
          )}
        </div>

        {/* SECURITY LAYER */}
        {/* SECURITY / TACTICAL LAYER (Tactical Stream Integration) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 p-8 ${
            mode === "SECURITY" || mode === "HACKING" || mode === "TACTICAL"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <TacticalStream
            logs={visualData?.logs || []}
            themeColor={themeColor}
            title={visualData?.title || "TACTICAL_SECURITY_CONTROL"}
            status={visualData?.status || "MONITORING_ACTIVE"}
            isLight={isLight}
            onClear={onClearData}
          />
        </div>

        {/* SOVEREIGNTY LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SOVEREIGNTY"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SOVEREIGNTY" && visualData && (
            <SovereigntyDashboard
              data={
                visualData.data || {
                  totalProfit: 0,
                  leadsFound: 0,
                  chainsScanned: 0,
                  activeChains: [],
                }
              }
              themeColor={themeColor}
            />
          )}
        </div>

        {/* OSINT LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "OSINT"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "OSINT" && visualData?.profile && (
            <OsintDossier
              profile={visualData.profile}
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* STOCKS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "STOCKS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "STOCKS" && (
            <StockTerminal
              onClose={() => requestModeTransition("IDLE", "component_close")}
              initialSymbol={visualData?.symbol}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* AUTONOMY LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "AUTONOMY"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "AUTONOMY" && (
            <AutonomyDashboard onClose={() => requestModeTransition("IDLE", "component_close")} />
          )}
        </div>

        {/* SUBSYSTEMS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SUBSYSTEMS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SUBSYSTEMS" && (
            <SubsystemDashboard
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>
        {/* CODE EDITOR LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "CODE_EDITOR"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "CODE_EDITOR" && (
            <CodeEditor
              onClose={() => requestModeTransition("IDLE", "component_close")}
              initialCwd={visualData?.cwd || "/"}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* SKILLS MATRIX LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "SKILLS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "SKILLS" && (
            <SkillsMatrix
              onClose={() => requestModeTransition("IDLE", "component_close")}
              onExecute={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* CRYPTO TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "CRYPTO"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "CRYPTO" && (
            <CryptoTerminal
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* FOREX TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "FOREX"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "FOREX" && (
            <ForexTerminal
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* PREDICTION TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "PREDICTIONS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "PREDICTIONS" && (
            <PredictionTerminal
              onClose={() => requestModeTransition("IDLE", "component_close")}
              positions={[]}
              onBet={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* NETWORK MAP LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "NETWORK"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "NETWORK" && (
            <NetworkMap onClose={() => requestModeTransition("IDLE", "component_close")} theme={theme} />
          )}
        </div>

        {/* HACKING TERMINAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "HACKING"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "HACKING" && (
            <HackingTerminal
              onClose={() => requestModeTransition("IDLE", "component_close")}
              toolLogs={[]}
              themeId={persona as any}
            />
          )}
        </div>
        {/* REPORTS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "REPORTS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "REPORTS" && (
            <InvestigationReports
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* GEO TACTICAL LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "GEO"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "GEO" && (
            <GeoTacticalView
              onClose={() => requestModeTransition("IDLE", "component_close")}
              targetName={visualData?.targetName || "Unknown"}
              markers={visualData?.markers || []}
            />
          )}
        </div>

        {/* LIVE CONTENT LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "LIVE"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "LIVE" && (
            <LiveContentDisplay
              onClose={() => requestModeTransition("IDLE", "component_close")}
              content={visualData?.content || {}}
            />
          )}
        </div>

        {/* FILES LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "FILES"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "FILES" && (
            <MobileFileBrowser onClose={() => requestModeTransition("IDLE", "component_close")} />
          )}
        </div>

        {/* VISION HUD LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "VISION"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "VISION" && (
            <VisionHUD themeColor={themeColor} isActive={true} />
          )}
        </div>

        {/* LUCA RECORDER LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "RECORDER"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "RECORDER" && (
            <LucaRecorder
              onClose={() => requestModeTransition("IDLE", "component_close")}
              onSave={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* TELEGRAM LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "TELEGRAM"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "TELEGRAM" && (
            <TelegramManager
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/20`,
              }}
            />
          )}
        </div>

        {/* WHATSAPP LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "WHATSAPP"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "WHATSAPP" && (
            <WhatsAppManager
              onClose={() => requestModeTransition("IDLE", "component_close")}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* WIRELESS LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "WIRELESS"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "WIRELESS" && (
            <WirelessManager
              onClose={() => requestModeTransition("IDLE", "component_close")}
              activeTab="WIFI"
              onConnect={() => {}}
              theme={theme}
            />
          )}
        </div>

        {/* INGESTION LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "INGESTION"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "INGESTION" && (
            <IngestionModal
              onClose={() => requestModeTransition("IDLE", "component_close")}
              onIngest={() => {}}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
            />
          )}
        </div>

        {/* BROWSER LAYER */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 bg-black ${
            mode === "BROWSER"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {mode === "BROWSER" && (
            <LucaBrowser
              url={currentBrowserUrl || "https://google.com"}
              onClose={() => {
                // PR #143 — close the governed shell session when leaving BROWSER mode.
                if (browserShellSessionIdRef.current) {
                  sandboxedBrowserShellService.closeShellSession(browserShellSessionIdRef.current);
                  browserShellSessionIdRef.current = null;
                }
                requestModeTransition("IDLE", "browser_close");
              }}
              mode="EMBEDDED"
              browserMode="GOVERNED"
              auditUrl={toVisualCoreAuditSafeUrl(currentBrowserUrl) ?? currentBrowserUrl}
              shellSessionId={browserShellSessionIdRef.current ?? undefined}
              onRevoke={() => {
                if (browserShellSessionIdRef.current) {
                  sandboxedBrowserShellService.revokeShellSession(browserShellSessionIdRef.current);
                  browserShellSessionIdRef.current = null;
                }
                requestModeTransition("IDLE", "browser_revoke");
              }}
            />
          )}
        </div>
      </div>

      {/* CAST PICKER OVERLAY */}
      {showCastPicker && (
        <CastPicker
          devices={devices || []}
          onCancel={() => setShowCastPicker(false)}
          onSelect={(deviceId) => {
            if (onCast) onCast(deviceId);
            setShowCastPicker(false);
          }}
          theme={{
            primary: themeColor,
            border: themeColor,
            bg: `${themeColor}20`,
            hex: themeColor,
          }}
        />
      )}
    </div>
  );
};

export default VisualCore;
