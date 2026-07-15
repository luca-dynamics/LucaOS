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
import {
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
} from "../../styles/lucaMaterialSystem";

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
        <div
          data-luca-material-role="overlay"
          className="absolute inset-0 z-[900] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none"
        >
          <div
            data-luca-material-role="dialog"
            className="border-4 p-12 rounded-lg flex flex-col items-center animate-pulse"
            style={{
              ...lucaMaterialDialogStyle,
              borderColor:
                "color-mix(in srgb, var(--luca-danger,#f87171) 32%, transparent)",
              boxShadow: "0 0 100px var(--luca-danger,#f87171)",
            }}
          >
            <Icon
              name="ShieldAlert"
              size={128}
              className="text-[var(--luca-danger,#f87171)] mb-6"
              variant="BoldDuotone"
            />
            <h1 className="text-6xl font-display font-bold text-[var(--luca-danger,#f87171)] tracking-[0.2em] mb-4">
              LOCKDOWN
            </h1>
            <div className="text-2xl font-mono text-[var(--luca-danger,#f87171)] tracking-widest mb-8">
              DEFENSE PROTOCOL ALPHA ACTIVE
            </div>
            <div className="mt-8 text-xs text-[var(--luca-danger,#f87171)] font-mono pointer-events-auto">
              <button
                onClick={onLockdownOverride}
                data-luca-material-role="control"
                className="luca-shell-control border px-4 py-2"
                style={{
                  ...lucaMaterialControlStyle,
                  borderColor:
                    "color-mix(in srgb, var(--luca-danger,#f87171) 32%, transparent)",
                  color: "var(--luca-danger,#f87171)",
                }}
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
        showSubsystemDashboard={showSubsystemDashboard}
        setShowSubsystemDashboard={setShowSubsystemDashboard}
      />
    </>
  );
};

export default OriginOverlayPanels;
