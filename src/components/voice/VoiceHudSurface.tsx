import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import VoiceVisualizer from "./VoiceVisualizer";
import VoiceControls from "./VoiceControls";
import VoiceStatusOrb from "./VoiceStatusOrb";
import TacticalStream from "../visual/TacticalStream";
import { THEME_PALETTE, MISSION_COLORS } from "../../config/themeColors";
import { useTheme } from "../../hooks/useTheme";

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  return <span>&quot;{displayedText}&quot;</span>;
};

export interface VoiceHudSurfaceProps {
  isActive: boolean;
  isVisible?: boolean;
  onClose: () => void;
  transcript: string;
  transcriptSource: "user" | "model" | "system";
  isVadActive: boolean;
  isSpeaking: boolean;
  persona: string;
  modelName?: string;
  technicalModelName?: string;
  theme: {
    primary: string;
    border: string;
    bg: string;
    glow?: string;
    coreColor?: string;
    hex?: string;
    themeName: string;
  };
  statusMessage?: string | null;
  isVisionActive?: boolean;
  hideDebugPanels?: boolean;
  hideControls?: boolean;
  transparentBackground?: boolean;
  visualData?: any;
  elevationState?: {
    activeMissionScope?: string;
  };
  amplitude?: number;
  telemetrySummary?: string;
  speedLabel?: string;
  localCoreLabel?: string;
  localCoreReadinessReason?: string;
  routingHealth?: string;
  routeRecommendation?: {
    recommendedRouteKind?: string;
    confidence?: string | number;
    shouldSwitch?: boolean;
    reason?: string;
  };
  adaptiveRouteApplied?: boolean;
  realDB?: number;
  dominantFrequency?: number;
  realtimeStatus?: string;
  realtimeCanInterrupt?: boolean;
  realtimeLastError?: string | null;
  runtimeRouteHealth?: string | null;
  runtimeLatency?: number | null;
  runtimeFallbackActive?: boolean;
  dynamicProtocols?: string[];
  totalToolCount?: number;
  showTypedFallback?: boolean;
  typedFallbackValue?: string;
  typedFallbackPlaceholder?: string;
  micAvailable?: boolean;
  onRequestMic?: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  onTypedFallbackChange?: (value: string) => void;
  renderSettingsModal?: (onClose: () => void) => React.ReactNode;
}

export function VoiceHudSurface({
  transcript,
  isActive,
  isVisible = true,
  onClose,
  transcriptSource,
  isVadActive,
  isSpeaking,
  persona,
  modelName = "GEMINI 2.0 FLASH",
  technicalModelName,
  theme,
  statusMessage,
  isVisionActive = false,
  hideDebugPanels = false,
  hideControls = false,
  transparentBackground = false,
  visualData,
  elevationState,
  amplitude = 0,
  telemetrySummary,
  speedLabel,
  localCoreLabel,
  localCoreReadinessReason,
  routingHealth = "stable",
  routeRecommendation = {},
  adaptiveRouteApplied = false,
  realDB = -60,
  dominantFrequency = 0,
  realtimeStatus,
  realtimeCanInterrupt = true,
  realtimeLastError,
  runtimeRouteHealth,
  runtimeLatency,
  runtimeFallbackActive,
  dynamicProtocols = [],
  totalToolCount = dynamicProtocols.length,
  showTypedFallback = false,
  typedFallbackValue = "",
  typedFallbackPlaceholder = "Optional: tell Luca what you want help with first…",
  micAvailable = true,
  onRequestMic,
  onBack,
  onContinue,
  onTypedFallbackChange,
  renderSettingsModal,
}: VoiceHudSurfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isTactical } = useTheme();
  const showTechnicalPanels = !hideDebugPanels && isTactical;
  const palette = THEME_PALETTE[persona as keyof typeof THEME_PALETTE] || THEME_PALETTE.RUTHLESS;
  const themeColor = theme.hex || palette.primary;

  useEffect(() => () => videoStream?.getTracks().forEach((track) => track.stop()), [videoStream]);

  const toggleVideo = async () => {
    if (isVideoActive) {
      videoStream?.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
      setIsVideoActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "environment" } });
      setVideoStream(stream);
      setIsVideoActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Failed to access camera", error);
    }
  };

  if (!isActive || !isVisible) return null;

  const activeScope = elevationState?.activeMissionScope;
  const hasMission = Boolean(activeScope && activeScope !== "NONE");
  const colorKey = activeScope === "FILE" ? "FILE" : activeScope === "FINANCE" ? "FINANCE" : activeScope === "SOCIAL" ? "SOCIAL" : activeScope === "SYSTEM" ? "SYSTEM" : "FULL";
  const missionColor = hasMission ? MISSION_COLORS[colorKey as keyof typeof MISSION_COLORS] : "rgb(239, 68, 68)";

  return (
    <div
      aria-label="Luca VoiceHUD original surface"
      data-voice-hud-surface="original"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500"
      style={{
        backgroundColor: transparentBackground ? "transparent" : "var(--app-bg-main)",
        opacity: transparentBackground ? 1 : "var(--app-bg-opacity, 0.9)",
        backdropFilter: transparentBackground ? "none" : `blur(var(--app-bg-blur, 40px))`,
        WebkitBackdropFilter: transparentBackground ? "none" : `blur(var(--app-bg-blur, 40px))`,
      }}
    >
      <div className="glass-noise" />
      <div className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ${isVideoActive ? "opacity-40" : "opacity-0"}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {isVideoActive && (
          <div className="absolute inset-0 bg-[size:100%_4px]" style={{ backgroundImage: `linear-gradient(${themeColor}1A 1px, transparent 1px)` }}>
            <div className={`absolute top-10 left-10 border-t-2 border-l-2 ${theme.border} w-16 h-16`} />
            <div className={`absolute top-10 right-10 border-t-2 border-r-2 ${theme.border} w-16 h-16`} />
            <div className={`absolute bottom-10 left-10 border-b-2 border-l-2 ${theme.border} w-16 h-16`} />
            <div className={`absolute bottom-10 right-10 border-b-2 border-r-2 ${theme.border} w-16 h-16`} />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border ${theme.border} opacity-50 w-64 h-64 rounded-full animate-pulse`} />
            <div className={`absolute top-20 left-1/2 -translate-x-1/2 ${theme.bg} px-4 py-1 ${theme.primary} text-xs font-bold font-mono tracking-widest`}>LIVE VISION FEED ACTIVE</div>
          </div>
        )}
      </div>
      <VoiceVisualizer amplitude={amplitude} isVadActive={isVadActive} transcriptSource={transcriptSource === "system" ? "user" : transcriptSource} persona={persona as any} lowPower={isVisionActive} />
      <VoiceStatusOrb isVadActive={isVadActive} transcriptSource={transcriptSource === "system" ? "user" : transcriptSource} amplitude={amplitude} persona={persona as any} canvasThemeColor={themeColor} isSpeaking={isSpeaking} statusMessage={statusMessage} voiceModeLabel={modelName} detailLabel={telemetrySummary} />

      {visualData && (
        <div className="absolute top-[15%] w-full flex justify-center z-40 animate-in fade-in zoom-in-95 duration-500 pointer-events-none">
          <div className="w-[90%] md:w-[600px] h-48 md:h-64 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden rounded-xl border border-white/10" style={{ backgroundColor: "var(--app-bg-tint)", backdropFilter: `blur(var(--app-bg-blur, 12px))`, WebkitBackdropFilter: `blur(var(--app-bg-blur, 12px))` }}>
            <TacticalStream logs={visualData.logs} title={visualData.title || "TACTICAL_FEED"} status={visualData.status} themeColor={themeColor} />
          </div>
        </div>
      )}

      <div className="absolute bottom-20 sm:bottom-32 w-full px-4 sm:px-8 md:max-w-4xl flex flex-col items-center justify-center z-30">
        <div className="text-center px-4 sm:px-6 md:px-8 py-3 sm:py-4 min-h-[60px] sm:min-h-[80px] w-full max-w-[90vw] sm:max-w-full">
          <div className="mb-2 sm:mb-3 flex items-center justify-center gap-2">
            <Icon name="Microphone" size={14} className="animate-pulse" style={{ color: theme.primary }} variant="Linear" />
            <span className="text-[10px] tracking-[0.4em] font-bold uppercase text-[var(--app-text-main)] opacity-80">{transcriptSource === "model" ? "LUCA" : "INPUT"}</span>
          </div>
          {transcript ? (
            <div className="font-display text-base sm:text-xl md:text-2xl tracking-wide font-bold leading-relaxed transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] line-clamp-3 overflow-hidden text-ellipsis">
              {transcriptSource === "model" ? <TypewriterText text={transcript} /> : `"${transcript}"`}
            </div>
          ) : (
            <div className="text-[var(--app-text-muted)] font-mono text-[10px] sm:text-xs animate-pulse">{micAvailable ? "WAITING FOR AUDIO INPUT..." : realtimeLastError || "MICROPHONE UNAVAILABLE"}</div>
          )}
          {statusMessage && <div className="mt-3 sm:mt-4 font-mono text-[10px] sm:text-xs tracking-widest opacity-70 animate-pulse" style={{ color: themeColor }}>Voice Status: {statusMessage}</div>}
          {telemetrySummary && <div className="mt-2 font-mono text-[10px] sm:text-xs opacity-55 text-[var(--app-text-main)]">{telemetrySummary}</div>}
          {showTypedFallback && (
            <div className="pointer-events-auto mx-auto mt-5 w-full max-w-2xl text-left">
              <textarea id="voice-hud-typed-fallback" value={typedFallbackValue} onChange={(event) => onTypedFallbackChange?.(event.target.value)} rows={3} placeholder={typedFallbackPlaceholder} className="w-full resize-none rounded-xl border bg-black/20 px-4 py-3 text-sm text-white outline-none" style={{ borderColor: "var(--app-border-main)" }} />
            </div>
          )}
          {(onRequestMic || onContinue || onBack) && (
            <div className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-3">
              {onBack && <button type="button" onClick={onBack} className="rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ borderColor: `${themeColor}88` }}>Back / Change mode</button>}
              {onRequestMic && <button type="button" onClick={onRequestMic} className="rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ borderColor: `${themeColor}88` }}>Enable microphone</button>}
              {onContinue && <button type="button" onClick={onContinue} className="rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ borderColor: `${themeColor}88` }}>Continue</button>}
            </div>
          )}
        </div>
      </div>

      {showTechnicalPanels && (
        <div className="absolute left-16 bottom-[15%] hidden md:flex flex-col gap-4 w-64 font-mono text-[10px] z-10 pointer-events-none">
          <div className="flex items-center gap-2 font-bold border-b pb-2 mb-2" style={{ color: themeColor, borderColor: `${themeColor}4D` }}><Icon name="Programming" size={14} variant="Linear" /> ACTIVE PROTOCOLS</div>
          <div className="space-y-3 text-[var(--app-text-muted)]">
            {dynamicProtocols.map((proto, i) => <div key={i} className="group flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"><div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} /><span>&quot;{proto}&quot;</span></div>)}
            <div className="text-[8px] opacity-30 pt-2">...AND {Math.max(0, totalToolCount - dynamicProtocols.length)} MORE MODULES</div>
          </div>
        </div>
      )}
      {showTechnicalPanels && (
        <div className="absolute right-16 bottom-[15%] hidden md:flex flex-col gap-2 w-80 font-mono text-[10px] text-right z-30 pointer-events-auto">
          <div className="font-bold mb-2" style={{ color: themeColor }}>TELEMETRY STREAM</div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>ACTIVE_MODEL</span><span className="text-[var(--app-text-main)] font-bold">{(technicalModelName || modelName).toUpperCase()}</span></div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>RESPONSE_CLASS</span><span className="text-[var(--app-text-main)] font-bold">{(speedLabel || "Awaiting response").toUpperCase()}</span></div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>LOCAL_CORE</span><span className="text-[var(--app-text-main)] font-bold">{(localCoreLabel || "Unknown").toUpperCase()}</span></div>
          {localCoreReadinessReason ? <div className="flex justify-end items-start gap-2 text-[var(--app-text-muted)]"><span>LOCAL_CORE_DETAIL</span><span className="max-w-[180px] text-right text-[var(--app-text-main)] opacity-80">{localCoreReadinessReason}</span></div> : null}
          <div className="mt-2 flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>ROUTING_HEALTH</span><span className="text-[var(--app-text-main)] font-bold">{routingHealth}</span></div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>NEXT_ROUTE</span><span className="text-[var(--app-text-main)] font-bold">{routeRecommendation.recommendedRouteKind}</span></div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>ROUTE_CONFIDENCE</span><span className="text-[var(--app-text-main)] font-bold">{routeRecommendation.confidence}</span></div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>AUDIO_INPUT_DB</span><span className="text-[var(--app-text-main)] font-bold">{realDB.toFixed(0)} dB</span><div className="w-12 h-1 bg-slate-800 rounded overflow-hidden"><div className="h-full" style={{ width: `${Math.max(0, ((realDB + 60) / 60) * 100)}%`, backgroundColor: themeColor }} /></div></div>
          <div className="flex justify-end items-center gap-2 text-[var(--app-text-muted)]"><span>DOMINANT_FREQ</span><span className="text-[var(--app-text-main)] font-bold">{dominantFrequency} Hz</span></div>
          <div className="mt-4 p-2 border flex items-center justify-center gap-2 glass-blur rounded-sm transition-all duration-500" style={{ borderColor: hasMission ? `${missionColor}88` : "rgba(239, 68, 68, 0.3)", backgroundColor: hasMission ? `${missionColor}22` : "rgba(127, 29, 29, 0.1)", color: missionColor, boxShadow: `0 0 15px ${hasMission ? `${missionColor}44` : "rgba(239, 68, 68, 0.1)"}` }}><Icon name="ShieldAlert" size={12} className={hasMission ? "animate-pulse" : ""} variant="Linear" />{hasMission ? `MISSION ACTIVE: ${activeScope}` : "FIREWALL: SHIELD_ACTIVE"}</div>
        </div>
      )}
      <VoiceControls onSettingsClick={() => setIsSettingsOpen(true)} onToggleVideo={toggleVideo} isVideoActive={isVideoActive} onClose={onClose} persona={persona as any} theme={theme} canvasThemeColor={themeColor} hideControls={hideControls} />
      {isSettingsOpen && renderSettingsModal?.(() => setIsSettingsOpen(false))}
      <div className="absolute bottom-4 md:bottom-8 flex flex-wrap items-center justify-center gap-3 md:gap-12 text-[8px] md:text-[10px] font-mono text-[var(--app-text-muted)] uppercase tracking-widest z-[60] pointer-events-none px-4 w-full text-center">
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="VolumeUp" size={10} className={`md:w-3 md:h-3 ${amplitude > 0.5 ? "text-[var(--app-text-main)]" : ""}`} variant="Linear" />VOL: {((amplitude > 1 ? amplitude / 255 : amplitude) * 100).toFixed(0)}%</div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="Microphone" size={10} className="animate-pulse md:w-3 md:h-3" style={{ color: themeColor }} variant="Linear" />LOW_LATENCY</div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="Eye" size={10} className={`md:w-3 md:h-3 ${isVideoActive ? theme.primary : ""}`} variant="Linear" />VISION: {isVideoActive ? "ON" : "OFF"}</div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="Zap" size={10} className="md:w-3 md:h-3" variant="Linear" />CORE: OK</div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="Activity" size={10} className="md:w-3 md:h-3" variant="Linear" />VOICE: {(realtimeStatus || "idle").toUpperCase()}</div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="ShieldTick" size={10} className="md:w-3 md:h-3" variant="Linear" />ROUTE: {(runtimeRouteHealth || "stable").toUpperCase()}{runtimeFallbackActive ? " · FALLBACK" : ""}</div>
        <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap"><Icon name="Timer1" size={10} className="md:w-3 md:h-3" variant="Linear" />RTT: {runtimeLatency ?? 0}ms</div>
        {realtimeLastError ? <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-red-400">ERR: {realtimeLastError}</div> : null}
        {!realtimeCanInterrupt ? <div className="flex items-center gap-1 md:gap-2 whitespace-nowrap text-yellow-300">INTERRUPT LOCKED</div> : null}
      </div>
    </div>
  );
}

export default VoiceHudSurface;
