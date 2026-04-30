import React, { useState, useEffect } from "react";
import GhostBrowser from "./GhostBrowser";
import VisualDataPresenter from "./VisualDataPresenter";
import CinemaPlayer from "./CinemaPlayer";
import CastPicker from "./CastPicker";
import { X, Activity, Cast } from "lucide-react";
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
}) => {
  const [mode, setMode] = useState<VisualCoreMode>("IDLE");
  const [showCastPicker, setShowCastPicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Derive theme color from persona if not explicitly provided
  const getPersonaColor = (p: string) => {
    return PERSONA_UI_CONFIG[p]?.hex || PERSONA_UI_CONFIG.DEFAULT.hex;
  };

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

  const contextColor = getContextTheme(visualData?.type);
  const themeColor =
    theme?.hex || contextColor || propThemeColor || getPersonaColor(persona);
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

    // BROWSER mode takes priority when a valid URL is provided
    if (browserUrl && browserUrl !== "about:blank" && browserUrl !== "") {
      console.log(
        "[VisualCore] Switching to BROWSER mode with URL:",
        browserUrl,
      );
      setMode("BROWSER");
      return;
    }

    if (visualData) {
      if (visualData.topic === "DATA_ROOM" || visualData.type === "DATA_ROOM") {
        setMode("DATA");
      } else if (visualData.type === "CINEMA") {
        setMode("CINEMA");
      } else if (
        visualData.topic === "SECURITY" ||
        visualData.type === "SECURITY"
      ) {
        setMode("SECURITY");
      } else if (
        visualData.topic === "GLOBAL_SOVEREIGNTY" ||
        visualData.type === "SOVEREIGNTY"
      ) {
        setMode("SOVEREIGNTY");
      } else if (
        visualData.type === "OSINT" ||
        visualData.type === "INTELLIGENCE" // Map generalized type to OSINT mode
      ) {
        setMode("OSINT");
      } else if (
        visualData.type === "STOCKS" ||
        visualData.type === "FINANCE" // Map generalized type to STOCKS mode
      ) {
        setMode("STOCKS");
      } else if (visualData.type === "AUTONOMY") {
        setMode("AUTONOMY");
      } else if (visualData.type === "SUBSYSTEMS") {
        setMode("SUBSYSTEMS");
      } else if (visualData.type === "CODE_EDITOR") {
        setMode("CODE_EDITOR");
      } else if (visualData.type === "SKILLS") {
        setMode("SKILLS");
      } else if (visualData.type === "CRYPTO") {
        setMode("CRYPTO");
      } else if (visualData.type === "FOREX") {
        setMode("FOREX");
      } else if (visualData.type === "PREDICTIONS") {
        setMode("PREDICTIONS");
      } else if (visualData.type === "NETWORK") {
        setMode("NETWORK");
      } else if (visualData.type === "HACKING") {
        setMode("HACKING");
      } else if (visualData.type === "REPORTS") {
        setMode("REPORTS");
      } else if (visualData.type === "GEO") {
        setMode("GEO");
      } else if (visualData.type === "LIVE") {
        setMode("LIVE");
      } else if (visualData.type === "FILES") {
        setMode("FILES");
      } else if (visualData.type === "VISION") {
        setMode("VISION");
      } else if (visualData.type === "RECORDER") {
        setMode("RECORDER");
      } else if (visualData.type === "TELEGRAM") {
        setMode("TELEGRAM");
      } else if (visualData.type === "WHATSAPP") {
        setMode("WHATSAPP");
      } else if (visualData.type === "WIRELESS") {
        setMode("WIRELESS");
      } else if (visualData.type === "INGESTION") {
        setMode("INGESTION");
      } else if (
        visualData.type === "TACTICAL" ||
        visualData.type === "SYSTEM" // Map generalized type to TACTICAL mode (Blue Theme)
      ) {
        setMode("TACTICAL");
      } else if (visualData.type === "SHOW_DISPLAY") {
        // Force show the last valid mode or default to DATA
        // This relies on the fact that visualData might have other props,
        // OR we need a way to know what was last shown.
        // For now, let's assume the tool sends the TYPE along with SHOW_DISPLAY
        // but if it's just a signal, we might need a history.
        // SIMPLER APPROACH: The tool should send the FULL data object again but with summonHUD: true.
        // But the provider doesn't have the full data.
        // SO: We will use a special prop "forceShow" in visualData.
        setMode("DATA");
      } else {
        setMode("DATA");
      }
      return;
    }

    // Auto-switch to CINEMA when a cinema URL or videoStream is provided
    if (cinemaUrl || videoStream) {
      setMode("CINEMA");
      return;
    }

    // Default to IDLE if nothing is active
    if (isVisible && !browserUrl && !visualData && !cinemaUrl && !videoStream) {
      setMode("IDLE");
    }
  }, [visualData, browserUrl, isVisible, cinemaUrl, videoStream]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[150] flex flex-col animate-in fade-in duration-700 border shadow-2xl rounded-xl overflow-hidden backdrop-blur-3xl transition-all duration-500`}
      style={{
        backgroundColor: isLight
          ? "rgba(255, 255, 255, 0.7)"
          : "rgba(0, 0, 0, 0.85)",
        borderColor: isLight
          ? "rgba(0, 0, 0, 0.1)"
          : "rgba(255, 255, 255, 0.15)",
        boxShadow: `0 0 80px -20px ${themeColor}30, inset 0 0 40px ${themeColor}10`,
      }}
    >
      {/* Cinematic HUD Background Grain/Noise */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

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
        className={`h-12 border-b flex items-center justify-between px-6 backdrop-blur-2xl cursor-move transition-colors duration-500`}
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
            <Activity
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
                ? "GHOST_BROWSER_OVERLAY"
                : "LUCA_TACTICAL_HUD"}
            </span>
          </div>
          {/* Mode Tabs - NON-DRAGGABLE */}
          <div
            className="flex gap-2 ml-8"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              onClick={() => setMode("BROWSER")}
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
              onClick={() => setMode("DATA")}
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
              onClick={() => setMode("CINEMA")}
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
              <Cast size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        {/* IDLE SCREEN - Minimalist Clock / Status */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-1000 ${
            mode === "IDLE" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Subtle Background Pulse / Fluid Glow */}
          <div
            className="absolute inset-0 animate-pulse-slow transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle at center, ${themeColor}15, transparent 70%)`,
            }}
          />

          {/* Ambient Scanning Line */}
          <div
            className="absolute w-full h-px opacity-20 animate-scanline"
            style={{
              background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
              top: "50%",
            }}
          />

          <div className="text-center z-10 space-y-6">
            <div className="relative inline-block">
              <h1
                className={`text-8xl font-thin tracking-[0.2em] font-mono transition-colors duration-500 ${isLight ? "text-slate-900" : "text-white"}`}
              >
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </h1>
              <div className="absolute -top-4 -right-8">
                <span
                  className={`text-[10px] font-mono tracking-widest opacity-40 uppercase ${isLight ? "text-slate-900" : "text-white"}`}
                >
                  UTC {currentTime.getUTCHours()}:
                  {currentTime.getUTCMinutes().toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div
              className={`flex items-center justify-center gap-4 font-mono text-[9px] tracking-[0.5em] transition-all duration-700 animate-in fade-in slide-in-from-bottom-4`}
              style={{ color: themeColor }}
            >
              <div className="w-12 h-px opacity-30 bg-current" />
              <Activity size={14} className="animate-pulse" />
              <span className="font-bold">SYSTEM_STABLE // SECURE_CORE</span>
              <div className="w-12 h-px opacity-30 bg-current" />
            </div>
          </div>
        </div>

        {/* DATA LAYER (Visual Data Stream) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center bg-black/80 backdrop-blur-md ${
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
            <AutonomyDashboard onClose={() => setMode("IDLE")} />
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
            <NetworkMap onClose={() => setMode("IDLE")} theme={theme} />
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
              onClose={() => setMode("IDLE")}
              toolLogs={[]}
              theme={{
                hex: themeColor,
                primary: `text-[${themeColor}]`,
                border: `border-[${themeColor}]`,
                bg: `bg-[${themeColor}]/10`,
              }}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
            <MobileFileBrowser onClose={() => setMode("IDLE")} />
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
              onClose={() => setMode("IDLE")}
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
            <GhostBrowser
              url={browserUrl || "https://google.com"}
              onClose={() => setMode("IDLE")}
              mode="EMBEDDED"
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
