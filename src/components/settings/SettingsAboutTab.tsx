import React, { useEffect, useState } from "react";
import pkg from "../../../package.json";
import { LucaSettings } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";
import { modelManagerService } from "../../services/local-models/LocalModelLibrary";
import {
  SettingsAdvancedDisclosure,
  SettingsSection,
  SettingsStatList,
} from "./SettingsLayout";
import {
  buildAboutHardwareStats,
  type AboutSystemSpecs,
} from "./settingsAboutHardware";

interface SettingsAboutTabProps {
  theme?: any;
  settings: LucaSettings;
  isMobile?: boolean;
}

const SettingsAboutTab: React.FC<SettingsAboutTabProps> = ({
  settings,
  theme,
  isMobile,
}) => {
  const version = pkg?.version || "1.0.0";
  const [memoryCount, setMemoryCount] = useState(0);
  const [cortexOnline, setCortexOnline] = useState(false);
  const [systemSpecs, setSystemSpecs] = useState<AboutSystemSpecs>({});

  useEffect(() => {
    const mems = memoryService.getAllMemories();
    setMemoryCount(mems.length);
    memoryService.checkCortexHealth().then(setCortexOnline);
    modelManagerService.getSystemSpecs().then((specs) => {
      if (specs) setSystemSpecs(specs);
    });
  }, []);

  const isDesktop =
    typeof process !== "undefined" && Boolean(process.versions?.electron);
  const electronVersion = isDesktop
    ? `v${process.versions.electron}`
    : "Web Relay";

  const activeModel = settings.brain.model;
  const architecture =
    activeModel
      .split("/")
      .pop()
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) || "Gemini 3 Flash";

  return (
    <div className={`space-y-6 py-2 ${isMobile ? "px-0" : ""}`}>
      <SettingsSection
        title="LucaOS Version"
        description="Version and release channel for this install."
        icon="Info"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "App version",
              value: `v${version}`,
              detail: "LucaOS application package version.",
            },
            {
              label: "Build channel",
              value: isDesktop ? "Desktop" : "Web relay",
              detail: isDesktop
                ? `Electron shell ${electronVersion}.`
                : "Running in a browser against a remote core.",
            },
            {
              label: "Updates",
              value: "Manual",
              detail: "This build does not self-update.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="System Info"
        description="Runtime, active brain, and local intelligence status."
        icon="Monitor"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          columns={2}
          items={[
            {
              label: "Runtime",
              value: electronVersion,
              detail: "Shell hosting the renderer.",
            },
            {
              label: "Active brain",
              value: architecture,
              detail: activeModel,
            },
            {
              label: "Cortex",
              value: cortexOnline ? "Online" : "Offline",
              detail: "Local Python intelligence service.",
            },
            {
              label: "Memory facts",
              value: memoryCount,
              detail: "Facts Luca currently remembers about you.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Hardware and build metadata for diagnostics."
      >
        <SettingsStatList
          columns={2}
          items={buildAboutHardwareStats(systemSpecs, {
            version,
            runtime: electronVersion,
          })}
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsAboutTab;
