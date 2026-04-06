import React from "react";
import { Icon } from "../ui/Icon";
import SystemMonitor from "../SystemMonitor";
import SmartDeviceCard from "../SmartDeviceCard";
import { soundService } from "../../services/soundService";
import { apiUrl } from "../../config/api";

interface OperationsSidebarProps {
  isMobile: boolean;
  activeMobileTab: string;
  isListeningAmbient: boolean;
  theme?: any;
  setWirelessTab: (tab: "BLUETOOTH" | "WIFI") => void;
  setShowWirelessManager: (show: boolean) => void;
  setShowNetworkMap: (show: boolean) => void;
  executeTool: (toolName: string, args: any) => Promise<any>;
  devices: any[];
  handleDeviceControlClick: (device: any) => void;
  installedModules: any[];
  cryptoWallet: any;
  forexAccount: any;
  osintProfile: any;
  hackingLogs: any[];
  setShowSkillsMatrix: (show: boolean) => void;
  setVisualData: (data: any) => void;
  setShowAppExplorer: (show: boolean) => void;
  setShowLucaRecorder: (show: boolean) => void;
  setStockTerminalSymbol: (symbol: string) => void;
  setShowStockTerminal: (show: boolean) => void;
  setShowTradingTerminal: (show: boolean) => void;
  setShowSubsystemDashboard: (show: boolean) => void;
  setShowInvestigationReports: (show: boolean) => void;
  setShowIngestionModal: (show: boolean) => void;
  setShowCodeEditor: (show: boolean) => void;
  setShowPredictionTerminal: (show: boolean) => void;
  setShowLucaLinkModal: (show: boolean) => void;
  setShowCryptoTerminal: (show: boolean) => void;
  setShowForexTerminal: (show: boolean) => void;
  setShowOsintDossier: (show: boolean) => void;
  setShowHackingTerminal: (show: boolean) => void;
  connectionTier?: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
}

const OperationsSidebar: React.FC<OperationsSidebarProps> = ({
  isMobile,
  activeMobileTab,
  isListeningAmbient,
  setWirelessTab,
  setShowWirelessManager,
  setShowNetworkMap,
  executeTool,
  devices,
  handleDeviceControlClick,
  installedModules,
  setShowSkillsMatrix,
  setVisualData,
  setShowAppExplorer,
  setShowLucaRecorder,
  setStockTerminalSymbol,
  setShowStockTerminal,
  setShowTradingTerminal,
  setShowSubsystemDashboard,
  setShowInvestigationReports,
  setShowIngestionModal,
  setShowCodeEditor,
  setShowPredictionTerminal,
  setShowLucaLinkModal,
  setShowCryptoTerminal,
  setShowForexTerminal,
  setShowOsintDossier,
  setShowHackingTerminal,
  connectionTier = "LOCAL",
}) => {
  return (
    <section
      className={`${
        isMobile
          ? activeMobileTab === "SYSTEM"
            ? "flex w-full"
            : "hidden"
          : "flex"
      } flex-col h-full overflow-hidden tech-border z-10 glass-blur bg-[var(--app-bg-tint)] border-r border-[var(--app-border-main)]`}
    >
      {/* Mobile Header for System Panel */}
      {isMobile && (
        <div
          className={`flex items-center justify-between p-4 border-b border-[var(--app-border-main)]`}
        >
          <h2 className="text-[var(--app-text-main)] font-black tracking-[0.3em] text-xs italic uppercase">
            System Control
          </h2>
        </div>
      )}

      {/* System Monitor Area */}
      <div
        className={`flex-none h-[28%] p-4 bg-transparent border-b border-[var(--app-border-main)]`}
      >
        <SystemMonitor
          audioListenMode={isListeningAmbient}
          connected={connectionTier !== "OFFLINE"}
          connectionTier={connectionTier}
        />
      </div>

      {/* Devices & Ops Grid */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6 no-scrollbar">
        {/* Agent Operations */}
        <div
          className="p-5 rounded-xl relative overflow-hidden group border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] shadow-xl animate-in slide-in-from-left duration-700"
        >
          <div 
            className="absolute top-0 right-0 p-3 opacity-30 text-[var(--app-text-main)]"
          >
            <Icon name="Pulse" size={14} variant="BoldDuotone" />
          </div>
          <div
            className="flex items-center gap-3 mb-5 text-[var(--app-text-main)]"
          >
            <Icon name="EyeScan" size={18} variant="BoldDuotone" className="opacity-70" />
            <h2 className="font-black tracking-[0.2em] text-xs italic uppercase">
              Luca Ops
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setWirelessTab("BLUETOOTH");
                setShowWirelessManager(true);
                soundService.play("KEYSTROKE");
              }}
              className="p-3 min-h-[60px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation border rounded-xl tech-border glass-blur bg-black/40 border-[var(--app-border-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95"
            >
              <span className="text-[9px] font-black tracking-[0.2em] text-[var(--app-text-muted)] opacity-50 uppercase">
                Wireless
              </span>
              <span
                className={`text-xs font-black text-[var(--app-text-main)] tracking-tight uppercase`}
              >
                Intercept
              </span>
              <div className="h-0.5 w-full bg-[var(--app-border-main)] mt-2 overflow-hidden rounded-full">
                <div
                  className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 bg-[var(--app-text-main)] opacity-30`}
                ></div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowNetworkMap(true);
                soundService.play("KEYSTROKE");
              }}
              className="p-3 min-h-[60px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation border rounded-xl tech-border glass-blur bg-black/40 border-[var(--app-border-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95"
            >
              <span className="text-[9px] font-black tracking-[0.2em] text-[var(--app-text-muted)] opacity-50 uppercase">
                Topology
              </span>
              <span
                className={`text-xs font-black text-[var(--app-text-main)] tracking-tight uppercase`}
              >
                Net Map
              </span>
              <div className="h-0.5 w-full bg-[var(--app-border-main)] mt-2 overflow-hidden rounded-full">
                <div
                  className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 bg-[var(--app-text-main)] opacity-30`}
                ></div>
              </div>
            </button>

            {/* MANUAL LOCKDOWN TRIGGER */}
            <button
              onClick={() => executeTool("initiateLockdown", {})}
              className={`col-span-2 py-3.5 flex items-center justify-center gap-3 transition-all group/btn border rounded-xl tech-border glass-blur bg-red-500/5 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 hover:scale-[1.02] active:scale-95`}
            >
              <Icon
                name="Lock"
                size={14}
                color="#ef4444"
                className="group-hover/btn:animate-bounce transition-all"
                variant="BoldDuotone"
              />
              <span className="text-[11px] font-black text-red-500 tracking-[0.3em] uppercase italic">
                Initiate Lockdown
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-4 animate-in slide-in-from-left duration-700 delay-100">
          <div
            className="flex items-center gap-3 mb-2 text-[var(--app-text-main)] opacity-70"
          >
            <Icon name="Cpu" size={18} variant="BoldDuotone" />
            <h2 className="font-black tracking-[0.2em] text-xs italic uppercase">
              Facility Control
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {devices.map((device) => (
              <SmartDeviceCard
                key={device.id}
                device={device}
                onControlClick={handleDeviceControlClick}
              />
            ))}
          </div>
        </div>

        {/* Luca Expansion Section */}
        <div className="space-y-4 animate-in slide-in-from-left duration-700 delay-200">
          <div
            className="flex items-center gap-3 mb-2 text-[var(--app-text-main)] opacity-70"
          >
            <Icon name="Widget" size={18} variant="BoldDuotone" />
            <h2 className="font-black tracking-[0.2em] text-xs italic uppercase">
              Expansion Matrix
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setShowSkillsMatrix(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="MagicStick" size={16} variant="BoldDuotone" />
              Skills
            </button>
            <button
              onClick={() => {
                setVisualData({
                  type: "SOVEREIGNTY",
                  data: {
                    totalProfit: 0,
                    leadsFound: 0,
                    chainsScanned: 0,
                    activeChains: [],
                  },
                });
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Earth" size={16} variant="BoldDuotone" />
              Sovereignty
            </button>
            <button
              onClick={() => {
                setVisualData({
                  type: "SECURITY",
                  status: "ACTIVE",
                  target: "LOCALHOST",
                  profit: "0.00",
                  steps: ["SYSTEM_MONITOR", "THREAT_SCAN"],
                  metrics: {
                    cost: "$0.00",
                    successRate: "100%",
                    threatLevel: 0,
                  },
                });
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Shield" size={16} variant="BoldDuotone" />
              Security
            </button>
            <button
              onClick={() => {
                setShowAppExplorer(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Widget" size={16} variant="BoldDuotone" />
              Apps
            </button>
            <button
              onClick={() => {
                if (
                  (window as any).electron &&
                  (window as any).electron.ipcRenderer
                ) {
                  window.electron.ipcRenderer.send("open-visual-core");
                  fetch(apiUrl("/api/vision/start"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ captureInterval: 1000 }),
                  }).catch((e) =>
                    console.error("Failed to start vision service:", e),
                  );
                  soundService.play("SUCCESS");
                } else {
                  console.warn("Visual Core window requires Electron");
                }
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Monitor" size={16} variant="BoldDuotone" />
              Screen
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundService.play("KEYSTROKE");
                setShowLucaRecorder(true);
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="EyeScan" size={16} variant="BoldDuotone" />
              Train
            </button>
            <button
              onClick={() => {
                setStockTerminalSymbol("");
                setShowStockTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Chart" size={14} variant="BoldDuotone" /> Stock Feed
            </button>
            <button
              onClick={() => {
                setShowTradingTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="MagicStick" size={14} variant="BoldDuotone" /> AI Trading
            </button>
            <button
              onClick={() => {
                setShowSubsystemDashboard(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Pulse" size={14} variant="BoldDuotone" /> Subsystems
            </button>

            <button
              onClick={() => {
                setShowInvestigationReports(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Notes" size={14} variant="BoldDuotone" /> Reports
            </button>

            <button
              onClick={() => {
                setShowIngestionModal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20 animate-pulse"
            >
              <Icon name="Import" size={14} variant="BoldDuotone" /> Import
            </button>

            <button
              onClick={() => {
                setShowCodeEditor(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Programming" size={14} variant="BoldDuotone" /> IDE
            </button>

            <button
              onClick={() => {
                setShowPredictionTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Chart" size={14} variant="BoldDuotone" /> Prediction
            </button>

            <button
              onClick={() => {
                setShowLucaLinkModal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/20 hover:scale-105 active:scale-95 shadow-lg shadow-black/20 border-white/20 animate-pulse"
            >
              <Icon name="Smartphone" size={14} variant="BoldDuotone" /> Link Bridge
            </button>

            <button
              onClick={() => {
                setShowCryptoTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Wallet" size={14} variant="BoldDuotone" /> DeFi
            </button>

            <button
              onClick={() => {
                setShowForexTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Bank" size={14} variant="BoldDuotone" /> FX
            </button>

            <button
              onClick={() => {
                setShowOsintDossier(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Search" size={14} variant="BoldDuotone" /> OSINT
            </button>

            <button
              onClick={() => {
                setShowHackingTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-red-500/20 hover:border-red-500/40 hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
            >
              <Icon name="Shield" size={14} variant="BoldDuotone" color="#ef4444" /> Ethical Hacking
            </button>

            {installedModules.map((mod, i) => (
              <div
                key={i}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border tech-border glass-blur bg-black/20 border-[var(--app-border-main)] text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 shadow-lg shadow-black/20 italic"
              >
                <Icon
                  name="Import"
                  size={14}
                  className="opacity-50 group-hover:opacity-100"
                  variant="BoldDuotone"
                />
                {mod}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OperationsSidebar;
