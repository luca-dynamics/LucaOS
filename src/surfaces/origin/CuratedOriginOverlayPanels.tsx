import React from "react";
import { AutonomyDashboard } from "../../components/AutonomyDashboard";
import AgentModePanel from "../../components/AgentModePanel";
import ThoughtProcessPanel from "../../components/ThoughtProcessPanel";
import GeoTacticalView from "../../components/GeoTacticalView";
import OsintDossier from "../../components/OsintDossier";
import SmartTVRemote from "../../components/SmartTVRemote";
import WirelessManager from "../../components/WirelessManager";
import NetworkMap from "../../components/NetworkMap";
import SkillsMatrix from "../../components/SkillsMatrix";
import SubsystemDashboard from "../../components/SubsystemDashboard";
import {
  canRenderOverlayPanel,
  type OverlayPanelId,
} from "../overlaySurfacePolicy";

interface CuratedOriginOverlayPanelsProps {
  theme: any;
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
  showSkillsMatrix: boolean;
  setShowSkillsMatrix: (show: boolean) => void;
  handleSkillExecute: (skillName: string, args: any) => Promise<any>;
  showSubsystemDashboard: boolean;
  setShowSubsystemDashboard: (show: boolean) => void;
}

const CuratedOriginOverlayPanels: React.FC<CuratedOriginOverlayPanelsProps> = ({
  theme,
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
  showSkillsMatrix,
  setShowSkillsMatrix,
  handleSkillExecute,
  showSubsystemDashboard,
  setShowSubsystemDashboard,
}) => {
  const shouldRender = (panelId: OverlayPanelId) =>
    canRenderOverlayPanel(panelId, { enforceBoundary: true });

  return (
    <>
      {showAutonomyDashboard && shouldRender("autonomyDashboard") && (
        <AutonomyDashboard
          onClose={() => setShowAutonomyDashboard(false)}
          theme={theme}
        />
      )}

      {showAgentMode && shouldRender("agentMode") && (
        <AgentModePanel
          task={null}
          onClose={() => setShowAgentMode(false)}
          theme={{
            hex: theme?.hex || "#8b5cf6",
            primary: theme?.primary || theme?.hex || "#8b5cf6",
            border:
              theme?.border || `${theme?.hex}40` || "rgba(139,92,246,0.25)",
            bg: theme?.bg || "rgba(0,0,0,0.4)",
          }}
        />
      )}

      {showThoughtProcess && shouldRender("thoughtProcess") && (
        <ThoughtProcessPanel
          nodes={thoughtNodes}
          onClose={() => setShowThoughtProcess(false)}
        />
      )}

      {showGeoTactical && shouldRender("geoTactical") && (
        <GeoTacticalView
          targetName={trackingTarget}
          markers={tacticalMarkers}
          onClose={() => setShowGeoTactical(false)}
        />
      )}

      {showOsintDossier && shouldRender("osintDossier") && (
        <OsintDossier
          profile={osintProfile}
          onClose={() => setShowOsintDossier(false)}
          theme={theme}
        />
      )}

      {showTVRemote && shouldRender("tvRemote") && (
        <SmartTVRemote
          device={activeTV}
          onClose={() => setShowTVRemote(false)}
          onCommand={handleTvCommand}
          theme={theme}
        />
      )}

      {showWirelessManager && shouldRender("wirelessManager") && (
        <WirelessManager
          onClose={() => setShowWirelessManager(false)}
          onConnect={handleWirelessConnect}
          activeTab={wirelessTab}
          theme={theme}
        />
      )}

      {showNetworkMap && shouldRender("networkMap") && (
        <NetworkMap onClose={() => setShowNetworkMap(false)} />
      )}

      {showSkillsMatrix && shouldRender("skillsMatrix") && (
        <SkillsMatrix
          onClose={() => setShowSkillsMatrix(false)}
          theme={theme}
          onExecute={handleSkillExecute}
        />
      )}

      {showSubsystemDashboard && shouldRender("subsystemDashboard") && (
        <SubsystemDashboard
          onClose={() => setShowSubsystemDashboard(false)}
          theme={theme}
        />
      )}
    </>
  );
};

export default CuratedOriginOverlayPanels;
