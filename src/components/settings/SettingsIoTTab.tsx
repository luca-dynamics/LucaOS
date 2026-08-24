import React from "react";
import { LucaSettings } from "../../services/settingsService";
import { LucaInput, LucaTextarea } from "../ui/luca";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
  settingsControlInlineStyle,
  settingsInputClassName,
} from "./SettingsLayout";

interface SettingsIoTTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme?: any;
  isMobile?: boolean;
}

/** Split a Home Assistant base URL into transport + host without throwing. */
const describeEndpoint = (
  raw: string,
): { transport: string; host: string } => {
  if (!raw.trim()) return { transport: "Not set", host: "Not set" };
  try {
    const url = new URL(raw.trim());
    return {
      transport: url.protocol.replace(":", "").toUpperCase(),
      host: url.host,
    };
  } catch {
    return { transport: "Unparsed", host: raw.trim() };
  }
};

const SettingsIoTTab: React.FC<SettingsIoTTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const haUrl = settings.iot.haUrl || "";
  const haToken = settings.iot.haToken || "";
  const isConnected = Boolean(haUrl && haToken);
  const endpoint = describeEndpoint(haUrl);

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"}`}>
      <SettingsSection
        title="Home Status"
        description="Connection state for your Home Assistant bridge."
        icon="Home"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Connection",
              value: isConnected ? "Configured" : "Needs setup",
              detail: isConnected
                ? "Server address and access token are both stored."
                : "Add a server address and access token below.",
            },
            {
              label: "Server",
              value: endpoint.host,
              detail: haUrl || "No server address stored yet.",
            },
            {
              label: "Access token",
              value: haToken ? "Stored" : "Missing",
              detail: haToken
                ? `${haToken.length} characters stored locally.`
                : "Home control stays disabled without a token.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Home Assistant"
        description="Server address and access token for your home bridge."
        icon="Devices"
        accentColor={theme?.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Server address"
          description="Local or remote Home Assistant URL."
          control={
            <LucaInput
              type="text"
              value={haUrl}
              onChange={(e) => onUpdate("iot", "haUrl", e.target.value)}
              placeholder="http://homeassistant.local:8123"
              className={settingsInputClassName}
              style={settingsControlInlineStyle}
            />
          }
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Access token</p>
          <LucaTextarea
            value={haToken}
            onChange={(e) => onUpdate("iot", "haToken", e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
            className={`${settingsInputClassName} h-24 resize-none font-mono text-xs`}
            style={settingsControlInlineStyle}
          />
        </div>
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Resolved endpoint, transport, and credential state."
      >
        <SettingsStatList
          columns={2}
          items={[
            {
              label: "Transport",
              value: endpoint.transport,
              detail: "Scheme parsed from the stored server address.",
            },
            { label: "Host", value: endpoint.host, detail: haUrl || "Not set" },
            {
              label: "Token length",
              value: haToken ? `${haToken.length}` : "0",
              detail: "Tokens are stored locally and never sent to Luca hosts.",
            },
            {
              label: "Credential state",
              value: isConnected ? "Complete" : "Incomplete",
              detail: "Both fields are required before home control is offered.",
            },
          ]}
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default SettingsIoTTab;
