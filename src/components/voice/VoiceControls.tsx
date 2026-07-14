import React from "react";
import { Icon } from "../ui/Icon";
import type { PersonaType } from "../../services/lucaService";
import { LucaLiquidGlassLayer } from "../material/LucaLiquidGlass";

interface VoiceControlsProps {
  onSettingsClick: () => void;
  onToggleVideo: () => void;
  isVideoActive: boolean;

  onClose: () => void;
  persona: PersonaType;
  theme: {
    primary: string;
    border: string;
    bg: string;
    themeName: string;
  };
  canvasThemeColor: string;
  hideControls?: boolean; // Hide settings and camera for onboarding
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  onSettingsClick,
  onToggleVideo,
  isVideoActive,

  onClose,
  canvasThemeColor,
  hideControls = false, // Default to false (show controls)
}) => {
  return (
    <div className="absolute top-0 left-0 w-full p-3 sm:p-4 md:p-8 flex justify-between items-start z-[100] pointer-events-none">
      {/* Header Info */}
      <div className="flex flex-col gap-1 md:gap-2 pointer-events-auto max-w-[60%]">
        <h2
          className="font-display text-xl md:text-3xl text-[var(--luca-text-primary)] tracking-[0.1em] md:tracking-[0.2em] font-bold flex items-center gap-2 md:gap-3"
        >
          <Icon
            name="Activity"
            className="animate-pulse w-5 h-5 md:w-6 md:h-6"
            style={{ color: canvasThemeColor }}
          />
          LUCA
          <span style={{ color: canvasThemeColor }}>OS</span>
        </h2>
        <div
          className="text-[8px] md:text-[10px] font-mono opacity-80 flex flex-col md:flex-row gap-1 md:gap-6 pl-1"
          style={{ color: canvasThemeColor }}
        >
          <span className="flex items-center gap-2">
            <Icon name="Cpu" size={10} className="md:w-3 md:h-3" /> LUCA CORE: ONLINE
          </span>
          <span className="flex items-center gap-2 text-[var(--luca-success,#4fbf7a)]">
            <Icon name="Radio" size={10} className="md:w-3 md:h-3" /> VAD: LIVEKIT TUNED
          </span>
          <span className="flex items-center gap-2 text-[var(--luca-success,#4fbf7a)]">
            <Icon name="Lock" size={10} className="md:w-3 md:h-3" /> ENCRYPTION: AES-256
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex max-[560px]:flex-col gap-1.5 sm:gap-2 md:gap-4 pointer-events-auto">
        {!hideControls && (
          <>
            <button
              onClick={onSettingsClick}
              className="luca-liquid-glass-control cursor-pointer group p-2.5 sm:p-3 md:p-4 rounded-full border text-[var(--luca-text-secondary)] hover:text-[var(--luca-text-primary)] transition-all"
              style={{
                backgroundColor: "var(--luca-surface-glass)",
                borderColor:
                  "color-mix(in srgb, var(--luca-accent-primary) 28%, transparent)",
              }}
              title="Voice Settings"
            >
              <Icon name="Settings" size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <LucaLiquidGlassLayer shape="circle" depth="standard" />
            </button>
            <button
              onClick={onToggleVideo}
              className="luca-liquid-glass-control cursor-pointer group p-2.5 sm:p-3 md:p-4 rounded-full border transition-all"
              style={{
                backgroundColor: isVideoActive
                  ? "var(--luca-accent-soft)"
                  : "var(--luca-surface-glass)",
                borderColor:
                  "color-mix(in srgb, var(--luca-accent-primary) 28%, transparent)",
                color: isVideoActive
                  ? "var(--luca-accent-primary)"
                  : "var(--luca-text-secondary)",
              }}
              title="Toggle Vision"
            >
              <Icon name="Camera" size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
              {isVideoActive && (
                <div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-[var(--luca-accent-primary)] whitespace-nowrap"
                >
                  VISION ON
                </div>
              )}
              <LucaLiquidGlassLayer shape="circle" depth={isVideoActive ? "quiet" : "standard"} />
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="luca-liquid-glass-control cursor-pointer group p-2.5 sm:p-3 md:p-4 rounded-full border text-[var(--luca-text-secondary)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] hover:text-[var(--luca-text-primary)] transition-all z-[110]"
          style={{
            backgroundColor: "var(--luca-surface-glass)",
            borderColor:
              "color-mix(in srgb, var(--luca-accent-primary) 28%, transparent)",
          }}
          title="Terminate Voice Uplink"
        >
          <Icon
            name="CloseCircle"
            size={18}
            className="text-slate-400 group-hover:text-white sm:w-5 sm:h-5 md:w-6 md:h-6"
          />
          <LucaLiquidGlassLayer shape="circle" depth="quiet" />
        </button>
      </div>
    </div>
  );
};

export default VoiceControls;
