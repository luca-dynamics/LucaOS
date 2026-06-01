import React from "react";
import { LucaSettings } from "../../services/settingsService";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
  SettingsToggle,
  settingsControlInlineStyle,
} from "./SettingsLayout";

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

  const toggle = (key: keyof typeof autonomy) => {
    onUpdate("autonomy", key, !autonomy[key]);
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SettingsStatusCard
            label="Autonomy"
            value={autonomy.backgroundMissionsEnabled ? "Enabled" : "Paused"}
            detail="Background missions only continue when this is enabled."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Current mode"
            value={
              autonomy.backgroundMissionsEnabled
                ? "Ask before acting"
                : "Suggest only"
            }
            detail="Risky actions remain user-reviewed."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Active missions"
            value="User approved"
            detail="Mission execution continues through existing services."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Safety state"
            value={`${activeSafety}/3 safeguards`}
            detail="Shadow preview, consensus, and resource limits."
            accentColor={theme.hex}
          />
        </div>
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
          label="Shadow execution"
          description="Preview actions before Luca runs or surfaces them."
          control={
            <SettingsToggle
              checked={!!autonomy.shadowExecutionEnabled}
              onChange={() => toggle("shadowExecutionEnabled")}
              accentColor={theme.hex}
              ariaLabel="Shadow execution"
            />
          }
        />
        <SettingsRow
          label="Double-brain consensus"
          description="Require a second reasoning pass before sensitive autonomous steps."
          control={
            <SettingsToggle
              checked={!!autonomy.doubleBrainConsensus}
              onChange={() => toggle("doubleBrainConsensus")}
              accentColor={theme.hex}
              ariaLabel="Double-brain consensus"
            />
          }
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
            <input
              type="range"
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

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Shadow execution, double-brain consensus, planning traces, tool execution diagnostics, and autonomy logs."
      >
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
