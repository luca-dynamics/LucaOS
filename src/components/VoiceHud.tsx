import React, { useEffect, useRef, useState } from "react";
import { Volume2, Radio, Zap, Eye, ShieldAlert, Terminal } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

import { getAllTools, PersonaType } from "../services/lucaService";
import { eventBus } from "../services/eventBus";

// Import Refactored Components
import VoiceVisualizer from "./voice/VoiceVisualizer";
import VoiceControls from "./voice/VoiceControls";
import VoiceStatusOrb from "./voice/VoiceStatusOrb";
import TacticalStream from "./visual/TacticalStream";
import { THEME_PALETTE, MISSION_COLORS } from "../config/themeColors";
import { MissionScope } from "../services/toolRegistry";

// --- HELPER COMPONENT: Typewriter Text ---
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText(""); // Reset on new text
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 45); // ~45ms per char = typewriter speed
    return () => clearInterval(interval);
  }, [text]);

  return <span>&quot;{displayedText}&quot;</span>;
};

// Removed local CANVAS_THEME_COLORS map to use central THEME_PALETTE from themeColors.ts

interface VoiceHudProps {
  isActive: boolean;
  isVisible?: boolean; // New prop for conditional visibility (Dictation mode)
  onClose: () => void;
  amplitude: number; // Standardized: 0 to 255
  transcript: string;
  transcriptSource: "user" | "model";
  isVadActive: boolean;
  paused?: boolean;
  searchResults?: any;
  visualData?: any;
  onClearVisualData?: () => void;
  onTranscriptChange?: (text: string) => void;
  onTranscriptComplete?: (text: string) => void;
  isSpeaking: boolean;
  persona: PersonaType;
  modelName?: string; // Active Voice Model Name
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
    coreColor: string;
    hex: string;
    themeName: string;
  };
  elevationState?: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
  };
  statusMessage?: string | null;
  isVisionActive?: boolean; // New prop for dual-mode optimization
  hideDebugPanels?: boolean; // Hide ACTIVE PROTOCOLS and TELEMETRY panels
  hideControls?: boolean; // Hide settings and camera buttons (for onboarding)
  transparentBackground?: boolean; // Allow underlying backgrounds to show through
}

const VoiceHud: React.FC<VoiceHudProps> = ({
  transcript,
  isActive,
  isVisible = true, // Default to true
  onClose,
  amplitude,
  transcriptSource,
  isVadActive,
  persona,
  modelName = "GEMINI 2.0 FLASH", // Default
  theme,
  statusMessage,
  isVisionActive = false,
  hideDebugPanels = false, // Default to false (show panels in main app)
  hideControls = false, // Default to false (show controls in main app)
  transparentBackground = false, // New prop to allow underlying backgrounds to show through
  visualData, // Add visualData to props
  elevationState,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dynamicProtocols, setDynamicProtocols] = useState<string[]>([]);
  const [latency, setLatency] = useState(14);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- REAL AUDIO TELEMETRY STATE ---
  const [realDB, setRealDB] = useState(-60);
  const [dominantFrequency, setDominantFrequency] = useState(0);

  // Audio Analysis removed - we now use the amplitude prop from liveService
  // This eliminates a redundant mic stream acquisition

  // Initialize dynamic tool list
  useEffect(() => {
    if (isActive && isVisible) {
      const tools = getAllTools().map((t) =>
        (t.name || "UNKNOWN").replace(/([A-Z])/g, "_$1").toUpperCase(),
      );
      setDynamicProtocols(tools.sort(() => 0.5 - Math.random()).slice(0, 6));
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      }
      setIsVideoActive(false);
    }

    const interval = setInterval(() => {
      setLatency((prev) =>
        Math.max(5, Math.min(40, prev + (Math.random() - 0.5) * 10)),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isVisible]);

  // --- SUBSCRIBE TO REAL AUDIO TELEMETRY ---
  useEffect(() => {
    const handleAudioData = (data: {
      amplitude: number;
      source: string;
      dB?: number;
      dominantFrequency?: number;
    }) => {
      if (data.dB !== undefined) setRealDB(data.dB);
      if (data.dominantFrequency !== undefined)
        setDominantFrequency(data.dominantFrequency);
    };
    eventBus.on("audio-amplitude", handleAudioData);
    return () => {
      eventBus.off("audio-amplitude", handleAudioData);
    };
  }, []);

  const toggleVideo = async () => {
    if (isVideoActive) {
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
        setVideoStream(null);
      }
      setIsVideoActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "environment" },
        });
        setVideoStream(stream);
        setIsVideoActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Failed to access camera", e);
      }
    }
  };

  if (!isActive || !isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500"
      style={{
        backgroundColor: transparentBackground
          ? "transparent"
          : theme.themeName?.toLowerCase() === "lucagent" ||
              theme.themeName?.toLowerCase() === "agentic-slate"
            ? `rgba(255, 255, 255, var(--app-bg-opacity, 0.9))`
            : `rgba(10, 10, 10, var(--app-bg-opacity, 0.9))`,
        backdropFilter: transparentBackground
          ? "none"
          : `blur(var(--app-bg-blur, 40px))`,
        WebkitBackdropFilter: transparentBackground
          ? "none"
          : `blur(var(--app-bg-blur, 40px))`,
      }}
    >
      {/* Liquid Organic Noise Layer */}
      <div className="glass-noise" />
      {/* Video Stream Element */}
      <div
        className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ${
          isVideoActive ? "opacity-40" : "opacity-0"
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Scanner Overlay */}
        {isVideoActive && (
          <div
            className="absolute inset-0 bg-[size:100%_4px]"
            style={{
              backgroundImage: `linear-gradient(${(THEME_PALETTE[persona as keyof typeof THEME_PALETTE] || THEME_PALETTE.RUTHLESS).primary}1A 1px, transparent 1px)`,
            }}
          >
            <div
              className={`absolute top-10 left-10 border-t-2 border-l-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute top-10 right-10 border-t-2 border-r-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute bottom-10 left-10 border-b-2 border-l-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute bottom-10 right-10 border-b-2 border-r-2 ${theme.border} w-16 h-16`}
            ></div>
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border ${theme.border} opacity-50 w-64 h-64 rounded-full animate-pulse`}
            ></div>
            <div
              className={`absolute top-20 left-1/2 -translate-x-1/2 ${theme.bg} px-4 py-1 ${theme.primary} text-xs font-bold font-mono tracking-widest`}
            >
              LIVE VISION FEED ACTIVE
            </div>
          </div>
        )}
      </div>
      <canvas ref={captureCanvasRef} className="hidden" />
      <VoiceVisualizer
        amplitude={amplitude}
        isVadActive={isVadActive}
        transcriptSource={transcriptSource}
        persona={persona}
        lowPower={isVisionActive}
      />
      <VoiceStatusOrb
        isVadActive={isVadActive}
        transcriptSource={transcriptSource}
        amplitude={amplitude}
        persona={persona}
        canvasThemeColor={
          (
            THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
            THEME_PALETTE.RUTHLESS
          ).primary
        }
      />

      {/* ACTION BLOCK LAYER - HUD STYLE */}
      {visualData && (
        <div className="absolute top-[15%] w-full flex justify-center z-40 animate-in fade-in zoom-in-95 duration-500 pointer-events-none">
          <div
            className="w-[90%] md:w-[600px] h-48 md:h-64 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden rounded-xl border border-white/10"
            style={{
              backgroundColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? `rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.75) * 0.4))`
                  : `rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.75) * 0.6))`,
              backdropFilter: `blur(var(--app-bg-blur, 12px))`,
              WebkitBackdropFilter: `blur(var(--app-bg-blur, 12px))`,
            }}
          >
            <TacticalStream
              logs={visualData.logs}
              title={visualData.title || "TACTICAL_FEED"}
              status={visualData.status}
              themeColor={
                (
                  THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                  THEME_PALETTE.RUTHLESS
                ).primary
              }
              isLight={theme.themeName?.toLowerCase() === "lucagent"}
            />
          </div>
        </div>
      )}
      {/* CENTRAL DISPLAY      {/* Transcript Display (Center Bottom) */}
      <div className="absolute bottom-20 sm:bottom-32 w-full px-4 sm:px-8 md:max-w-4xl flex flex-col items-center justify-center z-30">
        {/* Main Transcript */}
        <div className="text-center px-4 sm:px-6 md:px-8 py-3 sm:py-4 min-h-[60px] sm:min-h-[80px] w-full max-w-[90vw] sm:max-w-full">
          <div className="mb-2 sm:mb-3 flex items-center justify-center gap-2">
            <Radio
              size={14}
              className="animate-pulse"
              style={{ color: theme.primary }}
            />
            <span
              className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase"
              style={{ color: theme.primary }}
            >
              {transcriptSource === "model" ? "LUCA" : "INPUT"}
            </span>
          </div>
          {transcript ? (
            <div
              className={`
                font-display 
                text-base sm:text-xl md:text-2xl 
                tracking-wide 
                font-bold 
                leading-relaxed 
                transition-all 
                duration-300 
                drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]
                line-clamp-3
                overflow-hidden
                text-ellipsis
                ${
                  transcriptSource === "model"
                    ? theme.primary
                    : theme.themeName?.toLowerCase() === "lucagent"
                      ? "text-gray-900"
                      : "text-white"
                }
              `}
            >
              {transcriptSource === "model" ? (
                <TypewriterText text={transcript} />
              ) : (
                `"${transcript}"`
              )}
            </div>
          ) : (
            <div
              className={`${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "text-slate-600/60"
                  : "text-slate-600"
              } font-mono text-[10px] sm:text-xs animate-pulse`}
            >
              WAITING FOR AUDIO INPUT...
            </div>
          )}

          {/* SYSTEM STATUS LOG (Underground) */}
          {statusMessage && (
            <div
              className="mt-3 sm:mt-4 font-mono text-[10px] sm:text-xs tracking-widest opacity-70 animate-pulse"
              style={{
                color: (
                  THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                  THEME_PALETTE.RUTHLESS
                ).primary,
              }}
            >
              [SYSTEM_LOG]: {statusMessage}
            </div>
          )}
        </div>
      </div>
      {/* Left Panel: Dynamic Active Protocols - Hidden in onboarding */}
      {!hideDebugPanels && (
        <div className="absolute left-16 bottom-[15%] hidden md:flex flex-col gap-4 w-64 font-mono text-[10px] z-10 pointer-events-none">
          <div
            className="flex items-center gap-2 font-bold border-b pb-2 mb-2"
            style={{
              color: (
                THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                THEME_PALETTE.RUTHLESS
              ).primary,
              borderColor: `${(THEME_PALETTE[persona as keyof typeof THEME_PALETTE] || THEME_PALETTE.RUTHLESS).primary}4D`,
            }}
          >
            <Terminal size={14} /> ACTIVE PROTOCOLS
          </div>
          <div
            className={`space-y-3 ${
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-gray-600"
                : "text-slate-400"
            }`}
          >
            {dynamicProtocols.map((proto, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div
                  className="w-1 h-1 rounded-full animate-pulse"
                  style={{
                    backgroundColor: (
                      THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                      THEME_PALETTE.RUTHLESS
                    ).primary,
                  }}
                ></div>
                <span>&quot;{proto}&quot;</span>
              </div>
            ))}
            <div className="text-[8px] opacity-30 pt-2">
              ...AND {getAllTools().length - 6} MORE MODULES
            </div>
          </div>
        </div>
      )}
      {/* Right Panel: Telemetry ONLY - Hidden in onboarding */}
      {!hideDebugPanels && (
        <div className="absolute right-16 bottom-[15%] hidden md:flex flex-col gap-2 w-80 font-mono text-[10px] text-right z-30 pointer-events-auto">
          <div
            className="font-bold mb-2"
            style={{
              color: (
                THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                THEME_PALETTE.RUTHLESS
              ).primary,
            }}
          >
            TELEMETRY STREAM
          </div>

          <div
            className={`flex justify-end items-center gap-2 ${
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-gray-600"
                : "text-slate-400"
            }`}
          >
            <span>ACTIVE_MODEL</span>
            <span
              className={`${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "text-gray-900"
                  : "text-white"
              } font-bold`}
            >
              {modelName.toUpperCase()}
            </span>
          </div>

          <div
            className={`flex justify-end items-center gap-2 ${
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-gray-600"
                : "text-slate-400"
            }`}
          >
            <span>LATENCY</span>
            <span
              className={`${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "text-gray-900"
                  : "text-white"
              } font-bold`}
            >
              {latency.toFixed(0)}ms
            </span>
          </div>

          <div
            className={`flex justify-end items-center gap-2 ${
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-gray-600"
                : "text-slate-400"
            }`}
          >
            <span>AUDIO_INPUT_DB</span>
            <span
              className={`${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "text-gray-900"
                  : "text-white"
              } font-bold`}
            >
              {realDB.toFixed(0)} dB
            </span>
            <div className="w-12 h-1 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${Math.max(0, ((realDB + 60) / 60) * 100)}%`,
                  backgroundColor: (
                    THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                    THEME_PALETTE.RUTHLESS
                  ).primary,
                }}
              ></div>
            </div>
          </div>

          {isVideoActive && (
            <div
              className={`flex justify-end items-center gap-2 ${theme.primary}`}
            >
              <span>VIDEO_FEED</span>
              <div
                className={`w-2 h-2 rounded-full ${theme.bg.replace(
                  "/40",
                  "",
                )} animate-pulse`}
              ></div>
            </div>
          )}

          <div
            className={`flex justify-end items-center gap-2 ${
              theme.themeName?.toLowerCase() === "lucagent"
                ? "text-gray-600"
                : "text-slate-400"
            }`}
          >
            <span>DOMINANT_FREQ</span>
            <span
              className={`${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "text-gray-900"
                  : "text-white"
              } font-bold`}
            >
              {dominantFrequency} Hz
            </span>
          </div>

          <div
            className="mt-4 p-2 border flex items-center justify-center gap-2 backdrop-blur-md rounded-sm transition-all duration-500"
            style={(() => {
              const activeScope = elevationState?.activeMissionScope;
              const hasMission = activeScope && activeScope !== MissionScope.NONE;

              // Map Enum Value (e.g. "FINANCIAL MISSION") to Color Key (e.g. "FINANCE")
              let colorKey: keyof typeof MISSION_COLORS = "FULL";
              if (activeScope === MissionScope.FILE) colorKey = "FILE";
              else if (activeScope === MissionScope.FINANCE) colorKey = "FINANCE";
              else if (activeScope === MissionScope.SOCIAL) colorKey = "SOCIAL";
              else if (activeScope === MissionScope.SYSTEM) colorKey = "SYSTEM";
              else if (activeScope === MissionScope.FULL) colorKey = "FULL";

              const missionColor = hasMission
                ? MISSION_COLORS[colorKey]
                : "rgb(239, 68, 68)";
              const missionColorDim = hasMission
                ? `${missionColor}22`
                : "rgba(127, 29, 29, 0.1)";
              const missionBorder = hasMission
                ? `${missionColor}88`
                : "rgba(239, 68, 68, 0.3)";

              return {
                borderColor: missionBorder,
                backgroundColor: missionColorDim,
                color: missionColor,
                boxShadow: `0 0 15px ${hasMission ? `${missionColor}44` : "rgba(239, 68, 68, 0.1)"}`,
              };
            })()}
          >
            <ShieldAlert
              size={12}
              className={
                elevationState?.activeMissionScope !== MissionScope.NONE
                  ? "animate-pulse"
                  : ""
              }
            />
            {elevationState?.activeMissionScope !== MissionScope.NONE
              ? `MISSION ACTIVE: ${elevationState?.activeMissionScope}`
              : "FIREWALL: SHIELD_ACTIVE"}
          </div>
        </div>
      )}
      <VoiceControls
        onSettingsClick={() => setIsSettingsOpen(true)}
        onToggleVideo={toggleVideo}
        isVideoActive={isVideoActive}
        onClose={onClose}
        persona={persona}
        theme={theme}
        canvasThemeColor={
          (
            THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
            THEME_PALETTE.RUTHLESS
          ).primary
        }
        hideControls={hideControls}
      />
      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          initialTab="voice"
          theme={theme}
        />
      )}
      {/* Footer Status */}
      <div className="absolute bottom-4 md:bottom-8 flex flex-wrap items-center justify-center gap-3 md:gap-12 text-[8px] md:text-[10px] font-mono text-slate-500 uppercase tracking-widest z-[60] pointer-events-none px-4 w-full text-center">
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Volume2
            size={10}
            className={`md:w-3 md:h-3 ${amplitude > 0.5 ? "text-white" : ""}`}
          />
          VOL:{" "}
          {((amplitude > 1 ? amplitude / 255 : amplitude) * 100).toFixed(0)}%
        </div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Radio
            size={10}
            className="animate-pulse md:w-3 md:h-3"
            style={{
              color: (
                THEME_PALETTE[persona as keyof typeof THEME_PALETTE] ||
                THEME_PALETTE.RUTHLESS
              ).primary,
            }}
          />
          LOW_LATENCY
        </div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Eye
            size={10}
            className={`md:w-3 md:h-3 ${isVideoActive ? theme.primary : ""}`}
          />
          VISION: {isVideoActive ? "ON" : "OFF"}
        </div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap">
          <Zap size={10} className="md:w-3 md:h-3" />
          CORE: OK
        </div>
      </div>
    </div>
  );
};

export default VoiceHud;
