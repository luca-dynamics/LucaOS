import React from "react";
import {
  Code2,
  Sparkles,
  ShieldAlert,
  Settings,
  Monitor,
  AudioWaveform,
  Server as ServerIcon,
  Unplug,
  Cpu,
  Mic,
} from "lucide-react";
import HolographicFaceIcon from "../HolographicFaceIcon";
import AmbientVisionIndicator from "../AmbientVisionIndicator";
import AlwaysOnControls from "../AlwaysOnControls";
import { awarenessService } from "../../services/awarenessService";
import { liveService } from "../../services/liveService";
import { soundService } from "../../services/soundService";
import { setHexAlpha } from "../../config/themeColors";

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
  isLocalCoreConnected: boolean;
  isProcessing: boolean;
  audioMonitoringActive: boolean;
  setAudioMonitoringActive: (active: boolean) => void;
  setVisionMonitoringActive: (active: boolean) => void;
  isWakeWordActive: boolean;
  isLockdown?: boolean;
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
  isLocalCoreConnected,
  isProcessing,
  audioMonitoringActive,
  setAudioMonitoringActive,
  setVisionMonitoringActive,
  isWakeWordActive,
  isLockdown,
}) => {
  return (
    <header
      className={`${isMobile ? "h-24 pl-3 pr-2 pt-2" : "h-20 pl-6 pr-6"} ${
        theme.themeName === "lucagent"
          ? "glass-panel-light tech-border-light"
          : "glass-panel tech-border"
      } ${theme.primary} flex items-center ${
        isMobile ? "justify-between gap-2" : "justify-between"
      } z-50 shadow-lg transition-all duration-500 relative app-region-drag`}
      style={{
        borderBottom: `1px solid ${setHexAlpha(theme.hex, 0.2)}`,
        background:
          theme.themeName === "lucagent"
            ? "rgba(255, 255, 255, 0.5)"
            : "rgba(0, 0, 0, var(--app-bg-opacity, 0.4))",
      }}
    >
      <div
        className={`flex items-center ${
          isMobile ? "gap-1" : "gap-3"
        } app-region-no-drag`}
      >
        {/* Holographic Face Icon - 3D with Theme Colors */}
        <div
          className={`relative ${
            isMobile ? "w-12 h-12" : "w-16 h-16"
          } group cursor-pointer`}
          onClick={() => soundService.play("HOVER")}
        >
          <HolographicFaceIcon themeColor={theme.hex ?? "#3b82f6"} />
        </div>

        <div className={isMobile ? "flex-1 min-w-0" : ""}>
          <h1
            className={`font-display ${
              isMobile ? "text-xl" : "text-3xl"
            } font-black ${
              isMobile ? "tracking-[0.1em]" : "tracking-[0.2em]"
            } uppercase italic transition-colors duration-500 ${
              theme.primary
            } flex items-center gap-2 ${isMobile ? "flex-wrap" : "gap-4"}`}
          >
            L.U.C.A OS
            {!isMobile && (
              <>
                {persona === "ENGINEER" && (
                  <Code2 size={24} className="animate-pulse" />
                )}
                {persona === "ASSISTANT" && (
                  <Sparkles size={24} className="animate-pulse" />
                )}
                {persona === "HACKER" && (
                  <ShieldAlert
                    size={24}
                    className="animate-pulse text-green-500"
                  />
                )}
              </>
            )}
          </h1>

          <div
            className={`flex items-center ${
              isMobile ? "gap-0.5 flex-nowrap" : "gap-4"
            }`}
          >
            {/* CLICKABLE PERSONA SWITCHER */}
            <button
              onClick={handleCyclePersona}
              disabled={isRebooting}
              onKeyDown={handleKeyDown}
              className={`${isMobile ? "text-[8px]" : "text-[9px]"} font-bold ${
                isMobile ? "tracking-[0.2em]" : "tracking-[0.3em]"
              } flex items-center gap-1 ${
                theme.primary
              } hover:text-white transition-colors ${
                isRebooting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } select-none group`}
              title={
                isRebooting
                  ? "Rebooting... Please wait"
                  : "Click to Switch Persona"
              }
            >
              <span
                className={`${
                  isMobile ? "group-hover:underline" : "group-hover:underline"
                }`}
              >
                <span className="hidden sm:inline">STATUS: </span>
                {persona === "RUTHLESS"
                  ? isLockdown
                    ? "LOCKDOWN"
                    : "ONLINE"
                  : persona}
              </span>
              <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
            </button>

            {/* SETTINGS BUTTON */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center gap-2 ${
                isMobile
                  ? "p-1 text-slate-400 hover:text-white"
                  : "px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white"
              } transition-all group`}
              title="Open Settings"
            >
              <Settings
                size={isMobile ? 20 : 14}
                className="group-hover:rotate-90 transition-transform"
              />
              {!isMobile && (
                <span className="text-[10px] font-bold tracking-widest hidden group-hover:block">
                  CONFIG
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`flex items-center ${isMobile ? "gap-1" : "gap-8"} ${
          isMobile ? "text-[9px]" : "text-[10px]"
        } font-bold ${
          isMobile ? "tracking-tight" : "tracking-widest"
        } opacity-80 app-region-no-drag ${isMobile ? "flex-nowrap" : ""}`}
      >
        {/* ADMIN INDICATOR */}
        {isAdminMode && (
          <div
            className={`flex items-center ${
              isMobile ? "gap-0.5 px-1 py-0.5" : "gap-2 px-2 py-1"
            } text-red-500 animate-pulse font-bold border border-red-500 rounded bg-red-950/30 ${
              isMobile ? "shadow-none" : "shadow-[0_0_10px_red]"
            }`}
          >
            <ShieldAlert size={isMobile ? 10 : 12} />{" "}
            {isMobile ? "ROOT" : "ROOT ACCESS"}
          </div>
        )}

        {/* AMBIENT VISION INDICATOR */}
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

        <div
          className={`flex items-center ${
            isMobile ? "gap-0.5" : "gap-2"
          } text-slate-400 uppercase ${isMobile ? "" : "hidden md:flex"}`}
        >
          <Monitor size={isMobile ? 12 : 14} />{" "}
          <span className="hidden sm:inline">HOST: </span>
          {
            hostPlatform
              .replace(/\(.*\)/, "")
              .trim()
              .split(" ")[0]
          }
        </div>

        {isListeningAmbient && (
          <div
            className={`flex items-center ${
              isMobile ? "gap-0.5" : "gap-2"
            } text-rq-red animate-pulse`}
          >
            <AudioWaveform size={isMobile ? 12 : 14} />{" "}
            <span className="hidden sm:inline">SENSORS_</span>
            <span className="sm:hidden">MIC</span>
            <span className="hidden sm:inline">ACTIVE</span>
          </div>
        )}

        {/* LOCAL CORE STATUS - Compact on mobile */}
        <div
          className={`flex items-center ${
            isMobile ? "gap-0.5" : "gap-2"
          } transition-colors ${
            isLocalCoreConnected ? "text-green-500" : "text-slate-600"
          }`}
        >
          {isLocalCoreConnected ? (
            <ServerIcon size={isMobile ? 12 : 14} />
          ) : (
            <Unplug size={isMobile ? 12 : 14} />
          )}
          <span className="hidden sm:inline">CORE: </span>
          {isLocalCoreConnected ? "LINKED" : "OFFLINE"}
        </div>

        {/* LUCA_LOAD - Compact on mobile */}
        <div
          className={`flex items-center ${isMobile ? "gap-0.5" : "gap-2"} ${
            theme.primary
          }`}
        >
          <Cpu size={isMobile ? 10 : 14} />{" "}
          <span className="hidden sm:inline">LUCA LOAD: </span>
          {isProcessing ? "98%" : "12%"}
          {audioMonitoringActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-[10px] text-green-400 font-bold animate-pulse">
              <Mic size={10} />
              <span>LIVE EAR</span>
            </div>
          )}
        </div>
        {/* Always-On Monitoring Controls */}
        <AlwaysOnControls
          onVisionToggle={(active) => setVisionMonitoringActive(active)}
          onAudioToggle={(active) => setAudioMonitoringActive(active)}
          isMobile={isMobile}
          isWakeWordActive={isWakeWordActive}
          theme={theme}
        />
      </div>
    </header>
  );
};

export default Header;
