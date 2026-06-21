import React from "react";
import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  shouldCollapseLeftPanelGroup,
  shouldShowLeftPanelGroup,
} from "../../experience/dashboardDisclosure";
import SystemMonitor from "../SystemMonitor";
import SystemRailSection from "../left-panel/SystemRailSection";
import QuickActionsSection from "../left-panel/QuickActionsSection";
import DevicesSection from "../left-panel/DevicesSection";
import ToolLauncherSection from "../left-panel/ToolLauncherSection";
import type {
  LeftPanelToolActionKey,
  LeftPanelToolItem,
} from "../left-panel/leftPanelModel";
import { soundService } from "../../services/soundService";
import {
  lucaMobileContentSurfaceStyle,
  lucaMobileDividerStyle,
  lucaMobileMutedTextStyle,
} from "../../styles/lucaMobileShellStyles";
import { resolveLucaSidebarMaterial } from "../../styles/lucaMaterialSystem";
import { apiUrl } from "../../config/api";
import { readCurrentWebAccessPolicy } from "../../config/webAccessPolicy";
import {
  createDisabledWebRuntimeAction,
  resolveWebRuntimeCapabilities,
} from "../../config/webRuntimeCapabilities";

interface OperationsSidebarProps {
  experienceMode: LucaExperienceMode;
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
  experienceMode,
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
  const webAccessPolicy = readCurrentWebAccessPolicy();
  const isBrowserSafeWebInterface = webAccessPolicy.shouldRenderBrowserSafeApp;
  const webCapabilities = resolveWebRuntimeCapabilities({
    isWebRuntime: isBrowserSafeWebInterface,
    hasConfiguredPublicApi: webAccessPolicy.hasConfiguredPublicApi,
    hasAuthenticatedSession: webAccessPolicy.hasAuthenticatedSession,
  });

  const warnDisabledWebAction = (capabilityId: keyof typeof webCapabilities) => {
    const result = createDisabledWebRuntimeAction(webCapabilities[capabilityId]);
    console.warn("[WEB RUNTIME] Disabled browser action", result);
    return result;
  };

  // Existing launcher callbacks, preserved 1:1 from the old flat button cloud.
  // Each is invoked only on a real click via ToolLauncherSection.
  const toolActions: Record<LeftPanelToolActionKey, () => void> = {
    openSkills: () => {
      setShowSkillsMatrix(true);
      soundService.play("KEYSTROKE");
    },
    openApps: () => {
      if (isBrowserSafeWebInterface) warnDisabledWebAction("modelManager");
      setShowAppExplorer(true);
      soundService.play("KEYSTROKE");
    },
    openScreen: () => {
      if (isBrowserSafeWebInterface) {
        warnDisabledWebAction("lucaScreen");
        setVisualData({
          topic: "WEB_SAFE_LUCA_SCREEN",
          type: "GENERAL",
          title: "LucaScreen · Browser-safe visual shell",
          layout: "GRID",
          items: [
            { label: "Desktop overlay", value: "Requires LucaOS Desktop" },
            { label: "Host execution", value: "Disabled in web" },
            { label: "Secure bridge", value: "Future authenticated pairing" },
          ],
        });
        soundService.play("KEYSTROKE");
        return;
      }

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
      if (isBrowserSafeWebInterface) warnDisabledWebAction("fileSystemAccess");
      setShowCodeEditor(true);
      soundService.play("KEYSTROKE");
    },
    openSystemServices: () => {
      if (isBrowserSafeWebInterface) warnDisabledWebAction("desktopControl");
      setShowSubsystemDashboard(true);
      soundService.play("KEYSTROKE");
    },
    openLinkBridge: () => {
      if (isBrowserSafeWebInterface) warnDisabledWebAction("lucaLink");
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
    if (isBrowserSafeWebInterface) {
      warnDisabledWebAction("desktopControl");
      return;
    }

    executeTool("initiateLockdown", {});
    onLockdown?.();
  };

  const showRuntimeDiagnostics = shouldShowLeftPanelGroup(
    experienceMode,
    "runtime-diagnostics",
  );
  const collapseAdvancedTools = shouldCollapseLeftPanelGroup(
    experienceMode,
    "advanced-tools",
  );

  const systemSection = (
    <SystemRailSection
      isMobile={isMobile}
      connectionTier={connectionTier}
      showRuntimeDiagnostics={showRuntimeDiagnostics}
    />
  );
  const quickActionsSection = (
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
  );
  const devicesSection = (
    <DevicesSection
      devices={devices}
      isLight={isLight}
      onControlClick={handleDeviceControlClick}
    />
  );
  const toolLauncherSection = (
    <ToolLauncherSection
      installedModules={installedModules}
      isLight={isLight}
      isLightCream={isLightCream}
      collapseAdvancedGroups={collapseAdvancedTools}
      onToolSelect={handleToolSelect}
    />
  );

  return (
    <section
      className={`${
        isMobile
          ? activeMobileTab === "SYSTEM"
            ? "flex w-full"
            : "hidden"
          : "flex"
      } flex-col h-full overflow-hidden z-10 rounded-lg ${isMobile ? "" : "glass-blur"}`}
      style={resolveLucaSidebarMaterial(isMobile)}
    >
      {/* Mobile Header for System Panel */}
      {isMobile && (
        <div
          className="flex items-center justify-between p-4 border-b"
          style={lucaMobileDividerStyle}
        >
          <h2
            className="font-black tracking-[0.3em] text-xs italic uppercase"
            style={lucaMobileMutedTextStyle}
          >
            System Center
          </h2>
        </div>
      )}

      {/* Detailed live telemetry is disclosed only in Pro/Creator. */}
      {showRuntimeDiagnostics && (
        <div
          className="flex-none h-[28%] p-4 border-b"
          style={
            isMobile
              ? { ...lucaMobileContentSurfaceStyle, ...lucaMobileDividerStyle }
              : undefined
          }
        >
          <SystemMonitor
            audioListenMode={isListeningAmbient}
            connected={connectionTier !== "OFFLINE"}
            connectionTier={connectionTier}
          />
        </div>
      )}

      {/* Basic prioritizes common actions; Pro/Creator retain the operator order. */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6 no-scrollbar">
        {experienceMode === "basic" ? (
          <>
            {quickActionsSection}
            {devicesSection}
            {toolLauncherSection}
            {systemSection}
          </>
        ) : (
          <>
            {systemSection}
            {quickActionsSection}
            {devicesSection}
            {toolLauncherSection}
          </>
        )}
      </div>
    </section>
  );
};

export default OperationsSidebar;
