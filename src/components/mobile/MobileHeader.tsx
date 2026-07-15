import React from "react";
import { Icon } from "../ui/Icon";
import { SmartDevice } from "../../types";
import {
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
  lucaMaterialMetricStyle,
  lucaMaterialSolidCardStyle,
} from "../../styles/lucaMaterialSystem";

type MobileTab = "DASH" | "FILES" | "COMMS" | "LIVE" | "EXPLOIT" | "WIRELESS";

interface MobileHeaderProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  device: SmartDevice;
  batteryLevel: number;
  isCharging: boolean;
  isAdbConnected: boolean;
  onClose: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  setActiveTab,
  device,
  batteryLevel,
  isCharging,
  isAdbConnected,
  onClose,
}) => {
  const isDangerTab = activeTab === "EXPLOIT" || activeTab === "WIRELESS";

  return (
    <>
      {/* Header */}
      <div
        className="flex h-16 items-center justify-between border-b px-6"
        style={{
          ...lucaMaterialSolidCardStyle,
          borderColor: isDangerTab
            ? "color-mix(in srgb, var(--luca-danger,#f87171) 32%, transparent)"
            : lucaMaterialSolidCardStyle.borderColor,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-full border flex items-center justify-center ${
              isDangerTab
                ? "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] text-[var(--luca-danger,#f87171)]"
                : "bg-rq-blue/10 border-rq-blue/30 text-rq-blue"
            }`}
            style={!isDangerTab ? lucaMaterialControlStyle : undefined}
          >
            {activeTab === "EXPLOIT" ? (
              <Icon name="Ghost" size={20} variant="BoldDuotone" />
            ) : (
              <Icon name="Smartphone" size={20} variant="BoldDuotone" />
            )}
          </div>
          <div>
            <h2
              className={`font-display text-xl font-bold tracking-widest ${
                isDangerTab
                  ? "text-[var(--luca-danger,#f87171)]"
                  : "text-[var(--luca-text-primary)]"
              }`}
            >
              {activeTab === "EXPLOIT" ? "ROOT ACCESS SHELL" : device.name}
            </h2>
            <div className="flex items-center gap-4 font-mono text-[10px] text-[var(--luca-text-tertiary)]">
              <span className="flex items-center gap-1">
                <Icon name="Pulse" size={12} variant="BoldDuotone" color="#22c55e" /> ONLINE
              </span>
              <span className="flex items-center gap-1">
                <Icon 
                  name="Monitor" 
                  size={12} 
                  variant="BoldDuotone" 
                  color={isAdbConnected ? "#22c55e" : "#64748b"} 
                />
                {isAdbConnected ? "ADB: Connected" : "ADB: Offline"}
              </span>
              <span className="flex items-center gap-1">
                <Icon 
                  name="Battery" 
                  size={12} 
                  variant="BoldDuotone" 
                  color={batteryLevel < 20 ? "#ef4444" : "#22c55e"} 
                />
                {batteryLevel}% {isCharging ? "(Charging)" : ""}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="luca-material-pressable rounded-lg border p-1.5 text-[var(--luca-text-secondary)] transition-colors hover:text-[var(--luca-text-primary)]"
          style={lucaMaterialControlStyle}
        >
          <Icon name="CloseCircle" size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b" style={lucaMaterialMetricStyle}>
        {[
          { id: "DASH", label: "DASHBOARD", icon: "Pulse" },
          { id: "LIVE", label: "LIVE VIEW", icon: "PlayCircle" },
          { id: "FILES", label: "FILES", icon: "Folder" },
          { id: "COMMS", label: "LOGS", icon: "Chat" },
          { id: "WIRELESS", label: "WIRELESS", icon: "Widget" },
          { id: "EXPLOIT", label: "EXPLOIT", icon: "Programming", danger: true },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as MobileTab)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold tracking-widest transition-colors
                        ${
                          activeTab === tab.id
                            ? tab.danger
                              ? "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)] border-b-2 border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]"
                              : "text-[var(--luca-accent-primary)]"
                            : "border-transparent text-[var(--luca-text-tertiary)] hover:text-[var(--luca-text-primary)]"
                        }`}
            style={activeTab === tab.id && !tab.danger ? lucaMaterialControlActiveStyle : undefined}
          >
            <Icon name={tab.icon} size={14} variant="BoldDuotone" /> {tab.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default MobileHeader;
