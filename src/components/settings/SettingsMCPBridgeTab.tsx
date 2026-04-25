import React, { useState } from "react";
import { Icon } from "../ui/Icon";
import { LucaSettings } from "../../services/settingsService";
import SettingsMCPTab from "./SettingsMCPTab";
import SettingsConnectivityTab from "./SettingsConnectivityTab";

interface SettingsMCPBridgeTabProps {
  settings: LucaSettings;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  setStatusMsg: (msg: string) => void;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  isMobile?: boolean;
}

const SettingsMCPBridgeTab: React.FC<SettingsMCPBridgeTabProps> = ({
  settings,
  theme,
  setStatusMsg,
  isMobile,
}) => {
  const [bridgeMode, setBridgeMode] = useState<"inbound" | "outbound">("inbound");

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : ""}`}>
      {/* Luca Traffic Control Switcher */}
      <div 
        className={`flex p-1.5 border tech-border glass-blur shadow-lg self-start mb-2 ${isMobile ? "mx-4 border-x-0 border-y rounded-none" : "rounded-xl"}`}
        style={{ 
          backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.4))", 
          borderColor: "var(--app-border-main, rgba(255,255,255,0.1))" 
        }}
      >
        <button
          onClick={() => setBridgeMode("inbound")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            bridgeMode === "inbound" 
              ? "text-[var(--app-text-main)] shadow-sm" 
              : "text-[var(--app-text-muted)] opacity-60 hover:opacity-100"
          }`}
          style={bridgeMode === "inbound" ? { backgroundColor: `${theme.hex}22`, color: theme.hex } : {}}
        >
          <Icon name="Import" className="w-3.5 h-3.5" />
          Client: Import Skills
        </button>
        <button
          onClick={() => setBridgeMode("outbound")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            bridgeMode === "outbound" 
              ? "text-[var(--app-text-main)] shadow-sm" 
              : "text-[var(--app-text-muted)] opacity-60 hover:opacity-100"
          }`}
          style={bridgeMode === "outbound" ? { backgroundColor: `${theme.hex}22`, color: theme.hex } : {}}
        >
          <Icon name="Share2" className="w-3.5 h-3.5" />
          Server: Export Tools
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {bridgeMode === "inbound" ? (
          <SettingsMCPTab 
            settings={settings} 
            theme={theme} 
            setStatusMsg={setStatusMsg} 
            isMobile={isMobile}
          />
        ) : (
          <SettingsConnectivityTab isMobile={isMobile} />
        )}
      </div>
    </div>
  );
};

export default SettingsMCPBridgeTab;
