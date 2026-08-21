import React from "react";
import { LucaSettings } from "../../services/settingsService";
import SettingsMCPBridgeTab from "./SettingsMCPBridgeTab";
import SettingsConnectorsTab from "./SettingsConnectorsTab";
import SettingsIoTTab from "./SettingsIoTTab";

interface SettingsIntegrationsTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: unknown) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  setStatusMsg: (msg: string) => void;
  isMobile?: boolean;
}

/**
 * Integrations is the single destination for everything that reaches outside
 * Luca: tool servers, third-party accounts, and devices. It composes the three
 * panes that each used to own a top-level tab rather than merging their sources.
 * All three carry live state — the MCP server list, the `/api/system/social/status`
 * poll, Home Assistant credentials — that is not worth re-implementing to save a
 * wrapper.
 *
 * `data-settings-anchor` carries each retired tab id so a deep link to
 * `mcp-bridge`, `connectors`, or `iot` still lands on its own group.
 */
const SettingsIntegrationsTab: React.FC<SettingsIntegrationsTabProps> = ({
  settings,
  onUpdate,
  theme,
  setStatusMsg,
  isMobile,
}) => (
  <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
    <div data-settings-anchor="mcp-bridge">
      <SettingsMCPBridgeTab
        settings={settings}
        theme={theme}
        onUpdate={onUpdate}
        setStatusMsg={setStatusMsg}
        isMobile={isMobile}
      />
    </div>
    <div data-settings-anchor="connectors">
      <SettingsConnectorsTab
        settings={settings}
        theme={theme}
        setStatusMsg={setStatusMsg}
        isMobile={isMobile}
      />
    </div>
    <div data-settings-anchor="iot">
      <SettingsIoTTab
        settings={settings}
        onUpdate={onUpdate}
        theme={theme}
        isMobile={isMobile}
      />
    </div>
  </div>
);

export default SettingsIntegrationsTab;
