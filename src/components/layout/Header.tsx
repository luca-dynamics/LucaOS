import React from "react";
import { Icon } from "../ui/Icon";
// Holographic icon removed in favor of static branding
import AmbientVisionIndicator from "../AmbientVisionIndicator";
import AlwaysOnControls from "../AlwaysOnControls";
import { awarenessService } from "../../services/awarenessService";
import { liveService } from "../../services/liveService";
import { soundService } from "../../services/soundService";
import { useCredits } from "../../hooks/useCredits";

interface HeaderProps {
  theme: any;
  persona: string;
  isMobile: boolean;
  handleCyclePersona: () => void;
  isRebooting: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setIsSettingsOpen: (open: boolean) => void;
  isAdminMode: boolean;
  ambientVisionActive: boolean;
  setAmbientVisionActive: (active: boolean) => void;
  showVoiceHud: boolean;
  setAmbientSuggestions: (suggestions: any[]) => void;
  setShowSuggestionChips: (show: boolean) => void;
  hostPlatform: string;
  isListeningAmbient: boolean;
  isProcessing: boolean;
  audioMonitoringActive: boolean;
  setAudioMonitoringActive: (active: boolean) => void;
  setVisionMonitoringActive: (active: boolean) => void;
  isWakeWordActive: boolean;
  isLockdown?: boolean;
  connectionTier?: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
}

const Header: React.FC<HeaderProps> = ({
  theme,
  persona,
  isMobile,
  handleCyclePersona,
  isRebooting,
  handleKeyDown,
  setIsSettingsOpen,
  isAdminMode,
  ambientVisionActive,
  setAmbientVisionActive,
  showVoiceHud,
  setAmbientSuggestions,
  setShowSuggestionChips,
  hostPlatform,
  isListeningAmbient,
  isProcessing,
  audioMonitoringActive,
  setAudioMonitoringActive,
  setVisionMonitoringActive,
  isWakeWordActive,
  isLockdown,
  connectionTier = "LOCAL",
}) => {
  const credits = useCredits();

  return (
    <header
      id="app-header"
      className={`${isMobile ? "h-16 pl-3 pr-2" : "h-20 pl-6 pr-6"} glass-blur tech-border flex items-center justify-between z-50 shadow-lg transition-all duration-500 relative drag`}
      style={{
        borderBottom: `1px solid var(--app-border-main, rgba(255, 255, 255, 0.1))`,
        backgroundColor: "var(--app-bg-tint, rgba(0, 0, 0, 0.4))",
        color: "var(--app-text-main, #ffffff)"
      }}
    >
      <div className={`flex items-center gap-3 app-region-no-drag`}>
        {/* Holographic Face Icon - 3D with Theme Colors */}
        <div
          className={`relative ${
            isMobile ? "w-10 h-10" : "w-14 h-14"
          } group cursor-pointer flex items-center justify-center`}
          onClick={() => soundService.play("HOVER")}
        >
          <img
            src={
              theme.themeName?.toLowerCase() === "lucagent"
                ? "/icon_dark.png"
                : "/icon.png"
            }
            alt="Luca Logo"
            className="w-full h-full object-contain filter drop-shadow-md brightness-110 transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        <div
          className={`flex flex-col justify-center flex-1 min-w-0 ${isMobile ? "pt-5" : ""}`}
        >
          <h1
            className={`font-display ${
              isMobile ? "text-lg" : "text-3xl"
            } font-black ${
              isMobile ? "tracking-[0.1em]" : "tracking-[0.2em]"
            } uppercase italic transition-colors duration-500 leading-none flex items-center gap-2 whitespace-nowrap ${isMobile ? "" : "gap-4"}`}
            style={{ color: "var(--app-text-main, #ffffff)" }}
          >
            L.U.C.A OS
            <span className="inline-flex items-center gap-3 ml-2">
              {persona === "ENGINEER" && (
                <Icon
                  name="Programming"
                  size={isMobile ? 18 : 22}
                  variant="Linear"
                  className="opacity-80 transition-opacity group-hover:opacity-100"
                />
              )}
              {persona === "ASSISTANT" && (
                <Icon
                  name="MagicStick"
                  size={isMobile ? 18 : 22}
                  variant="Linear"
                  className="opacity-80 transition-opacity group-hover:opacity-100"
                />
              )}
              {persona === "HACKER" && (
                <Icon
                  name="Shield"
                  size={isMobile ? 18 : 22}
                  variant="Linear"
                  color="#22c55e"
                  className="opacity-80 transition-opacity group-hover:opacity-100"
                />
              )}
            </span>
          </h1>

          <div
            className={`flex items-center ${
              isMobile ? "gap-2" : "gap-4"
            } ${isMobile ? "mt-[-2px]" : "mt-[-6px]"}`}
          >
            {/* CLICKABLE PERSONA SWITCHER */}
            <button
              onClick={handleCyclePersona}
              disabled={isRebooting}
              onKeyDown={handleKeyDown}
              className={`${isMobile ? "text-[10px]" : "text-[9px]"} font-bold ${
                isMobile ? "tracking-[0.1em]" : "tracking-[0.4em]"
              } opacity-70 flex items-center gap-1.5 hover:text-[var(--app-text-main)] transition-all ${
                isRebooting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } select-none group`}
              style={{ color: "var(--app-text-muted, rgba(255, 255, 255, 0.7))" }}
              title={
                isRebooting
                  ? "Rebooting... Please wait"
                  : "Click to Switch Persona"
              }
            >
              <span
                className={`whitespace-nowrap ${
                  isMobile ? "group-hover:underline" : "group-hover:underline"
                }`}
              >
                <span>STATUS: </span>
                {persona === "RUTHLESS"
                  ? isLockdown
                    ? "LOCKDOWN"
                    : "RUTHLESS"
                  : persona}
              </span>
              <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
            </button>

            {/* SETTINGS BUTTON */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Open Settings"
              className={`flex items-center gap-2 ${
                isMobile
                  ? "p-2 rounded-full"
                  : "px-3 py-1.5 rounded-full"
              } transition-all group border glass-blur`}
              style={{ 
                backgroundColor: "var(--app-bg-tint, rgba(0, 0, 0, 0.3))",
                borderColor: "var(--app-border-main, rgba(255, 255, 255, 0.1))",
                color: "var(--app-text-muted, #94a3b8)"
              }}
            >
              <Icon
                name="Settings"
                size={isMobile ? 20 : 14}
                variant="Linear"
                className="group-hover:rotate-90 transition-transform"
              />
              {!isMobile && (
                <span className="text-[10px] font-bold tracking-widest hidden group-hover:block">
                  CONFIG
                </span>
              )}
            </button>

            {/* SOVEREIGN WALLET INDICATOR */}
            {!isMobile && (
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all group cursor-default glass-blur"
                style={{ 
                  backgroundColor: "var(--app-bg-tint, rgba(0, 0, 0, 0.3))",
                  borderColor: "var(--app-border-main, rgba(255, 255, 255, 0.1))"
                }}
              >
                <Icon
                  name="Wallet"
                  size={14}
                  variant="Linear"
                  color={
                    credits.status === "CRITICAL"
                      ? "#ef4444"
                      : credits.status === "LOW"
                        ? "#f59e0b"
                        : "#10b981"
                  }
                  className={credits.status === "CRITICAL" ? "animate-pulse" : ""}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span
                      className={`text-[10px] font-black tracking-widest`}
                      style={{ color: credits.status === "CRITICAL" ? "#ef4444" : "var(--app-text-main)" }}
                    >
                      {credits.isLocal
                        ? "FREE"
                        : credits.isBYOK
                          ? "BYOK"
                          : `FUEL: ${Math.floor(credits.balance)}`}
                    </span>
                    {!credits.isLocal && !credits.isBYOK && (
                      <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            credits.status === "CRITICAL"
                              ? "bg-red-500"
                              : credits.status === "LOW"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (credits.balance / 1000) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-[7px] font-bold opacity-40 uppercase tracking-[0.2em] mt-0.5">
                    Sovereign Wallet
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`flex items-center ${isMobile ? "gap-4" : "gap-8"} ${
          isMobile ? "text-[10px]" : "text-[10px]"
        } font-bold ${
          isMobile ? "tracking-widest" : "tracking-widest"
        } opacity-80 app-region-no-drag`}
      >
        {/* ADMIN INDICATOR - Hidden on mobile for requested clean look */}
        {isAdminMode && !isMobile && (
          <div className="flex items-center gap-2 px-2 py-1 text-red-500 animate-pulse font-bold border border-red-500 rounded bg-red-950/30 shadow-[0_0_10px_red]">
            <Icon name="Shield" size={12} color="#ef4444" variant="Linear" /> ROOT ACCESS
          </div>
        )}

        {/* AMBIENT VISION INDICATOR - Hidden on mobile as requested */}
        {!isMobile && (
          <AmbientVisionIndicator
            active={ambientVisionActive}
            onToggle={() => {
              if (ambientVisionActive) {
                awarenessService.stopAmbientVisionLoop();
                setAmbientVisionActive(false);
              } else {
                awarenessService.startAmbientVisionLoop({
                  mode: showVoiceHud ? "voice" : "text",
                  persona,
                  onScreenCapture: (base64) => {
                    liveService.sendVideoFrame(base64);
                    liveService.sendText(
                      "[AMBIENT VISION] I just scanned the screen. Describe what you see briefly and suggest if there is anything you can help with. Keep it to 1-2 sentences.",
                    );
                  },
                  onSuggestionsUpdate: (suggestions) => {
                    setAmbientSuggestions(suggestions);
                    setShowSuggestionChips(true);
                  },
                  onStatusChange: (active) => setAmbientVisionActive(active),
                });
              }
            }}
            theme={theme}
            isMobile={isMobile}
          />
        )}

        <div 
          className="flex items-center gap-2 uppercase"
          style={{ color: "var(--app-text-muted, #94a3b8)" }}
        >
          <Icon name="Monitor" size={isMobile ? 12 : 14} variant="Linear" />
          <span>HOST: </span>
          {
            hostPlatform
              .replace(/\(.*\)/, "")
              .trim()
              .split(" ")[0]
          }
        </div>
        {isListeningAmbient && (
          <div className="flex items-center gap-2 text-rq-red animate-pulse">
            <Icon name="Pulse" size={14} variant="Linear" color="#ff0000" />
            <span className="hidden sm:inline">SENSORS_ACTIVE</span>
          </div>
        )}

        {/* CORE STATUS - TIER Aware */}
        <div
          className="flex items-center gap-2 transition-colors"
          style={{ 
            color: connectionTier === "OFFLINE" 
              ? "var(--app-text-muted, #64748b)" 
              : connectionTier === "CLOUD" 
                ? "#3b82f6" 
                : "#22c55e"
          }}
          title={`Connection Tier: ${connectionTier}`}
        >
          {connectionTier === "OFFLINE" ? (
            <Icon name="CloseCircle" size={isMobile ? 12 : 14} color="currentColor" />
          ) : connectionTier === "CLOUD" ? (
            <Icon name="Cloud" size={isMobile ? 12 : 14} color="currentColor" variant="Linear" />
          ) : (
            <Icon name="Server" size={isMobile ? 12 : 14} color="currentColor" variant="Linear" />
          )}
          <span>CORE: </span>
          {connectionTier === "LAN"
            ? "LAN"
            : connectionTier === "LOCAL"
              ? (window as any).luca
                ? "NATIVE"
                : "LINKED"
              : connectionTier === "CLOUD"
                ? "CLOUD"
                : "OFFLINE"}
        </div>

        {/* LUCA_LOAD - Hidden on mobile for cleaner look */}
        {!isMobile && (
          <div 
            className="flex items-center gap-2"
            style={{ color: "var(--app-text-main, #ffffff)" }}
          >
            <Icon name="Cpu" size={isMobile ? 12 : 14} variant="Linear" />
            <span>LOAD: </span>
            {isProcessing ? "98%" : "12%"}
            {audioMonitoringActive && !isMobile && (
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold animate-pulse"
                style={{ 
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  color: "#10b981"
                }}
              >
                <Icon name="Microphone" size={10} variant="Linear" />
                <span>LIVE EAR</span>
              </div>
            )}
          </div>
        )}

        {/* Always-On Monitoring Controls - Hidden on mobile as requested */}
        {!isMobile && (
          <AlwaysOnControls
            onVisionToggle={(active) => setVisionMonitoringActive(active)}
            onAudioToggle={(active) => setAudioMonitoringActive(active)}
            isMobile={isMobile}
            isWakeWordActive={isWakeWordActive}
            theme={theme}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
