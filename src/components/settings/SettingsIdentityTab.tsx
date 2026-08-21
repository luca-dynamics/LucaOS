import React from "react";
import { PersonaConfig } from "../../types";
import PersonalityDashboard from "./PersonalityDashboard";
import OperatorProfilePanel from "./OperatorProfilePanel";

interface SettingsIdentityTabProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
    isLight?: boolean;
  };
  config: PersonaConfig | null;
  onUpdate: (personaName: string, key: string, value: string) => void;
  isMobile?: boolean;
}

/**
 * Who Luca is and who Luca is talking to are one identity surface, not two
 * destinations: Personality (persona lenses, system rules, voice signature)
 * followed by the operator profile it is tuned against.
 *
 * `data-settings-anchor="profile"` keeps deep links to the retired Profile tab
 * landing on the operator half rather than the top of the pane.
 */
const SettingsIdentityTab: React.FC<SettingsIdentityTabProps> = ({
  theme,
  config,
  onUpdate,
  isMobile,
}) => (
  <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
    <PersonalityDashboard
      theme={theme}
      config={config}
      onUpdate={onUpdate}
      isMobile={isMobile}
    />
    <div data-settings-anchor="profile">
      <OperatorProfilePanel theme={theme} isMobile={isMobile} />
    </div>
  </div>
);

export default SettingsIdentityTab;
