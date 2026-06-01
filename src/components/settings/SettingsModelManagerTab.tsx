import React from "react";
import { ModelManager } from "../ModelManager";
import RuntimeDiagnosticsPanel from "../runtime/RuntimeDiagnosticsPanel";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

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
      <SettingsSection
        title="Model Library Summary"
        description="Luca found the best local models for this device."
        icon="Cpu"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SettingsStatusCard
            label="Installed models"
            value="Managed below"
            detail="Brain, vision, voice, TTS, and memory models stay grouped by capability."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Available updates"
            value="Review in Model Manager"
            detail="Downloads and compatible upgrades remain in the model manager queue."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Storage used"
            value="Shown in model details"
            detail="Downloaded GGUF and ONNX assets remain in the application data directory."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Runtime health"
            value="See Runtime Status"
            detail="Ollama, local runtime, and CPU/GPU readiness are summarized before raw logs."
            accentColor={theme.hex}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Recommended Models"
        description="Review Luca's suggested local models for privacy, speed, multimodal work, and this device."
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            "Best for this device",
            "Best privacy model",
            "Best speed model",
            "Best multimodal model",
          ].map((label) => (
            <SettingsCard key={label}>
              <p
                className="text-sm font-semibold"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {label}
              </p>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Open the model manager below to install or switch compatible
                recommendations.
              </p>
            </SettingsCard>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Installed Models"
        description="Manage Brain, Vision, Voice/STT, TTS, and embedding models without changing runtime behavior."
        icon="Library"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <ModelManager theme={theme} isMobile={isMobile} />
      </SettingsSection>

      <SettingsSection
        title="Runtime"
        description="Confirm Ollama, local runtime, and CPU/GPU compatibility before changing low-level details."
        icon="Activity"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <RuntimeDiagnosticsPanel title="Runtime Status" />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Raw model IDs, model paths, runtime logs, force rescan, and cache cleanup stay here."
      >
        <SettingsRow
          label="Raw model IDs"
          description="Visible in the model manager for troubleshooting provider and local-runtime routing."
        />
        <SettingsRow
          label="Model paths"
          description="Downloaded models are stored in the application data directory."
        />
        <SettingsRow
          label="Runtime logs"
          description="Use runtime diagnostics above for detailed local runtime health."
        />
        <SettingsRow
          label="Force rescan / cache cleanup"
          description="Maintenance actions remain available where the existing model manager exposes them."
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsModelManagerTab;
