import React from "react";
import { Icon } from "../../components/ui/Icon";
import AdminGrantModal from "../../components/AdminGrantModal";
import CryptoTerminal from "../../components/CryptoTerminal";
import ForexTerminal from "../../components/ForexTerminal";
import PredictionTerminal from "../../components/PredictionTerminal";
import HackingTerminal from "../../components/HackingTerminal";
import StockTerminal from "../../components/StockTerminal";
import AdvancedTradingTerminal from "../../components/trading/AdvancedTradingTerminal";
import CompetitionPage from "../../components/trading/CompetitionPage";
import AITradersPage from "../../components/trading/AITradersPage";
import {
  canRenderOverlayPanel,
  type OverlayPanelId,
} from "../overlaySurfacePolicy";
import CuratedOriginOverlayPanels from "./CuratedOriginOverlayPanels";

interface OriginOverlayPanelsProps {
  theme: any;
  showAdminGrantModal: boolean;
  adminJustification: string;
  onAdminGrant: () => void;
  onAdminDeny: () => void;
  isLockdown: boolean;
  onLockdownOverride: () => void;
  showAutonomyDashboard: boolean;
  setShowAutonomyDashboard: (show: boolean) => void;
  showAgentMode: boolean;
  setShowAgentMode: (show: boolean) => void;
  showThoughtProcess: boolean;
  setShowThoughtProcess: (show: boolean) => void;
  thoughtNodes: any[];
  showGeoTactical: boolean;
  setShowGeoTactical: (show: boolean) => void;
  trackingTarget: string;
  tacticalMarkers: any[];
  showCryptoTerminal: boolean;
  setShowCryptoTerminal: (show: boolean) => void;
  showForexTerminal: boolean;
  setShowForexTerminal: (show: boolean) => void;
  showPredictionTerminal: boolean;
  setShowPredictionTerminal: (show: boolean) => void;
  polyPositions: any[];
  handlePlaceBet: (id: string, side: string, amount: number) => void;
  showOsintDossier: boolean;
  setShowOsintDossier: (show: boolean) => void;
  osintProfile: any;
  showTVRemote: boolean;
  setShowTVRemote: (show: boolean) => void;
  activeTV: any;
  handleTvCommand: (cmd: string, params: any) => void;
  showWirelessManager: boolean;
  setShowWirelessManager: (show: boolean) => void;
  handleWirelessConnect: (device: any) => void;
  wirelessTab: "BLUETOOTH" | "WIFI";
  showNetworkMap: boolean;
  setShowNetworkMap: (show: boolean) => void;
  showHackingTerminal: boolean;
  setShowHackingTerminal: (show: boolean) => void;
  hackingLogs: any[];
  showSkillsMatrix: boolean;
  setShowSkillsMatrix: (show: boolean) => void;
  handleSkillExecute: (skillName: string, args: any) => Promise<any>;
  showStockTerminal: boolean;
  setShowStockTerminal: (show: boolean) => void;
  stockTerminalSymbol: string;
  showTradingTerminal: boolean;
  setShowTradingTerminal: (show: boolean) => void;
  setShowCompetitionPage: (show: boolean) => void;
  showCompetitionPage: boolean;
  showAITradersPage: boolean;
  setShowAITradersPage: (show: boolean) => void;
  showSubsystemDashboard: boolean;
  setShowSubsystemDashboard: (show: boolean) => void;
}

const OriginOverlayPanels: React.FC<OriginOverlayPanelsProps> = ({
  theme,
  showAdminGrantModal,
  adminJustification,
  onAdminGrant,
  onAdminDeny,
  isLockdown,
  onLockdownOverride,
  showAutonomyDashboard,
  setShowAutonomyDashboard,
  showAgentMode,
  setShowAgentMode,
  showThoughtProcess,
  setShowThoughtProcess,
  thoughtNodes,
  showGeoTactical,
  setShowGeoTactical,
  trackingTarget,
  tacticalMarkers,
  showCryptoTerminal,
  setShowCryptoTerminal,
  showForexTerminal,
  setShowForexTerminal,
  showPredictionTerminal,
  setShowPredictionTerminal,
  polyPositions,
  handlePlaceBet,
  showOsintDossier,
  setShowOsintDossier,
  osintProfile,
  showTVRemote,
  setShowTVRemote,
  activeTV,
  handleTvCommand,
  showWirelessManager,
  setShowWirelessManager,
  handleWirelessConnect,
  wirelessTab,
  showNetworkMap,
  setShowNetworkMap,
  showHackingTerminal,
  setShowHackingTerminal,
  hackingLogs,
  showSkillsMatrix,
  setShowSkillsMatrix,
  handleSkillExecute,
  showStockTerminal,
  setShowStockTerminal,
  stockTerminalSymbol,
  showTradingTerminal,
  setShowTradingTerminal,
  setShowCompetitionPage,
  showCompetitionPage,
  showAITradersPage,
  setShowAITradersPage,
  showSubsystemDashboard,
  setShowSubsystemDashboard,
}) => {
  const shouldRender = (panelId: OverlayPanelId) =>
    canRenderOverlayPanel(panelId, { enforceBoundary: true });

  return (
    <>
      {showAdminGrantModal && shouldRender("adminGrant") && (
        <AdminGrantModal
          justification={adminJustification}
          onGrant={onAdminGrant}
          onDeny={onAdminDeny}
        />
      )}

      {isLockdown && shouldRender("lockdown") && (
        <div className="absolute inset-0 z-[900] bg-red-950/90 flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
          <div className="border-4 border-red-500 p-12 rounded-lg bg-[var(--app-bg-tint)] flex flex-col items-center shadow-[0_0_100px_#ef4444] animate-pulse">
            <Icon
              name="ShieldAlert"
              size={128}
              className="text-red-500 mb-6"
              variant="BoldDuotone"
            />
            <h1 className="text-6xl font-display font-bold text-red-500 tracking-[0.2em] mb-4">
              LOCKDOWN
            </h1>
            <div className="text-2xl font-mono text-red-400 tracking-widest mb-8">
              DEFENSE PROTOCOL ALPHA ACTIVE
            </div>
            <div className="mt-8 text-xs text-red-500/50 font-mono pointer-events-auto">
              <button
                onClick={onLockdownOverride}
                className="border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-[color:var(--app-text-main)] transition-colors"
              >
                OVERRIDE AUTH CODE: OMEGA-9
              </button>
            </div>
          </div>
        </div>
      )}

      {showCryptoTerminal && shouldRender("cryptoTerminal") && (
        <CryptoTerminal
          onClose={() => setShowCryptoTerminal(false)}
          theme={theme}
        />
      )}

      {showForexTerminal && shouldRender("forexTerminal") && (
        <ForexTerminal
          onClose={() => setShowForexTerminal(false)}
          theme={theme}
        />
      )}

      {showPredictionTerminal && shouldRender("predictionTerminal") && (
        <PredictionTerminal
          positions={polyPositions}
          onBet={handlePlaceBet}
          onClose={() => setShowPredictionTerminal(false)}
          theme={theme}
        />
      )}

      {showHackingTerminal && shouldRender("hackingTerminal") && (
        <HackingTerminal
          onClose={() => setShowHackingTerminal(false)}
          toolLogs={hackingLogs}
          themeId={theme.themeName}
        />
      )}

      {showStockTerminal && shouldRender("stockTerminal") && (
        <StockTerminal
          onClose={() => setShowStockTerminal(false)}
          initialSymbol={stockTerminalSymbol}
          theme={theme}
        />
      )}

      {showTradingTerminal && shouldRender("tradingTerminal") && (
        <AdvancedTradingTerminal
          onClose={() => setShowTradingTerminal(false)}
          onOpenCompetition={() => {
            setShowTradingTerminal(false);
            setShowCompetitionPage(true);
          }}
          theme={theme}
        />
      )}

      {showCompetitionPage && shouldRender("competitionPage") && (
        <CompetitionPage
          onClose={() => setShowCompetitionPage(false)}
          theme={theme}
        />
      )}

      {showAITradersPage && shouldRender("aiTradersPage") && (
        <AITradersPage onClose={() => setShowAITradersPage(false)} />
      )}

      <CuratedOriginOverlayPanels
        theme={theme}
        showAutonomyDashboard={showAutonomyDashboard}
        setShowAutonomyDashboard={setShowAutonomyDashboard}
        showAgentMode={showAgentMode}
        setShowAgentMode={setShowAgentMode}
        showThoughtProcess={showThoughtProcess}
        setShowThoughtProcess={setShowThoughtProcess}
        thoughtNodes={thoughtNodes}
        showGeoTactical={showGeoTactical}
        setShowGeoTactical={setShowGeoTactical}
        trackingTarget={trackingTarget}
        tacticalMarkers={tacticalMarkers}
        showOsintDossier={showOsintDossier}
        setShowOsintDossier={setShowOsintDossier}
        osintProfile={osintProfile}
        showTVRemote={showTVRemote}
        setShowTVRemote={setShowTVRemote}
        activeTV={activeTV}
        handleTvCommand={handleTvCommand}
        showWirelessManager={showWirelessManager}
        setShowWirelessManager={setShowWirelessManager}
        handleWirelessConnect={handleWirelessConnect}
        wirelessTab={wirelessTab}
        showNetworkMap={showNetworkMap}
        setShowNetworkMap={setShowNetworkMap}
        showSkillsMatrix={showSkillsMatrix}
        setShowSkillsMatrix={setShowSkillsMatrix}
        handleSkillExecute={handleSkillExecute}
        showSubsystemDashboard={showSubsystemDashboard}
        setShowSubsystemDashboard={setShowSubsystemDashboard}
      />
    </>
  );
};

export default OriginOverlayPanels;
