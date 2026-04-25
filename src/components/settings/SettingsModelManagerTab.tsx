import React from "react";
import { Icon } from "../ui/Icon";
import { ModelManager } from "../ModelManager";

interface SettingsModelManagerTabProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  isMobile?: boolean;
}

const SettingsModelManagerTab: React.FC<SettingsModelManagerTabProps> = ({
  theme,
  isMobile,
}) => {
  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} mt-2`}>
      <div className={`flex items-center gap-2 mb-2 p-2 ${isMobile ? "border-x-0 rounded-none bg-white/5" : "rounded bg-black/20 border"} border-white/5`}>
        <Icon name="Sliders" className="w-3 h-3" style={{ color: theme.hex }} />
        <h5
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--app-text-muted)" }}
        >
          Response Dynamic Controls
        </h5>
      </div>

      <ModelManager theme={theme} isMobile={isMobile} />

      <div 
        className="text-[10px] font-mono mt-4 p-3 border rounded-lg uppercase tracking-tight transition-all"
        style={{
          backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? "rgba(248,250,252,1)" : "rgba(0,0,0,0.2)",
          borderColor: theme.themeName?.toLowerCase() === "lucagent" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.05)",
          color: "var(--app-text-muted)"
        }}
      >
        Luca leverages local GGUF and ONNX models for offline operation.
        Downloaded models are stored in the application data directory.
      </div>
    </div>
  );
};

export default SettingsModelManagerTab;
