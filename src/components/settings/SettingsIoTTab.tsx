import React from "react";
import { LucaSettings } from "../../services/settingsService";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsDangerZone,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
  settingsControlInlineStyle,
  settingsInputClassName,
} from "./SettingsLayout";

interface SettingsIoTTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme?: any;
  isMobile?: boolean;
}

const SettingsIoTTab: React.FC<SettingsIoTTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const isConnected = Boolean(settings.iot.haUrl && settings.iot.haToken);

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"}`}>
      <SettingsSection
        title="Home Status"
        description="Connect Luca to your home with calm status, device, and permission summaries."
        icon="Home"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SettingsStatusCard
            label="Connected home"
            value={isConnected ? "Configured" : "Not connected"}
            detail="Home Assistant connection details are kept under Advanced Details."
            accentColor={theme?.hex}
          />
          <SettingsStatusCard
            label="Available devices"
            value="Ready to sync"
            detail="Lights, climate, locks, cameras, speakers, and sensors sync through the existing integration."
            accentColor={theme?.hex}
          />
          <SettingsStatusCard
            label="Last sync"
            value="When connected"
            detail="Device sync logs stay in Advanced Details."
            accentColor={theme?.hex}
          />
          <SettingsStatusCard
            label="Connection health"
            value={isConnected ? "Ready" : "Needs setup"}
            detail="No runtime behavior changes in this migration."
            accentColor={theme?.hex}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Devices"
        description="Review the home categories Luca can understand once your home integration is connected."
        icon="Devices"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {["Lights", "Climate", "Locks", "Cameras", "Speakers", "Sensors"].map(
            (label) => (
              <SettingsCard key={label}>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs opacity-70">
                  Managed by the existing smart home bridge.
                </p>
              </SettingsCard>
            ),
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Permissions"
        description="Keep home control safety-first, especially for security devices and presence rules."
        icon="ShieldCheck"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="View device status"
          description="Allow Luca to summarize device state when the integration is connected."
        />
        <SettingsRow
          label="Control devices"
          description="Device control continues through the existing smart home service."
        />
        <SettingsRow
          label="Security devices approval required"
          description="Locks, cameras, and presence-sensitive devices should require user review."
        />
        <SettingsRow
          label="Location and home presence rules"
          description="Presence behavior remains part of the existing integration policy."
        />
      </SettingsSection>

      <SettingsSection
        title="Automations"
        description="Routines, scenes, approved automations, and automation history stay grouped here."
        icon="Bolt"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Routines and scenes"
          description="Use the current home integration to expose approved routines."
        />
        <SettingsRow
          label="Approved automations"
          description="Review automations before Luca uses them on your behalf."
        />
        <SettingsRow
          label="Automation history"
          description="Diagnostics and sync logs stay under Advanced Details."
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Home Assistant endpoint, access token, local network diagnostics, device sync logs, and reset integration."
      >
        <SettingsRow
          label="Home Assistant endpoint"
          description="The existing endpoint setting is preserved."
          control={
            <input
              type="text"
              value={settings.iot.haUrl}
              onChange={(e) => onUpdate("iot", "haUrl", e.target.value)}
              placeholder="http://homeassistant.local:8123"
              className={settingsInputClassName}
              style={settingsControlInlineStyle}
            />
          }
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Access token</p>
          <textarea
            value={settings.iot.haToken}
            onChange={(e) => onUpdate("iot", "haToken", e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
            className={`${settingsInputClassName} h-36 resize-none font-mono text-xs`}
            style={settingsControlInlineStyle}
          />
        </div>
        <SettingsRow
          label="Local network diagnostics"
          description="Network checks are surfaced by the existing integration."
        />
        <SettingsRow
          label="Device sync logs"
          description="Sync logs stay grouped as technical details."
        />
      </SettingsAdvancedDisclosure>

      <SettingsDangerZone description="Revoke or reset the home integration only when those existing actions are available." />
    </div>
  );
};

export default SettingsIoTTab;
