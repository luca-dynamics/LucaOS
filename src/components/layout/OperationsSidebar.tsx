import React from "react";
import {
  Activity,
  Eye,
  Lock,
  Cpu,
  Box,
  BrainCircuit,
  Globe,
  Shield,
  Monitor,
  TrendingUp,
  Brain,
  FileText,
  Download,
  Code2,
  BarChart3,
  Smartphone,
  Wallet,
  Landmark,
  Search,
  ShieldAlert,
} from "lucide-react";
import SystemMonitor from "../SystemMonitor";
import SmartDeviceCard from "../SmartDeviceCard";
import { soundService } from "../../services/soundService";
import { getGlassStyle } from "../../utils/uiUtils";
import { apiUrl } from "../../config/api";
import { setHexAlpha } from "../../config/themeColors";

interface OperationsSidebarProps {
  theme: any;
  isMobile: boolean;
  activeMobileTab: string;
  isListeningAmbient: boolean;
  isLocalCoreConnected: boolean;
  isProcessing: boolean;
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
}

const OperationsSidebar: React.FC<OperationsSidebarProps> = ({
  theme,
  isMobile,
  activeMobileTab,
  isListeningAmbient,
  isLocalCoreConnected,
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
}) => {
  return (
    <section
      className={`${
        isMobile
          ? activeMobileTab === "SYSTEM"
            ? "flex w-full"
            : "hidden"
          : "flex"
      } flex-col h-full overflow-hidden ${
        theme.themeName?.toLowerCase() === "lucagent"
          ? "glass-panel-light tech-border-light"
          : "glass-panel tech-border"
      } ${theme.primary} z-10`}
      style={
        !isMobile
          ? {
              borderRight: `1px solid ${setHexAlpha(theme.hex, 0.2)}`,
              background:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(255, 255, 255, 0.5)"
                  : "rgba(0, 0, 0, var(--app-bg-opacity, 0.4))",
            }
          : {}
      }
    >
      {/* Mobile Header for System Panel */}
      {isMobile && (
        <div
          className={`flex items-center justify-between p-4 border-b ${theme.border}/50`}
        >
          <h2 className={`${theme.primary} font-bold tracking-widest text-sm`}>
            SYSTEM CONTROL
          </h2>
        </div>
      )}

      {/* System Monitor Area */}
      <div
        className={`flex-none h-[28%] p-4 bg-transparent`}
        style={{ borderBottom: `1px solid ${setHexAlpha(theme.hex, 0.2)}` }}
      >
        <SystemMonitor
          audioListenMode={isListeningAmbient}
          connected={isLocalCoreConnected}
          theme={theme}
        />
      </div>

      {/* Devices & Ops Grid */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Agent Operations */}
        <div
          className={`p-4 rounded-md relative overflow-hidden group`}
          style={{
            ...getGlassStyle(theme, false),
            background:
              theme.themeName?.toLowerCase() === "lucagent"
                ? "rgba(255, 255, 255, calc(var(--app-bg-opacity, 0.3) * 0.3))" // maintain relative dimming
                : "rgba(0, 0, 0, calc(var(--app-bg-opacity, 0.25) * 0.3))", // maintain relative dimming
          }}
        >
          <div className={`absolute top-0 right-0 p-1 ${theme.primary}`}>
            <Activity size={12} />
          </div>
          <div
            className={`flex items-center gap-2 mb-3 opacity-90 ${theme.primary}`}
          >
            <Eye size={16} />
            <h2 className="font-display font-bold tracking-widest text-sm">
              LUCA OPS
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setWirelessTab("BLUETOOTH");
                setShowWirelessManager(true);
                soundService.play("KEYSTROKE");
              }}
              className={`p-2 sm:p-3 min-h-[60px] sm:min-h-[50px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color =
                  theme.themeName?.toLowerCase() === "lucagent" ? theme.hex : "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <span className="text-[10px] tracking-wider transition-colors text-slate-500">
                WIRELESS
              </span>
              <span
                className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"}`}
              >
                INTERCEPT
              </span>
              <div className="h-0.5 w-full bg-slate-800 mt-1 overflow-hidden">
                <div
                  className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace(
                    "dim",
                    "500",
                  )}`}
                ></div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowNetworkMap(true);
                soundService.play("KEYSTROKE");
              }}
              className={`p-2 sm:p-3 min-h-[60px] sm:min-h-[50px] flex flex-col gap-1 transition-all text-left group/btn touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color =
                  theme.themeName?.toLowerCase() === "lucagent" ? theme.hex : "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <span className="text-[10px] tracking-wider transition-colors text-slate-500">
                TOPOLOGY
              </span>
              <span
                className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"}`}
              >
                NET MAP
              </span>
              <div className="h-0.5 w-full bg-slate-800 mt-1 overflow-hidden">
                <div
                  className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace(
                    "dim",
                    "500",
                  )}`}
                ></div>
              </div>
            </button>

            {/* MANUAL LOCKDOWN TRIGGER */}
            <button
              onClick={() => executeTool("initiateLockdown", {})}
              className={`col-span-2 p-2 flex items-center justify-center gap-2 transition-all group/btn`}
              style={{
                ...getGlassStyle(theme, false, true),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.3)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Lock
                size={12}
                className="text-red-500 group-hover/btn:animate-pulse"
              />
              <span className="text-xs font-bold text-red-500 tracking-widest">
                INITIATE LOCKDOWN
              </span>
            </button>
          </div>
        </div>

        <div>
          <div
            className={`flex items-center gap-2 mb-4 opacity-80 ${theme.primary}`}
          >
            <Cpu size={16} />
            <h2 className="font-display font-bold tracking-widest">
              LUCA FACILITY CONTROL
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {devices.map((device) => (
              <SmartDeviceCard
                key={device.id}
                device={device}
                onControlClick={handleDeviceControlClick}
                themeColor={theme.primary}
                themeBorder={theme.border}
                themeBg={theme.bg}
                themeName={theme.themeName}
              />
            ))}
          </div>
        </div>

        {/* Luca Expansion Section */}
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <div
            className={`flex items-center gap-2 mb-4 opacity-80 ${theme.primary}`}
          >
            <Box size={16} />
            <h2 className="font-display font-bold tracking-widest">
              LUCA EXPANSION
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowSkillsMatrix(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <BrainCircuit size={14} />
              SKILLS
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
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Globe size={14} />
              SOVEREIGNTY
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
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Shield size={14} />
              SECURITY
            </button>
            <button
              onClick={() => {
                setShowAppExplorer(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Box size={14} />
              APPS
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
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Monitor size={14} />
              SCREEN
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundService.play("KEYSTROKE");
                setShowLucaRecorder(true);
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Eye size={14} />
              TRAIN
            </button>
            <button
              onClick={() => {
                setStockTerminalSymbol("");
                setShowStockTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <TrendingUp size={10} /> STOCK MARKET FEED
            </button>
            <button
              onClick={() => {
                setShowTradingTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Brain size={10} /> AI TRADING
            </button>
            <button
              onClick={() => {
                setShowSubsystemDashboard(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Activity size={10} /> SUBSYSTEMS
            </button>

            <button
              onClick={() => {
                setShowInvestigationReports(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <FileText size={10} /> REPORTS
            </button>

            <button
              onClick={() => {
                setShowIngestionModal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors animate-pulse`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Download size={10} /> IMPORT MODULE
            </button>

            <button
              onClick={() => {
                setShowCodeEditor(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Code2 size={10} /> LUCA IDE
            </button>

            <button
              onClick={() => {
                setShowPredictionTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors touch-manipulation`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <BarChart3 size={10} /> PREDICTIONS
            </button>

            <button
              onClick={() => {
                setShowLucaLinkModal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors animate-pulse`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Smartphone size={10} /> LINK BRIDGE
            </button>

            <button
              onClick={() => {
                setShowCryptoTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Wallet size={10} /> DEFI WALLET
            </button>

            <button
              onClick={() => {
                setShowForexTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Landmark size={10} /> FX DESK
            </button>

            <button
              onClick={() => {
                setShowOsintDossier(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color =
                  theme.themeName?.toLowerCase() === "lucagent" ? theme.hex : "#ffffff";
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
                e.currentTarget.style.color = "";
              }}
            >
              <Search size={10} /> OSINT
            </button>

            <button
              onClick={() => {
                setShowHackingTerminal(true);
                soundService.play("KEYSTROKE");
              }}
              className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
              style={{
                ...getGlassStyle(theme, false),
                background:
                  theme.themeName?.toLowerCase() === "lucagent"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.25)",
              }}
              onMouseEnter={(e) => {
                const style = getGlassStyle(theme, true);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
              }}
              onMouseLeave={(e) => {
                const style = getGlassStyle(theme, false);
                e.currentTarget.style.borderColor = style.borderColor;
                e.currentTarget.style.boxShadow = style.boxShadow;
              }}
            >
              <ShieldAlert size={10} /> ETHICAL HACKING
            </button>

            {installedModules.map((mod, i) => (
              <div
                key={i}
                className={`${theme.bg} border ${theme.border} ${theme.primary} px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 group transition-colors`}
                style={{
                  ...getGlassStyle(theme, false),
                  background:
                    theme.themeName?.toLowerCase() === "lucagent"
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.25)",
                }}
                onMouseEnter={(e) => {
                  const style = getGlassStyle(theme, true);
                  e.currentTarget.style.borderColor = style.borderColor;
                  e.currentTarget.style.boxShadow = style.boxShadow;
                }}
                onMouseLeave={(e) => {
                  const style = getGlassStyle(theme, false);
                  e.currentTarget.style.borderColor = style.borderColor;
                  e.currentTarget.style.boxShadow = style.boxShadow;
                }}
              >
                <Download
                  size={10}
                  className="opacity-50 group-hover:opacity-100"
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
