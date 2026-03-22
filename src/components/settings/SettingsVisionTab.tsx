import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";
const {
  Eye,
  Sparkles,
} = LucideIcons as any;
import { LucaSettings } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";

interface SettingsVisionTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
}

const SettingsVisionTab: React.FC<SettingsVisionTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  const [localVisionModels, setLocalVisionModels] = useState<LocalModel[]>([]);

  useEffect(() => {
    const loadLocalModels = async () => {
      const models = await modelManager.getModels();
      setLocalVisionModels(
        models.filter((m) => m.category === "vision" && m.status === "ready"),
      );
    };
    loadLocalModels();

    const unsubscribe = modelManager.subscribe((allModels) => {
      setLocalVisionModels(
        allModels.filter(
          (m) => m.category === "vision" && m.status === "ready",
        ),
      );
    });
    return () => unsubscribe();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6 max-h-[420px] pr-2 mt-2">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Vision Engine Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: theme.hex }} />
          <h4
            className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-widest`}
          >
            Vision Configuration
          </h4>
        </div>

        {/* Vision Card */}
        <motion.div
          variants={item}
          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light" : "glass-panel"} tech-border p-4 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <Eye className="w-4 h-4" style={{ color: theme.hex }} />
            <div className="text-[9px] font-mono text-gray-500 uppercase">
              Vision & Multimodal
            </div>
          </div>
          <div className="space-y-1">
            <div
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-tighter`}
            >
              Vision Engine
            </div>
            <p className="text-[9px] text-gray-500 leading-tight">
              Controls screenshots, screen analysis, and spatial reasoning.
            </p>
            <select
              value={settings.brain.visionModel || "gemini-3-flash-preview"}
              onChange={(e) => onUpdate("brain", "visionModel", e.target.value)}
              className={`w-full ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 text-gray-900" : "bg-black/40 border-white/10 text-white"} rounded-lg p-2 text-xs outline-none transition-colors`}
            >
              <optgroup label="Cloud Vision (Managed)">
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
              </optgroup>
              {localVisionModels.length > 0 && (
                <optgroup label="Local Vision (Offline)">
                  {localVisionModels.map((m) => {
                    const isIntelMac = (window as any).luca?.isIntelMac;
                    const isWindows = (window as any).luca?.isWindows;
                    const isRestricted =
                      (isIntelMac || isWindows) && m.id === "ui-tars-2b";

                    return (
                      <option key={m.id} value={m.id} disabled={isRestricted}>
                        {m.name}{" "}
                        {isRestricted
                          ? "(Restricted on CPU)"
                          : `- ${m.sizeFormatted}`}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>
        </motion.div>

        {/* Vision Tips */}
        <motion.div
          variants={item}
          className="text-[10px] text-gray-500 italic p-2 bg-white/5 rounded-lg border border-white/5"
        >
          Vision models enable features like Astra Scan and agentic UI control.
          Local models like UI-TARS 2B provide the highest privacy but require
          significant GPU resources.
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsVisionTab;
