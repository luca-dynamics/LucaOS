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
      className={`${isMobile ? "h-16 px-4" : "h-20 px-6"} glass-blur tech-border flex items-center justify-between z-50 transition-all duration-500 relative drag`}
      style={{
        backgroundColor: theme?.isLight
          ? (theme.themeName?.toLowerCase() === "lightcream"
              ? "rgba(229, 225, 205, var(--app-bg-opacity, 0.5))"
              : "rgba(255, 255, 255, var(--app-bg-opacity, 0.5))")
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))",
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
              isMobile ? "text-lg" : "text-xl"
            } font-black ${
              isMobile ? "tracking-[0.1em]" : "tracking-[0.4em]"
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
                <span>MODE: </span>
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
                  ? "p-2 rounded-full sm:px-3 sm:py-1.5"
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
                size={isMobile ? (isMobile && window.innerWidth >= 640 ? 14 : 20) : 14}
                variant="Linear"
                className="group-hover:rotate-90 transition-transform"
              />
              <span className={`text-[10px] font-bold tracking-widest ${isMobile ? "hidden sm:inline" : "hidden group-hover:block"}`}>
                SETTINGS
              </span>
            </button>


          </div>
        </div>
      </div>

      <div
        className={`flex items-center ${isMobile ? "gap-1.5 sm:gap-2.5" : "gap-8"} ${
          isMobile ? "text-[9px] sm:text-[10px]" : "text-[10px]"
        } font-bold ${
          isMobile ? "tracking-tight sm:tracking-widest" : "tracking-widest"
        } opacity-80 app-region-no-drag`}
      >
        {/* SOVEREIGN WALLET INDICATOR */}
        <div 
          className={`${isMobile ? "hidden sm:flex" : "flex"} items-center gap-3 px-4 py-2 rounded-full border transition-all group cursor-default glass-blur w-fit h-[44px]`}
          style={{ 
            backgroundColor: "var(--app-bg-tint, rgba(0, 0, 0, 0.3))",
            borderColor: "var(--app-border-main, rgba(255, 255, 255, 0.1))"
          }}
        >
          <Icon
            name="Wallet"
            size={18}
            variant="Linear"
            color={
              credits.status === "CRITICAL"
                ? (theme.themeName?.toLowerCase() === "lightcream" ? "#991b1b" : "#ef4444")
                : credits.status === "LOW"
                  ? (theme.themeName?.toLowerCase() === "lightcream" ? "#92400e" : "#f59e0b")
                  : (theme.themeName?.toLowerCase() === "lightcream" ? "#065f46" : "#10b981")
            }
            className={credits.status === "CRITICAL" || (!credits.isLocal && !credits.isBYOK) ? "animate-pulse" : ""}
          />
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] font-mono font-black text-[var(--app-text-main)] tracking-widest uppercase opacity-70">
                CREDITS:
              </span>
              <span className="text-[12px] font-mono font-black text-[var(--app-text-main)] tracking-normal">
                {!isFinite(credits.balance) ? "∞" : Math.floor(credits.balance).toLocaleString()}
              </span>
              <div className="flex items-center">
                <span 
                  className={`text-[7px] px-1.5 py-0.5 rounded-sm font-black tracking-tighter uppercase ${
                    credits.isLocal 
                      ? (theme.themeName?.toLowerCase() === "lightcream" ? "bg-[#065f46]/10 text-[#065f46]" : "bg-emerald-500/20 text-emerald-500")
                      : credits.isBYOK 
                        ? (theme.themeName?.toLowerCase() === "lightcream" ? "bg-blue-800/10 text-blue-800" : "bg-blue-500/20 text-blue-500")
                        : (theme.themeName?.toLowerCase() === "lightcream" ? "bg-amber-800/10 text-amber-800" : "bg-amber-500/20 text-amber-500")
                  }`}
                >
                  {credits.isLocal ? "LOCAL" : credits.isBYOK ? "BYOK" : "PRIME"}
                </span>
              </div>
            </div>
            {/* TACHOMETER STYLE BAR */}
            <div className="w-full h-[2px] bg-white/5 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  credits.status === "CRITICAL"
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : credits.status === "LOW"
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                }`}
                style={{
                  width: `${!isFinite(credits.balance) ? 100 : Math.min(100, (credits.balance / 1000) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
        {/* ADMIN INDICATOR - Visible on mobile if screen is wide enough */}
        {(isAdminMode && !isMobile) || (isAdminMode && isMobile) ? (
          <div className={`${isMobile ? "hidden md:flex" : "flex"} items-center gap-2 px-2 py-1 ${theme.themeName?.toLowerCase() === "lightcream" ? "text-red-900 border-red-900/40 bg-red-800/5 shadow-none" : "text-red-500 animate-pulse border-red-500 bg-red-950/30 shadow-[0_0_10px_red]"} font-bold border rounded`}>
            <Icon name="Shield" size={12} color={theme.themeName?.toLowerCase() === "lightcream" ? "#991b1b" : "#ef4444"} variant="Linear" /> <span className="text-[9px]">ADMIN MODE</span>
          </div>
        ) : null}

        {/* AMBIENT VISION INDICATOR - Visible on sm: screens and up */}
        <div className={isMobile ? "hidden sm:block" : "block"}>
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
        </div>

        <div 
          className="flex items-center gap-2 uppercase"
          style={{ color: "var(--app-text-muted, #94a3b8)" }}
        >
          <Icon name="Monitor" size={isMobile ? 12 : 14} variant="Linear" />
          <span className={isMobile ? "hidden sm:inline" : "inline"}>HOST: </span>
          <span className="truncate">
            {
              hostPlatform
                .replace(/\(.*\)/, "")
                .trim()
                .split(" ")[0]
            }
          </span>
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
                ? (theme.themeName?.toLowerCase() === "lightcream" ? "#1e40af" : "#3b82f6")
                : (theme.themeName?.toLowerCase() === "lightcream" ? "#065f46" : "#22c55e")
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
          <span className={isMobile ? "hidden sm:inline" : "inline"}>LINK: </span>
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
                  backgroundColor: theme.themeName?.toLowerCase() === "lightcream" ? "rgba(6, 95, 70, 0.05)" : "rgba(16, 185, 129, 0.1)",
                  borderColor: theme.themeName?.toLowerCase() === "lightcream" ? "rgba(6, 95, 70, 0.3)" : "rgba(16, 185, 129, 0.3)",
                  color: theme.themeName?.toLowerCase() === "lightcream" ? "#065f46" : "#10b981"
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
