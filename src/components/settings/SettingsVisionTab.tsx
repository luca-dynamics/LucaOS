import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucaSettings } from "../../services/settingsService";
import { modelManager, LocalModel } from "../../services/ModelManagerService";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsSection,
  settingsControlInlineStyle,
  settingsSelectClassName,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

interface SettingsVisionTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  isMobile?: boolean;
}

const SettingsVisionTab: React.FC<SettingsVisionTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
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

  const selectedVisionModel =
    settings.brain.visionModel || "gemini-3-flash-preview";
  const selectedLocalModel = localVisionModels.find(
    (model) => model.id === selectedVisionModel,
  );

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} mt-2`}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={item}>
          <SettingsSection
            title="Vision Awareness"
            description="Choose how Luca sees and understands your screen."
            icon="Eye"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <SettingsCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: settingsSurfaceTokens.textSecondary }}
                  >
                    Active vision engine
                  </p>
                  <p
                    className="mt-1 text-lg font-semibold"
                    style={{ color: settingsSurfaceTokens.textPrimary }}
                  >
                    {selectedLocalModel?.name ?? selectedVisionModel}
                  </p>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  >
                    Controls screenshots, screen analysis, and spatial
                    reasoning.
                  </p>
                </div>
                <span
                  className="mt-1 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.hex }}
                />
              </div>
            </SettingsCard>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsSection
            title="Vision Engine"
            description="Select the model Luca uses for visual understanding."
            icon="Sparkles"
            accentColor={theme.hex}
            isMobile={isMobile}
          >
            <SettingsCard>
              <label
                className="text-sm font-medium"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                Model Selection
              </label>
              <select
                value={selectedVisionModel}
                onChange={(e) =>
                  onUpdate("brain", "visionModel", e.target.value)
                }
                className={`${settingsSelectClassName} mt-2`}
                style={settingsControlInlineStyle}
              >
                <optgroup label="Cloud Vision (Managed)">
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                </optgroup>
                {localVisionModels.length > 0 && (
                  <optgroup label="Local Vision (Offline)">
                    {localVisionModels.map((m: LocalModel) => {
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
            </SettingsCard>
          </SettingsSection>
        </motion.div>

        <motion.div variants={item}>
          <SettingsAdvancedDisclosure
            title="Advanced Vision Details"
            description="Raw model notes, local restrictions, GPU guidance, and performance considerations."
          >
            <div className="space-y-2 text-sm leading-relaxed">
              <p style={{ color: settingsSurfaceTokens.textSecondary }}>
                Vision models enable features like Astra Scan and agentic UI
                control. Local models keep more analysis on-device but can need
                significant GPU resources.
              </p>
              <p style={{ color: settingsSurfaceTokens.textTertiary }}>
                UI-TARS 2B remains disabled on restricted CPU-only devices by
                the existing model selector logic. Current raw model ID:{" "}
                {selectedVisionModel}.
              </p>
            </div>
          </SettingsAdvancedDisclosure>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsVisionTab;
