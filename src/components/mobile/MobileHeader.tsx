import React from "react";
import { Icon } from "../ui/Icon";
import { SmartDevice } from "../../types";

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
  return (
    <>
      {/* Header */}
      <div
        className={`h-16 border-b flex items-center justify-between px-6 ${
          activeTab === "EXPLOIT" || activeTab === "WIRELESS"
            ? "bg-red-950/10 border-red-900"
            : "bg-slate-950 border-slate-800"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-full border flex items-center justify-center ${
              activeTab === "EXPLOIT" || activeTab === "WIRELESS"
                ? "bg-red-900/20 border-red-500 text-red-500"
                : "bg-rq-blue/10 border-rq-blue/30 text-rq-blue"
            }`}
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
                activeTab === "EXPLOIT" || activeTab === "WIRELESS"
                  ? "text-red-500"
                  : "text-white"
              }`}
            >
              {activeTab === "EXPLOIT" ? "ROOT ACCESS SHELL" : device.name}
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
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
                {isAdbConnected ? "ADB: CONNECTED" : "ADB: OFFLINE"}
              </span>
              <span className="flex items-center gap-1">
                <Icon 
                  name="Battery" 
                  size={12} 
                  variant="BoldDuotone" 
                  color={batteryLevel < 20 ? "#ef4444" : "#22c55e"} 
                />
                {batteryLevel}% {isCharging ? "(CHARGING)" : ""}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <Icon name="CloseCircle" size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto">
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
            className={`flex-1 py-3 px-4 text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-colors whitespace-nowrap
                        ${
                          activeTab === tab.id
                            ? tab.danger
                              ? "bg-red-900/20 text-red-500 border-b-2 border-red-500"
                              : "bg-rq-blue/10 text-rq-blue border-b-2 border-rq-blue"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
          >
            <Icon name={tab.icon} size={14} variant="BoldDuotone" /> {tab.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default MobileHeader;
