import React, { useMemo } from "react";
import SandboxFleetLivePanel from "../sandbox/SandboxFleetLivePanel";
import { LucaSlider } from "../ui/luca";
import { LucaSettings } from "../../services/settingsService";
import { getComputerUseSandboxPilotStatus } from "../../services/computerUse/computerUseSandboxPilot";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
  SettingsToggle,
  settingsControlInlineStyle,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

interface SettingsAutonomyTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  isMobile?: boolean;
}

const SettingsAutonomyTab: React.FC<SettingsAutonomyTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const autonomy = settings.autonomy || {
    backgroundMissionsEnabled: false,
    shadowExecutionEnabled: false,
    doubleBrainConsensus: true,
    resourceAwareThrottling: true,
    idleThresholdMinutes: 10,
  };

  const computerUse = settings.computerUse || {
    realSandboxEnabled: false,
    driverKind: "auto" as const,
    headless: true,
    enableMissionTapeSink: false,
  };

  const sandboxPilot = useMemo(
    () => getComputerUseSandboxPilotStatus({ computerUse }),
    [
      computerUse.realSandboxEnabled,
      computerUse.driverKind,
      computerUse.headless,
      computerUse.enableMissionTapeSink,
    ],
  );

  const toggle = (key: keyof typeof autonomy) => {
    onUpdate("autonomy", key, !autonomy[key]);
  };

  const updateComputerUse = (key: string, value: unknown) => {
    onUpdate("computerUse", key, value);
  };

  const setRange = (key: keyof typeof autonomy, value: number) => {
    onUpdate("autonomy", key, value);
  };

  const activeSafety = [
    autonomy.shadowExecutionEnabled,
    autonomy.doubleBrainConsensus,
    autonomy.resourceAwareThrottling,
  ].filter(Boolean).length;

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} overflow-y-auto`}>
      <SettingsSection
        title="Autonomy Status"
        description="How much Luca can currently do on your behalf."
        icon="Ghost"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Background missions",
              value: autonomy.backgroundMissionsEnabled ? "Enabled" : "Paused",
              detail: "Missions only continue while this is enabled.",
            },
            {
              label: "Idle threshold",
              value: `${autonomy.idleThresholdMinutes} min`,
              detail: "Idle time before background work may start.",
            },
            {
              label: "Safeguards",
              value: `${activeSafety}/3 active`,
              detail: "Shadow preview, consensus, and resource throttling.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Missions"
        description="Let Luca continue approved goals while you are away."
        icon="Target"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Background missions"
          description="Continue approved goals while you are idle."
          control={
            <SettingsToggle
              checked={!!autonomy.backgroundMissionsEnabled}
              onChange={() => toggle("backgroundMissionsEnabled")}
              accentColor={theme.hex}
              ariaLabel="Background missions"
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Safety Controls"
        description="Extra review passes before Luca acts autonomously."
        icon="Lock"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Shadow execution"
          description="Preview actions before Luca runs them."
          control={
            <SettingsToggle
              checked={!!autonomy.shadowExecutionEnabled}
              onChange={() => toggle("shadowExecutionEnabled")}
              accentColor={theme.hex}
              ariaLabel="Shadow execution safeguard"
            />
          }
        />
        <SettingsRow
          label="Double-brain consensus"
          description="Require a second reasoning pass on sensitive steps."
          control={
            <SettingsToggle
              checked={!!autonomy.doubleBrainConsensus}
              onChange={() => toggle("doubleBrainConsensus")}
              accentColor={theme.hex}
              ariaLabel="Double-brain consensus safeguard"
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Resource Awareness"
        description="Keep missions from competing with your own work."
        icon="Gauge"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Resource-aware throttling"
          description="Slow missions when the machine is under load."
          control={
            <SettingsToggle
              checked={!!autonomy.resourceAwareThrottling}
              onChange={() => toggle("resourceAwareThrottling")}
              accentColor={theme.hex}
              ariaLabel="Resource-aware throttling"
            />
          }
        />
        <SettingsRow
          label="Idle threshold"
          description={`${autonomy.idleThresholdMinutes} minutes before background work.`}
          control={
            <LucaSlider
              min="1"
              max="60"
              value={autonomy.idleThresholdMinutes}
              onChange={(e) =>
                setRange("idleThresholdMinutes", Number(e.target.value))
              }
              style={settingsControlInlineStyle}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Computer-use sandbox"
        description="Real browser automation. Off by default; guards still apply."
        icon="Browser"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div
          className="mb-3 rounded-xl border p-3 text-xs leading-relaxed"
          style={{
            borderColor: settingsSurfaceTokens.borderSubtle,
            color: settingsSurfaceTokens.textSecondary,
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: settingsSurfaceTokens.textPrimary }}
          >
            Thin pilot: {sandboxPilot.label}
          </p>
          <p className="mt-1">
            Status:{" "}
            <strong>
              {sandboxPilot.enabled ? "real stack allowed" : "simulated only"}
            </strong>
            {sandboxPilot.enabled
              ? ` · driver ${sandboxPilot.driverKindResolved}`
              : ""}
            . Dry-run/guards still apply before any click or type.
          </p>
          <p className="mt-1" style={{ color: settingsSurfaceTokens.textTertiary }}>
            {sandboxPilot.readinessNotes[0]}
          </p>
        </div>
        <SettingsRow
          label="Real sandbox browser"
          description="Allow Playwright or the Electron sandbox browser."
          control={
            <SettingsToggle
              checked={!!computerUse.realSandboxEnabled}
              onChange={() =>
                updateComputerUse(
                  "realSandboxEnabled",
                  !computerUse.realSandboxEnabled,
                )
              }
              accentColor={theme.hex}
              ariaLabel="Real sandbox browser execution"
            />
          }
        />
        <SettingsRow
          label="Driver"
          description="Auto prefers Electron sandbox IPC, else Playwright."
          control={
            <select
              className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-sm"
              style={settingsControlInlineStyle}
              value={computerUse.driverKind ?? "auto"}
              onChange={(e) =>
                updateComputerUse(
                  "driverKind",
                  e.target.value as "auto" | "playwright" | "electron_sandbox",
                )
              }
              aria-label="Computer-use driver kind"
            >
              <option value="auto">Auto</option>
              <option value="playwright">Playwright</option>
              <option value="electron_sandbox">Electron sandbox</option>
            </select>
          }
        />
        <SettingsRow
          label="Mission tape recording"
          description="Record invocation events in-process; nothing hits disk."
          control={
            <SettingsToggle
              checked={!!computerUse.enableMissionTapeSink}
              onChange={() =>
                updateComputerUse(
                  "enableMissionTapeSink",
                  !computerUse.enableMissionTapeSink,
                )
              }
              accentColor={theme.hex}
              ariaLabel="Computer-use mission tape recording"
            />
          }
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Live sandbox fleet state for running missions."
      >
        <SandboxFleetLivePanel />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsAutonomyTab;
