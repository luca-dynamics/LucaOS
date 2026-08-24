import React, { useEffect, useState } from "react";
import pkg from "../../../package.json";
import { LucaSettings } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";
import { localModelLibrary as modelManagerService } from "../../services/local-models/LocalModelLibrary";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
} from "./SettingsLayout";

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
  const [systemSpecs, setSystemSpecs] = useState<any>({
    cpu: "...",
    gpu: "...",
    memory: { total: 0 },
  });

  useEffect(() => {
    const mems = memoryService.getAllMemories();
    setMemoryCount(mems.length);
    memoryService.checkCortexHealth().then(setCortexOnline);
    modelManagerService.getSystemSpecs().then(setSystemSpecs);
  }, []);

  const electronVersion =
    typeof process !== "undefined" && process.versions?.electron
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
        description="Simple version, channel, update, and release-note information."
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
              value: "Local / Web",
              detail: "Runtime is detected by the current shell.",
            },
            {
              label: "Update status",
              value: "Manual",
              detail: "Release notes remain available through project updates.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="System Info"
        description="Platform, runtime, device compatibility, and diagnostics summary without over-carding About."
        icon="Monitor"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="font-semibold">Runtime</p>
              <p className="text-xs opacity-70">{electronVersion}</p>
            </div>
            <div>
              <p className="font-semibold">Active brain</p>
              <p className="text-xs opacity-70">{architecture}</p>
            </div>
            <div>
              <p className="font-semibold">Cortex</p>
              <p className="text-xs opacity-70">
                {cortexOnline ? "Online" : "Offline"}
              </p>
            </div>
            <div>
              <p className="font-semibold">Memory facts</p>
              <p className="text-xs opacity-70">{memoryCount}</p>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Legal & Trust"
        description="Privacy policy, terms, licenses, and acknowledgements."
        icon="ShieldCheck"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Privacy policy"
          description="Review how Luca handles local and connected data."
        />
        <SettingsRow
          label="Terms"
          description="Project terms and usage boundaries."
        />
        <SettingsRow
          label="Licenses"
          description="Open-source licenses and third-party acknowledgements."
        />
        <SettingsRow
          label="Acknowledgements"
          description="Credits for LucaOS dependencies and contributors."
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Copy diagnostics, export logs, and build metadata."
      >
        <SettingsRow
          label="Copy diagnostics"
          description={`CPU: ${systemSpecs.cpu || "unknown"} • GPU: ${systemSpecs.gpu || "unknown"}`}
        />
        <SettingsRow
          label="Export logs"
          description="Log export continues through the existing diagnostics surfaces."
        />
        <SettingsRow
          label="Build metadata"
          description={`Version ${version} • Runtime ${electronVersion}`}
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsAboutTab;
