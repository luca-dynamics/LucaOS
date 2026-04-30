import React from "react";
import { Database } from "lucide-react";
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
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4" style={{ color: theme.hex }} />
        <h4
          className={`text-[11px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-widest`}
        >
          Model Inventory & Downloads
        </h4>
      </div>

      <ModelManager theme={theme} />

      <div className="text-[9px] text-gray-600 font-mono mt-4 p-3 border border-white/5 bg-black/20 rounded-lg uppercase tracking-tight">
        Luca leverages local GGUF and ONNX models for offline operation.
        Downloaded models are stored in the application data directory.
      </div>
    </div>
  );
};

export default SettingsModelManagerTab;
