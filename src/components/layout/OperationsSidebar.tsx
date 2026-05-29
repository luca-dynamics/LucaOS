import React from "react";
import SystemMonitor from "../SystemMonitor";
import SystemRailSection from "../left-panel/SystemRailSection";
import QuickActionsSection from "../left-panel/QuickActionsSection";
import DevicesSection from "../left-panel/DevicesSection";
import ToolLauncherSection from "../left-panel/ToolLauncherSection";
import type { LeftPanelToolActionKey, LeftPanelToolItem } from "../left-panel/leftPanelModel";
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

/**
 * Left "System & Tools Rail".
 *
 * Product split:
 *   LEFT   = system / tools / devices (this component)
 *   CENTER = chat / voice interaction
 *   RIGHT  = CONTROL | ACTIVITY | MEMORY | LOGS agent control plane
 *
 * This component is mostly orchestration: it owns the launcher callbacks and
 * renders the extracted left-panel sections (SYSTEM, QUICK ACTIONS, DEVICES,
 * TOOLS). It does not execute anything on render — only button clicks invoke
 * the existing callbacks below.
 */
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
  const isLightCream = theme?.themeName?.toLowerCase() === "lightcream";
  const isLight = Boolean(theme?.isLight);

  // Existing launcher callbacks, preserved 1:1 from the old flat button cloud.
  // Each is invoked only on a real click via ToolLauncherSection.
  const toolActions: Record<LeftPanelToolActionKey, () => void> = {
    openSkills: () => {
      setShowSkillsMatrix(true);
      soundService.play("KEYSTROKE");
    },
    openApps: () => {
      setShowAppExplorer(true);
      soundService.play("KEYSTROKE");
    },
    openScreen: () => {
      if ((window as any).electron && (window as any).electron.ipcRenderer) {
        window.electron.ipcRenderer.send("open-visual-core");
        fetch(apiUrl("/api/vision/start"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ captureInterval: 1000 }),
        }).catch((e) => console.error("Failed to start vision service:", e));
        soundService.play("SUCCESS");
      } else {
        console.warn("Visual Core window requires Electron");
      }
    },
    openImport: () => {
      setShowIngestionModal(true);
      soundService.play("KEYSTROKE");
    },
    openIde: () => {
      setShowCodeEditor(true);
      soundService.play("KEYSTROKE");
    },
    openSystemServices: () => {
      setShowSubsystemDashboard(true);
      soundService.play("KEYSTROKE");
    },
    openLinkBridge: () => {
      setShowLucaLinkModal(true);
      soundService.play("KEYSTROKE");
    },
    openSecurity: () => {
      setShowHackingTerminal(true);
      soundService.play("KEYSTROKE");
    },
    openReports: () => {
      setShowInvestigationReports(true);
      soundService.play("KEYSTROKE");
    },
    openOsint: () => {
      setShowOsintDossier(true);
      soundService.play("KEYSTROKE");
    },
    openDarkWeb: () => {
      setShowDarkWebScanner(true);
      soundService.play("KEYSTROKE");
    },
    openTrain: () => {
      soundService.play("KEYSTROKE");
      setShowLucaRecorder(true);
    },
    openDeFi: () => {
      setShowCryptoTerminal(true);
      soundService.play("KEYSTROKE");
    },
    openForex: () => {
      setShowForexTerminal(true);
      soundService.play("KEYSTROKE");
    },
    openStockFeed: () => {
      setStockTerminalSymbol("");
      setShowStockTerminal(true);
      soundService.play("KEYSTROKE");
    },
    openAiTrading: () => {
      setShowTradingTerminal(true);
      soundService.play("KEYSTROKE");
    },
    openPrediction: () => {
      setShowPredictionTerminal(true);
      soundService.play("KEYSTROKE");
    },
    // Visual / preview modules inject sample UI data only — never live data.
    previewSovereignty: () => {
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
    },
    previewSecurity: () => {
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
    },
  };

  const handleToolSelect = (tool: LeftPanelToolItem) => {
    toolActions[tool.actionKey]?.();
  };

  const handleLockdown = () => {
    // Existing behaviour preserved. Lockdown is a high-authority safety tool
    // (toolRegistry: SecurityLevel.LEVEL_3) and is intentionally unchanged.
    // TODO: route direct high-risk actions through the governed action request
    // / provenance gate services instead of calling executeTool directly.
    executeTool("initiateLockdown", {});
    onLockdown?.();
  };

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
        backgroundColor: isLight
          ? isLightCream
            ? "rgba(229, 225, 205, var(--app-bg-opacity, 0.5))"
            : "rgba(255, 255, 255, var(--app-bg-opacity, 0.5))"
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))",
      }}
    >
      {/* Mobile Header for System Panel */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-[var(--app-border-main)]">
          <h2 className="text-[var(--app-text-main)] font-black tracking-[0.3em] text-xs italic uppercase">
            System Center
          </h2>
        </div>
      )}

      {/* SYSTEM — live monitor graph */}
      <div className="flex-none h-[28%] p-4 bg-transparent border-b border-[var(--app-border-main)]">
        <SystemMonitor
          audioListenMode={isListeningAmbient}
          connected={connectionTier !== "OFFLINE"}
          connectionTier={connectionTier}
        />
      </div>

      {/* Scrollable rail: SYSTEM health · QUICK ACTIONS · DEVICES · TOOLS */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6 no-scrollbar">
        <SystemRailSection isMobile={isMobile} connectionTier={connectionTier} />

        <QuickActionsSection
          isLight={isLight}
          isLightCream={isLightCream}
          onAgentMode={() => {
            setShowAgentMode(true);
            soundService.play("KEYSTROKE");
          }}
          onCognitiveEngine={() => {
            setShowThoughtProcess(true);
            soundService.play("KEYSTROKE");
          }}
          onLockdown={handleLockdown}
        />

        <DevicesSection
          devices={devices}
          isLight={isLight}
          onControlClick={handleDeviceControlClick}
        />

        <ToolLauncherSection
          installedModules={installedModules}
          isLight={isLight}
          isLightCream={isLightCream}
          onToolSelect={handleToolSelect}
        />
      </div>
    </section>
  );
};

export default OperationsSidebar;
