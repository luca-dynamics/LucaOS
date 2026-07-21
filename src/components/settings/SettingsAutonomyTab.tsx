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
        description="Choose how much Luca can do on your behalf with safety-first framing."
        icon="Ghost"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Autonomy",
              value: autonomy.backgroundMissionsEnabled ? "Enabled" : "Paused",
              detail: "Background missions only continue when this is enabled.",
            },
            {
              label: "Current mode",
              value: autonomy.backgroundMissionsEnabled
                ? "Ask before acting"
                : "Suggest only",
              detail: "Risky actions remain user-reviewed.",
            },
            {
              label: "Active missions",
              value: "User approved",
              detail: "Mission execution continues through existing services.",
            },
            {
              label: "Safety state",
              value: `${activeSafety}/3 safeguards`,
              detail: "Shadow preview, consensus, and resource limits.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Permission Level"
        description="Do not expose risky autonomy controls as casual toggles; keep approvals visible."
        icon="ShieldCheck"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Suggest only"
          description="Luca prepares recommendations without taking action."
        />
        <SettingsRow
          label="Ask before acting"
          description="Recommended default for tasks with tools, apps, or spending."
        />
        <SettingsRow
          label="Approve trusted actions"
          description="Use only for reviewed actions within clear limits."
        />
        <SettingsRow
          label="Autonomous within limits"
          description="Keep sensitive apps and high-impact actions restricted."
        />
      </SettingsSection>

      <SettingsSection
        title="Missions"
        description="Background tasks, recurring work, active missions, and mission history remain grouped together."
        icon="Target"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Background missions"
          description="Allow Luca to continue approved goals while you are idle."
          control={
            <SettingsToggle
              checked={!!autonomy.backgroundMissionsEnabled}
              onChange={() => toggle("backgroundMissionsEnabled")}
              accentColor={theme.hex}
              ariaLabel="Background missions"
            />
          }
        />
        <SettingsRow
          label="Recurring tasks"
          description="Recurring mission setup stays in the mission surfaces that already manage it."
        />
        <SettingsRow
          label="Mission history"
          description="Review completed and stopped missions through existing autonomy history."
        />
      </SettingsSection>

      <SettingsSection
        title="Safety Controls"
        description="Mission killswitch, approvals, restricted actions, and sensitive app rules are emphasized before diagnostics."
        icon="Lock"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Mission killswitch"
          description="Pause background autonomy immediately when mission risk or context changes."
        />
        <SettingsRow
          label="Approval requirements"
          description="Tool, spending, messaging, and sensitive-app actions should stay review-gated."
        />
        <SettingsRow
          label="Restricted actions"
          description="Spending, messaging, shell, and sensitive app actions should require approval."
        />
      </SettingsSection>

      <SettingsSection
        title="Resource Awareness"
        description="CPU, battery, network, focus mode, and quiet hours stay visible as user-level safety settings."
        icon="Gauge"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Resource-aware throttling"
          description="Pause or slow missions when Luca detects low resource availability."
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
          description={`${autonomy.idleThresholdMinutes} minutes before Luca considers background work.`}
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
        <SettingsRow
          label="Network limits"
          description="Network-sensitive missions continue through existing autonomy limits."
        />
        <SettingsRow
          label="Quiet hours"
          description="Quiet-hour behavior remains controlled by existing notification and mission policies."
        />
      </SettingsSection>

      <SettingsSection
        title="Computer-use sandbox"
        description="Real browser automation stays off by default. Enable only when you understand sandbox boundaries and approvals."
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
          description="When on, computer-use can drive Playwright or the Electron sandbox browser behind guards. Default is simulated only."
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
          description="Auto uses Electron sandbox IPC when available, otherwise Playwright. Click and type still require guard approval."
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
          description="Forward computer-use invocation events into the in-process MissionTape recorder (no disk export)."
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
        description="Advanced autonomy safeguards, planning traces, tool execution diagnostics, and autonomy logs."
      >
        <SandboxFleetLivePanel />
        <SettingsRow
          label="Shadow execution safeguard"
          description="Preview actions before Luca runs or surfaces them. Use only when you understand the mission review flow."
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
          label="Double-brain consensus safeguard"
          description="Require a second reasoning pass before sensitive autonomous steps; keep enabled for higher-risk missions."
          control={
            <SettingsToggle
              checked={!!autonomy.doubleBrainConsensus}
              onChange={() => toggle("doubleBrainConsensus")}
              accentColor={theme.hex}
              ariaLabel="Double-brain consensus safeguard"
            />
          }
        />
        <SettingsRow
          label="Planning traces"
          description="Keep raw plans and tool diagnostics away from primary controls."
        />
        <SettingsRow
          label="Tool execution diagnostics"
          description="Diagnostics are informational only in this UI migration."
        />
        <SettingsRow
          label="Autonomy logs"
          description="Review low-level mission details from the existing runtime surfaces."
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsAutonomyTab;
