import React from "react";
import { Icon } from "../ui/Icon";
import { ModelManager } from "../ModelManager";

interface SettingsModelManagerTabProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
}

const SettingsModelManagerTab: React.FC<SettingsModelManagerTabProps> = ({
  theme,
}) => {
  return (
    <div className="space-y-6 max-h-[420px] pr-2 mt-2">
      <div className="flex items-center gap-2 mb-2 p-2 rounded bg-black/20 border border-white/5">
        <Icon name="Sliders" className="w-3 h-3" style={{ color: theme.hex }} />
        <h5
          className={`text-[10px] font-bold "text-[var(--app-text-muted)]" uppercase tracking-widest`}
        >
          Response Dynamic Controls
        </h5>
      </div>

      <ModelManager theme={theme} />

      <div className={`text-sm font-mono mt-4 p-3 border rounded-lg uppercase tracking-tight transition-all ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-slate-50 border-black/25 text-[var(--app-text-muted)] font-bold" : "border-white/5 bg-black/20 text-[var(--app-text-muted)]"}`}>
        Luca leverages local GGUF and ONNX models for offline operation.
        Downloaded models are stored in the application data directory.
      </div>
    </div>
  );
};

export default SettingsModelManagerTab;
