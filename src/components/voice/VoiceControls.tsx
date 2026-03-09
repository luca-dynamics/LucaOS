import React from "react";
import { Settings, Camera, X, Activity, Cpu, Radio, Lock } from "lucide-react";
import { PersonaType } from "../../services/lucaService";

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
  theme,
  canvasThemeColor,
  hideControls = false, // Default to false (show controls)
}) => {
  return (
    <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-[100] pointer-events-none">
      {/* Header Info */}
      <div className="flex flex-col gap-1 md:gap-2 pointer-events-auto max-w-[60%]">
        <h2
          className={`font-display text-xl md:text-3xl ${
            theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"
          } tracking-[0.1em] md:tracking-[0.2em] font-bold flex items-center gap-2 md:gap-3`}
        >
          <Activity
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
            <Cpu size={10} className="md:w-3 md:h-3" /> LUCA CORE: ONLINE
          </span>
          <span className="flex items-center gap-2 text-green-400">
            <Radio size={10} className="md:w-3 md:h-3" /> VAD: LIVEKIT TUNED
          </span>
          <span className="flex items-center gap-2 text-green-400">
            <Lock size={10} className="md:w-3 md:h-3" /> ENCRYPTION: AES-256
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 md:gap-4 pointer-events-auto">
        {!hideControls && (
          <>
            <button
              onClick={onSettingsClick}
              className={`cursor-pointer group p-3 md:p-4 rounded-full border ${
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "border-slate-900/10 bg-white/60 text-slate-900 hover:bg-white/80"
                  : "border-white/10 bg-black/60 text-slate-400 hover:text-white"
              } transition-all backdrop-blur-sm`}
              title="Voice Settings"
            >
              <Settings size={20} className="md:w-6 md:h-6" />
            </button>
            <button
              onClick={onToggleVideo}
              className={`cursor-pointer group p-3 md:p-4 rounded-full border transition-all ${
                isVideoActive
                  ? `${theme.bg} ${theme.border} ${theme.primary}`
                  : theme.themeName?.toLowerCase() === "lucagent"
                    ? "border-sky-900/10 bg-white/40 text-sky-900 hover:bg-white/60"
                    : "bg-black/40 border-white/10 hover:bg-white/10 text-slate-400"
              }`}
              title="Toggle Vision"
            >
              <Camera size={20} className="md:w-6 md:h-6" />
              {isVideoActive && (
                <div
                  className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono ${theme.primary} whitespace-nowrap`}
                >
                  VISION ON
                </div>
              )}
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className={`cursor-pointer group p-3 md:p-4 rounded-full border ${
            theme.themeName?.toLowerCase() === "lucagent"
              ? "border-red-900/10 bg-white/60 text-red-600 hover:bg-red-50 hover:border-red-500"
              : "border-white/10 bg-black/60 text-slate-400 hover:bg-red-900/50 hover:border-red-500 hover:text-white"
          } transition-all z-[110] backdrop-blur-sm`}
          title="Terminate Voice Uplink"
        >
          <X
            size={20}
            className="text-slate-400 group-hover:text-white md:w-6 md:h-6"
          />
        </button>
      </div>
    </div>
  );
};

export default VoiceControls;
