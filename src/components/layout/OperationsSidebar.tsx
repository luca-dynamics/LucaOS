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
  setShowDarkWebScanner: (show: boolean) => void;
  setShowIngestionModal: (show: boolean) => void;
  setShowCodeEditor: (show: boolean) => void;
  setShowPredictionTerminal: (show: boolean) => void;
  setShowLucaLinkModal: (show: boolean) => void;
  setShowCryptoTerminal: (show: boolean) => void;
  setShowForexTerminal: (show: boolean) => void;
  setShowOsintDossier: (show: boolean) => void;
  setShowHackingTerminal: (show: boolean) => void;
  setShowAgentMode: (show: boolean) => void;
  setShowThoughtProcess: (show: boolean) => void;
  connectionTier?: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
  onLockdown?: () => void;
}

const OperationsSidebar: React.FC<OperationsSidebarProps> = ({
  isMobile,
  activeMobileTab,
  isListeningAmbient,
  theme,
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
  setShowDarkWebScanner,
  setShowIngestionModal,
  setShowCodeEditor,
  setShowPredictionTerminal,
  setShowLucaLinkModal,
  setShowCryptoTerminal,
  setShowForexTerminal,
  setShowOsintDossier,
  setShowHackingTerminal,
  setShowAgentMode,
  setShowThoughtProcess,
  connectionTier = "LOCAL",
  onLockdown,
}) => {
  return (
    <section
      className={`${
        isMobile
          ? activeMobileTab === "SYSTEM"
            ? "flex w-full"
            : "hidden"
          : "flex"
      } flex-col h-full overflow-hidden z-10 glass-blur rounded-lg`}
      style={{
        backgroundColor: theme?.isLight
          ? (theme.themeName?.toLowerCase() === "lightcream"
              ? "rgba(229, 225, 205, var(--app-bg-opacity, 0.5))"
              : "rgba(255, 255, 255, var(--app-bg-opacity, 0.5))")
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))"
      }}
    >
      {/* INTERNAL THEME LOGIC */}
      {(() => {
        const isLightCream = theme?.themeName?.toLowerCase() === "lightcream";
        const isLight = theme?.isLight;
        
        return (
          <>
      {/* Mobile Header for System Panel */}
      {isMobile && (
        <div
          className={`flex items-center justify-between p-4 border-b border-[var(--app-border-main)]`}
        >
          <h2 className="text-[var(--app-text-main)] font-black tracking-[0.3em] text-xs italic uppercase">
            System Center
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
          className="p-5 rounded-lg relative overflow-hidden group tech-border glass-blur bg-black/20 shadow-xl animate-in slide-in-from-left duration-700"
        >
          <div 
            className="absolute top-0 right-0 p-3 opacity-30 text-[var(--app-text-main)]"
          >
            <Icon name="Pulse" size={14} variant="BoldDuotone" />
          </div>
          <div
            className={`flex items-center gap-3 mb-5 text-[var(--app-text-main)] ${theme?.isLight ? "opacity-90" : ""}`}
          >
            <Icon name="EyeScan" size={18} variant="BoldDuotone" className={`${theme?.isLight ? "opacity-100" : "opacity-70"}`} />
            <h2 className="font-black tracking-widest text-xs uppercase">
              Core Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setShowAgentMode(true);
                soundService.play("KEYSTROKE");
              }}
              className={`p-3 min-h-[60px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation rounded-lg tech-border glass-blur hover:scale-105 active:scale-95 shadow-md`}
              style={{
                backgroundColor: isLightCream 
                  ? "rgba(108, 106, 88, var(--app-bg-opacity, 0.9))" 
                  : isLight 
                    ? "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.3) * 0.3))"
                    : "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.3) * 0.4))"
              }}
            >
              <span className={`text-[9px] font-black tracking-[0.2em] ${isLightCream ? "text-[#E5E1CD]/80" : "text-[var(--app-text-muted)]"} ${isLight && !isLightCream ? "opacity-70" : ""} uppercase`}>
                Agent
              </span>
              <span
                className={`text-xs font-black ${isLightCream ? "text-[#E5E1CD]" : "text-[var(--app-text-main)]"} tracking-tight uppercase`}
              >
                Mode
              </span>
              <div className="h-0.5 w-full bg-[var(--app-border-main)] mt-2 overflow-hidden rounded-full">
                <div
                  className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 bg-[var(--app-text-main)] opacity-30`}
                ></div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowThoughtProcess(true);
                soundService.play("KEYSTROKE");
              }}
              className={`p-3 min-h-[60px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation rounded-lg tech-border glass-blur hover:scale-105 active:scale-95 shadow-md`}
              style={{
                backgroundColor: isLightCream 
                  ? "rgba(108, 106, 88, var(--app-bg-opacity, 0.9))" 
                  : isLight 
                    ? "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.3) * 0.3))"
                    : "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.3) * 0.4))"
              }}
            >
              <span className={`text-[9px] font-black tracking-[0.2em] ${isLightCream ? "text-[#E5E1CD]/80" : "text-[var(--app-text-muted)]"} ${isLight && !isLightCream ? "opacity-70" : ""} uppercase`}>
                Cognitive
              </span>
              <span
                className={`text-xs font-black ${isLightCream ? "text-[#E5E1CD]" : "text-[var(--app-text-main)]"} tracking-tight uppercase`}
              >
                Engine
              </span>
              <div className="h-0.5 w-full bg-[var(--app-border-main)] mt-2 overflow-hidden rounded-full">
                <div
                  className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500 bg-[var(--app-text-main)] opacity-30`}
                ></div>
              </div>
            </button>

            {/* MANUAL LOCKDOWN TRIGGER */}
            <button
              onClick={() => {
                executeTool("initiateLockdown", {});
                onLockdown?.();
              }}
              className={`col-span-2 py-3.5 flex items-center justify-center gap-3 transition-all group/btn rounded-lg tech-border ${isLightCream ? "" : "glass-blur hover:scale-[1.02] active:scale-95 shadow-md"}`}
              style={{
                backgroundColor: isLightCream 
                  ? "rgba(180, 80, 80, 0.15)"
                  : isLight 
                    ? "rgba(239, 68, 68, calc(var(--app-bg-opacity, 0.3) * 0.5))"
                    : "rgba(239, 68, 68, calc(var(--app-bg-opacity, 0.3) * 0.3))",
                borderColor: isLightCream ? "rgba(150, 40, 40, 0.4)" : "var(--app-border-main)"
              }}
            >
              <Icon
                name="Lock"
                size={14}
                color={isLightCream ? "#991b1b" : "#ef4444"}
                className="group-hover/btn:animate-bounce transition-all"
                variant="BoldDuotone"
              />
              <span 
                className={`text-[11px] font-black tracking-widest uppercase transition-colors`}
                style={{ color: isLightCream ? "#991b1b" : "#ef4444" }}
              >
                Initiate Lockdown
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-4 animate-in slide-in-from-left duration-700 delay-100">
          <div
            className={`flex items-center gap-3 mb-2 text-[var(--app-text-main)] ${theme?.isLight ? "opacity-90" : "opacity-70"}`}
          >
            <Icon name="Cpu" size={18} variant="BoldDuotone" />
            <h2 className="font-black tracking-widest text-xs uppercase">
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
            className={`flex items-center gap-3 mb-2 text-[var(--app-text-main)] ${theme?.isLight ? "opacity-90" : "opacity-70"}`}
          >
            <Icon name="Widget" size={18} variant="BoldDuotone" />
            <h2 className="font-black tracking-widest text-xs uppercase">
              Tools & Apps
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setShowSkillsMatrix(true);
                soundService.play("KEYSTROKE");
              }}
              className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur hover:scale-105 active:scale-95 shadow-lg shadow-black/20`}
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
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
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
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
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Shield" size={16} variant="BoldDuotone" />
              Security
            </button>
            <button
              onClick={() => {
                setShowAppExplorer(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
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
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
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
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
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
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Chart" size={14} variant="BoldDuotone" /> Stock Feed
            </button>
            <button
              onClick={() => {
                setShowTradingTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="MagicStick" size={14} variant="BoldDuotone" /> AI Trading
            </button>
            <button
              onClick={() => {
                setShowSubsystemDashboard(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Pulse" size={14} variant="BoldDuotone" /> System Services
            </button>

            <button
              onClick={() => {
                setShowInvestigationReports(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Notes" size={14} variant="BoldDuotone" /> Reports
            </button>

            <button
              onClick={() => {
                setShowDarkWebScanner(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? (isLightCream ? "rgba(255,255,255,0.4)" : "rgba(0, 0, 0, 0.05)") : "rgba(0, 0, 0, 0.3)",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Shield" size={14} variant="BoldDuotone" /> Dark Web
            </button>

            <button
              onClick={() => {
                setShowIngestionModal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur bg-black/20 text-[var(--app-text-main)] hover:bg-[var(--app-text-main)]/10 hover:scale-105 active:scale-95 shadow-lg shadow-black/20 animate-pulse"
            >
              <Icon name="Import" size={14} variant="BoldDuotone" /> Import
            </button>

            <button
              onClick={() => {
                setShowCodeEditor(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Programming" size={14} variant="BoldDuotone" /> IDE
            </button>

            <button
              onClick={() => {
                setShowPredictionTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Chart" size={14} variant="BoldDuotone" /> Prediction
            </button>

            <button
              onClick={() => {
                setShowLucaLinkModal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur hover:scale-105 active:scale-95 shadow-lg shadow-black/20 animate-pulse"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Smartphone" size={14} variant="BoldDuotone" /> Link Bridge
            </button>

            <button
              onClick={() => {
                setShowCryptoTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Wallet" size={14} variant="BoldDuotone" /> DeFi
            </button>

            <button
              onClick={() => {
                setShowForexTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.5))" : "rgba(0, 0, 0, var(--app-bg-opacity, 0.3))",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Bank" size={14} variant="BoldDuotone" /> FX
            </button>

            <button
              onClick={() => {
                setShowOsintDossier(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? (isLightCream ? "rgba(255,255,255,0.4)" : "rgba(0, 0, 0, 0.05)") : "rgba(0, 0, 0, 0.2)",
                color: isLightCream ? "#4a483f" : "var(--app-text-main)"
              }}
            >
              <Icon name="Search" size={14} variant="BoldDuotone" /> OSINT
            </button>

            <button
              onClick={() => {
                setShowHackingTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
              style={{
                backgroundColor: isLight ? (isLightCream ? "rgba(255,255,255,0.4)" : "rgba(0, 0, 0, 0.05)") : "rgba(0, 0, 0, 0.2)",
                color: isLightCream ? "#ef4444" : "#ef4444"
              }}
            >
              <Icon name="Shield" size={14} variant="BoldDuotone" color="#ef4444" /> Ethical Hacking
            </button>

            {installedModules.map((mod, i) => (
              <div
                key={i}
                className="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all tech-border glass-blur shadow-lg shadow-black/20 italic"
                style={{
                  backgroundColor: isLight ? (isLightCream ? "rgba(255,255,255,0.4)" : "rgba(0, 0, 0, 0.05)") : "rgba(0, 0, 0, 0.2)",
                  color: isLightCream ? "#4a483f" : "var(--app-text-main)"
                }}
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
      {/* FOOTER WRAPPER */}
          </>
        );
      })()}
    </section>
  );
};

export default OperationsSidebar;
