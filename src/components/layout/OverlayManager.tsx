import React from "react";
import { Icon } from "../ui/Icon";
import { PresenceMonitor } from "../Awareness/PresenceMonitor";
import { ScreenShare } from "../ScreenShare";
import GhostCursor from "../GhostCursor";
import LiveContentDisplay from "../LiveContentDisplay";
import SecurityGate from "../SecurityGate";
import { parseToolLogsToThoughtNodes } from "../../utils/thoughtParser";
import { getFriendlyVoiceModelLabel } from "../../utils/voiceDisplay";
import { voiceSessionOrchestrator } from "../../services/voiceSessionOrchestrator";
import VoiceHud from "../VoiceHud";
import { VoiceCommandConfirmation } from "../VoiceCommandConfirmation";
import VisionCameraModal from "../VisionCameraModal";
import RemoteAccessModal from "../RemoteAccessModal";
import { DesktopStreamModal } from "../DesktopStreamModal";
import { LucaRecorder } from "../LucaRecorder";
import HumanInputModal from "../HumanInputModal";
import OriginOverlayPanels from "../../surfaces/origin/OriginOverlayPanels";
import SharedOverlayPanels from "../../surfaces/shared/SharedOverlayPanels";

import { awarenessService } from "../../services/awarenessService";
import { settingsService } from "../../services/settingsService";
import { soundService } from "../../services/soundService";
import { lucaService } from "../../services/lucaService";
import { voiceCommandService } from "../../services/voiceCommandService";
import { taskQueue } from "../../services/taskQueueService";
import { Sender, SystemStatus } from "../../types";
import { apiUrl } from "../../config/api";
import { MissionScope } from "../../services/toolRegistry";

interface OverlayManagerProps {
  theme: any;
  persona: string;
  bootSequence: string;
  ambientVisionActive: boolean;
  presenceMode: string;
  isScreenSharing: boolean;
  setIsScreenSharing: (active: boolean) => void;
  handleScreenFrame: (frame: string) => void;
  screenShareRef: React.RefObject<any>;
  activeAutonomousAction: any;
  backgroundImage: string | null;
  ghostCursor: any;
  isRebooting: boolean;
  isVoiceMode: boolean;
  liveContent: any;
  setLiveContent: (content: any) => void;
  approvalRequest: any;
  setApprovalRequest: (request: any) => void;
  showAdminGrantModal: boolean;
  setShowAdminGrantModal: (show: boolean) => void;
  adminJustification: string;
  setIsAdminMode: (admin: boolean) => void;
  setToolLogs: React.Dispatch<React.SetStateAction<any[]>>;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  showWhatsAppManager: boolean;
  setShowWhatsAppManager: (show: boolean) => void;
  showTelegramManager: boolean;
  setShowTelegramManager: (show: boolean) => void;
  showTwitterManager: boolean;
  setShowTwitterManager: (show: boolean) => void;
  showInstagramManager: boolean;
  setShowInstagramManager: (show: boolean) => void;
  showLinkedInManager: boolean;
  setShowLinkedInManager: (show: boolean) => void;
  showDiscordManager: boolean;
  setShowDiscordManager: (show: boolean) => void;
  showYouTubeManager: boolean;
  setShowYouTubeManager: (show: boolean) => void;
  showWeChatManager: boolean;
  setShowWeChatManager: (show: boolean) => void;
  showLucaLinkModal: boolean;
  setShowLucaLinkModal: (show: boolean) => void;
  localIp: string;
  showProfileManager: boolean;
  setShowProfileManager: (show: boolean) => void;
  handleSaveProfile: (profile: any) => void;
  userProfile: any;
  showCodeEditor: boolean;
  setShowCodeEditor: (show: boolean) => void;
  currentCwd: string;
  showIngestionModal: boolean;
  setShowIngestionModal: (show: boolean) => void;
  handleIngest: (data: any) => void;
  ingestionState: any;
  isLockdown: boolean;
  setIsLockdown: (lockdown: boolean) => void;
  setSystemStatus: (status: SystemStatus) => void;
  showAutonomyDashboard: boolean;
  setShowAutonomyDashboard: (show: boolean) => void;
  showAgentMode: boolean;
  setShowAgentMode: (show: boolean) => void;
  showThoughtProcess: boolean;
  setShowThoughtProcess: (show: boolean) => void;
  toolLogs: any[];
  showVoiceHud: boolean;
  toggleVoiceMode: () => void;
  voiceTranscript: string;
  setVoiceTranscript: (transcript: string) => void;
  voiceTranscriptSource: string;
  setVoiceTranscriptSource: (source: "user" | "model") => void;
  voiceBackend: string;
  localVadActive: boolean;
  isVadActive: boolean;
  voiceSearchResults: any[];
  visualData: any;
  setVisualData: (data: any) => void;
  voiceStatus: string;
  voiceHubError: string;
  voiceModel: string;
  isVisionActive: boolean;
  pendingCommand: any;
  setPendingCommand: (command: any) => void;
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  setAttachedImage: (image: any) => void;
  showRemoteModal: boolean;
  setShowRemoteModal: (show: boolean) => void;
  remoteCode: string;
  handleRemoteSuccess: () => void;
  showDesktopStream: boolean;
  setShowDesktopStream: (show: boolean) => void;
  desktopTarget: string;
  isLocalCoreConnected: boolean;
  localCoreReadinessLevel: "ready" | "limited" | "offline";
  localCoreReadinessReason: string;
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
  executeTool: (toolName: string, args: any) => Promise<any>;
  showWirelessManager: boolean;
  setShowWirelessManager: (show: boolean) => void;
  handleWirelessConnect: (device: any) => void;
  wirelessTab: "BLUETOOTH" | "WIFI";
  showAppExplorer: boolean;
  setShowAppExplorer: (show: boolean) => void;
  showMobileFileBrowser: boolean;
  setShowMobileFileBrowser: (show: boolean) => void;
  showMobileManager: boolean;
  setShowMobileManager: (show: boolean) => void;
  activeMobileDevice: any;
  showNetworkMap: boolean;
  setShowNetworkMap: (show: boolean) => void;
  showHackingTerminal: boolean;
  setShowHackingTerminal: (show: boolean) => void;
  hackingLogs: any[];
  showSkillsMatrix: boolean;
  setShowSkillsMatrix: (show: boolean) => void;
  showLucaRecorder: boolean;
  setShowLucaRecorder: (show: boolean) => void;
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
  humanInputModal: any;
  setHumanInputModal: (modal: any) => void;
  handleHumanInputSubmit: (input: string) => void;
  elevationState?: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
  };
}

function normalizePersonaDisplay(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "ASSISTANT";

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (
      entries.length > 0 &&
      entries.every(
        ([key, item]) => /^\d+$/.test(key) && typeof item === "string",
      )
    ) {
      return entries
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, item]) => item)
        .join("");
    }
  }

  const fallback = String(value).trim();
  return fallback && fallback !== "[object Object]" ? fallback : "ASSISTANT";
}

const OverlayManager: React.FC<OverlayManagerProps> = (props) => {
  const {
    theme,
    persona,
    ambientVisionActive,
    presenceMode,
    isScreenSharing,
    setIsScreenSharing,
    handleScreenFrame,
    screenShareRef,
    activeAutonomousAction,
    backgroundImage,
    ghostCursor,
    isRebooting,
    isVoiceMode,
    liveContent,
    setLiveContent,
    approvalRequest,
    setApprovalRequest,
    showAdminGrantModal,
    setShowAdminGrantModal,
    adminJustification,
    setIsAdminMode,
    setToolLogs,
    setMessages,
    showWhatsAppManager,
    setShowWhatsAppManager,
    showTelegramManager,
    setShowTelegramManager,
    showTwitterManager,
    setShowTwitterManager,
    showInstagramManager,
    setShowInstagramManager,
    showLinkedInManager,
    setShowLinkedInManager,
    showDiscordManager,
    setShowDiscordManager,
    showYouTubeManager,
    setShowYouTubeManager,
    showWeChatManager,
    setShowWeChatManager,
    showLucaLinkModal,
    setShowLucaLinkModal,
    localIp,
    showProfileManager,
    setShowProfileManager,
    handleSaveProfile,
    userProfile,
    showCodeEditor,
    setShowCodeEditor,
    currentCwd,
    showIngestionModal,
    setShowIngestionModal,
    handleIngest,
    ingestionState,
    isLockdown,
    setIsLockdown,
    setSystemStatus,
    showAutonomyDashboard,
    setShowAutonomyDashboard,
    showAgentMode,
    setShowAgentMode,
    showThoughtProcess,
    setShowThoughtProcess,
    toolLogs,
    showVoiceHud,
    toggleVoiceMode,
    voiceTranscript,
    setVoiceTranscript,
    voiceTranscriptSource,
    setVoiceTranscriptSource,
    voiceBackend,
    localVadActive,
    isVadActive,
    voiceSearchResults,
    visualData,
    setVisualData,
    voiceStatus,
    voiceHubError,
    voiceModel,
    isVisionActive,
    pendingCommand,
    setPendingCommand,
    showCamera,
    setShowCamera,
    setAttachedImage,
    showRemoteModal,
    setShowRemoteModal,
    remoteCode,
    handleRemoteSuccess,
    showDesktopStream,
    setShowDesktopStream,
    desktopTarget,
    isLocalCoreConnected,
    localCoreReadinessLevel,
    localCoreReadinessReason,
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
    executeTool,
    showWirelessManager,
    setShowWirelessManager,
    handleWirelessConnect,
    wirelessTab,
    showAppExplorer,
    setShowAppExplorer,
    showMobileFileBrowser,
    setShowMobileFileBrowser,
    showMobileManager,
    setShowMobileManager,
    activeMobileDevice,
    showNetworkMap,
    setShowNetworkMap,
    showHackingTerminal,
    setShowHackingTerminal,
    hackingLogs,
    showSkillsMatrix,
    setShowSkillsMatrix,
    showLucaRecorder,
    setShowLucaRecorder,
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
    humanInputModal,
    setHumanInputModal,
    handleHumanInputSubmit,
    elevationState,
  } = props;
  const personaLabel = normalizePersonaDisplay(persona);
  const thoughtNodes = parseToolLogsToThoughtNodes(toolLogs);

  return (
    <>
      {/* --- GLOBAL LIQUID BACKGROUND (Default) --- */}
      <PresenceMonitor
        active={ambientVisionActive}
        dutyCycleMs={presenceMode === "WATCHING" ? 1000 : 10000}
        onPresenceChange={(presence, mood) =>
          awarenessService.updatePresence(presence, mood)
        }
      />

      <ScreenShare
        ref={screenShareRef}
        isActive={isScreenSharing}
        onToggle={setIsScreenSharing}
        onFrameCapture={handleScreenFrame}
        theme={theme}
      />

      {activeAutonomousAction && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 glass-blur"
          style={{
            borderColor: `${theme.hex}66`,
            background: `${theme.hex}1a`,
            boxShadow: `0 0 20px ${theme.hex}33`,
          }}
        >
          <Icon name="MagicStick" size={16} className="animate-pulse" variant="BoldDuotone" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest opacity-60">
              Autonomous {activeAutonomousAction.domain}
            </span>
            <span className="text-xs font-bold truncate max-w-[300px]">
              {activeAutonomousAction.intent}
            </span>
          </div>
        </div>
      )}

        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 opacity-40 animate-in fade-in"
          style={{
            backgroundImage: `url(data:image/jpeg;base64,${backgroundImage})`,
            filter: "blur(var(--app-bg-blur, 40px))",
          }}
        />

      <GhostCursor
        x={ghostCursor.x}
        y={ghostCursor.y}
        type={ghostCursor.type}
        isActive={ghostCursor.active}
      />

      {isRebooting && (
        <div
          className={`absolute inset-0 z-[2000] flex flex-col items-center justify-center font-mono animate-in fade-in duration-200 pointer-events-auto transition-all duration-700 glass-blur[20px]`}
          style={{
            background:
              theme.themeName?.toLowerCase() === "lucagent"
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(0, 0, 0, 0.85)",
          }}
        >
          <div
            className="text-4xl font-bold animate-pulse mb-4 tracking-[0.3em] text-center"
            style={{
              color: theme.hex,
              textShadow: `0 0 20px ${theme.hex}80`,
            }}
          >
            SYSTEM REBOOT
          </div>
          <div
            className="w-64 h-2 bg-gray-900/50 rounded overflow-hidden border"
            style={{ borderColor: `${theme.hex}33` }}
          >
            <div
              className="h-full animate-[loading_1.5s_ease-in-out_infinite]"
              style={{ backgroundColor: theme.hex }}
            ></div>
          </div>
          <div
            className="mt-4 text-xs font-mono opacity-60 animate-pulse text-center"
            style={{ color: theme.hex }}
          >
            LOADING LUCA CORE: {personaLabel}...
          </div>
        </div>
      )}

      {!isVoiceMode && liveContent && (
        <LiveContentDisplay
          content={liveContent}
          onClose={() => setLiveContent(null)}
        />
      )}

      {approvalRequest && (
        <SecurityGate
          toolName={approvalRequest.tool}
          args={approvalRequest.args}
          userName={
            settingsService.getOperatorProfile()?.identity.name || "Mac"
          }
          persona={persona as any}
          theme={theme}
          onApprove={() => approvalRequest.resolve(true)}
          onDeny={() => approvalRequest.resolve(false)}
        />
      )}

      <SharedOverlayPanels
        theme={theme}
        showWhatsAppManager={showWhatsAppManager}
        setShowWhatsAppManager={setShowWhatsAppManager}
        showTelegramManager={showTelegramManager}
        setShowTelegramManager={setShowTelegramManager}
        showTwitterManager={showTwitterManager}
        setShowTwitterManager={setShowTwitterManager}
        showInstagramManager={showInstagramManager}
        setShowInstagramManager={setShowInstagramManager}
        showLinkedInManager={showLinkedInManager}
        setShowLinkedInManager={setShowLinkedInManager}
        showDiscordManager={showDiscordManager}
        setShowDiscordManager={setShowDiscordManager}
        showYouTubeManager={showYouTubeManager}
        setShowYouTubeManager={setShowYouTubeManager}
        showWeChatManager={showWeChatManager}
        setShowWeChatManager={setShowWeChatManager}
        showLucaLinkModal={showLucaLinkModal}
        setShowLucaLinkModal={setShowLucaLinkModal}
        localIp={localIp}
        showProfileManager={showProfileManager}
        setShowProfileManager={setShowProfileManager}
        handleSaveProfile={handleSaveProfile}
        userProfile={userProfile}
        showCodeEditor={showCodeEditor}
        setShowCodeEditor={setShowCodeEditor}
        currentCwd={currentCwd}
        showIngestionModal={showIngestionModal}
        setShowIngestionModal={setShowIngestionModal}
        handleIngest={handleIngest}
        ingestionState={ingestionState}
        showAppExplorer={showAppExplorer}
        setShowAppExplorer={setShowAppExplorer}
        showMobileFileBrowser={showMobileFileBrowser}
        setShowMobileFileBrowser={setShowMobileFileBrowser}
        serverUrl={apiUrl("")}
        showMobileManager={showMobileManager}
        setShowMobileManager={setShowMobileManager}
        activeMobileDevice={activeMobileDevice}
      />

      <VoiceHud
        isActive={isVoiceMode}
        isVisible={showVoiceHud}
        onClose={toggleVoiceMode}
        transcript={voiceTranscript}
        transcriptSource={voiceTranscriptSource as any}
        isVadActive={voiceBackend === "local" ? localVadActive : isVadActive}
        searchResults={voiceSearchResults}
        visualData={visualData}
        onClearVisualData={() => setVisualData(null)}
        isSpeaking={voiceTranscriptSource === "model"}
        paused={showCamera}
        persona={persona as any}
        modelName={getFriendlyVoiceModelLabel(
          voiceSessionOrchestrator.routeKind,
        )}
        technicalModelName={voiceModel}
        theme={theme}
        isLocalCoreConnected={isLocalCoreConnected}
        localCoreReadinessLevel={localCoreReadinessLevel}
        localCoreReadinessReason={localCoreReadinessReason}
        statusMessage={
          voiceHubError
            ? `VOICE SYSTEM ERROR: ${voiceHubError}`
            : presenceMode === "SENTRY"
              ? "SENTRY MODE ACTIVE - LISTENING FOR 'HEY LUCA'"
              : voiceStatus || "Cloud Voice is active"
        }
        onTranscriptChange={(text) => {
          setVoiceTranscript(text);
          setVoiceTranscriptSource("user");
        }}
        onTranscriptComplete={(text) => {
          if (!text || text.trim().length === 0) return;
          setVoiceTranscript(text);
          setVoiceTranscriptSource("user");

          if (approvalRequest) {
            const lower = text.toLowerCase().trim();
            const affirmative = [
              "yes",
              "confirm",
              "approve",
              "proceed",
              "execute",
              "do it",
              "affirmative",
            ];
            const negative = [
              "no",
              "abort",
              "cancel",
              "deny",
              "stop",
              "negative",
            ];

            if (affirmative.some((w) => lower.includes(w))) {
              approvalRequest.resolve(true);
              setApprovalRequest(null);
              soundService.play("SUCCESS");
              return;
            }
            if (negative.some((w) => lower.includes(w))) {
              approvalRequest.resolve(false);
              setApprovalRequest(null);
              soundService.play("ALERT");
              return;
            }
            return;
          }

          const analysis = voiceCommandService.analyzeCommand(text);
          if (analysis.requiresConfirmation) {
            setPendingCommand({
              original: text,
              interpreted: analysis.interpreted,
              confidence: analysis.confidence,
              isRisky: analysis.isRisky,
            });
          } else {
            taskQueue.add(text, 0).catch((err) => {
              console.error("[VOICE] Failed to queue command:", err);
            });
          }
        }}
        isVisionActive={isVisionActive}
        elevationState={elevationState}
      />

      {pendingCommand && (
        <VoiceCommandConfirmation
          originalTranscript={pendingCommand.original}
          interpretedCommand={pendingCommand.interpreted}
          confidence={pendingCommand.confidence}
          isRisky={pendingCommand.isRisky}
          onConfirm={() => {
            taskQueue
              .add(pendingCommand.original, pendingCommand.isRisky ? 1 : 0)
              .catch((err) => {
                console.error(
                  "[VOICE] Failed to queue confirmed command:",
                  err,
                );
              });
            setPendingCommand(null);
          }}
          onCancel={() => {
            setPendingCommand(null);
            soundService.play("ALERT");
          }}
        />
      )}

      {showCamera && (
        <VisionCameraModal
          onClose={() => setShowCamera(false)}
          onCapture={(base64: any) => setAttachedImage(base64)}
          onLiveAnalyze={(base64: any) => lucaService.analyzeImageFast(base64)}
        />
      )}

      {showRemoteModal && (
        <RemoteAccessModal
          accessCode={remoteCode}
          onClose={() => setShowRemoteModal(false)}
          onSuccess={handleRemoteSuccess}
        />
      )}

      {showDesktopStream && (
        <DesktopStreamModal
          targetName={desktopTarget}
          onClose={() => setShowDesktopStream(false)}
          connected={isLocalCoreConnected}
          theme={theme}
        />
      )}

      {showLucaRecorder && (
        <LucaRecorder
          onClose={() => setShowLucaRecorder(false)}
          theme={theme}
          onSave={async (blob, type, metadata, events) => {
            try {
              const formData = new FormData();
              formData.append("video", blob, "imprint.webm");
              formData.append("name", metadata.name);
              formData.append("description", metadata.description);
              formData.append("mode", type);
              formData.append("events", JSON.stringify(events));

              const res = await fetch(apiUrl("/api/skills/imprint"), {
                method: "POST",
                body: formData,
              });

              if (!res.ok) throw new Error("Failed to save imprint to server");

              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  text: `LUCA IMPRINT [${metadata.name}] RECEIVED AND REGISTERED AS AGENT SKILL.`,
                  sender: Sender.SYSTEM,
                  timestamp: Date.now(),
                },
              ]);
              soundService.play("SUCCESS");
              setShowLucaRecorder(false);
            } catch (error: any) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  text: `ERROR: LUCA IMPRINT SAVING FAILED. ${error.message}`,
                  sender: Sender.SYSTEM,
                  timestamp: Date.now(),
                },
              ]);
              soundService.play("ALERT");
            }
          }}
        />
      )}

      <OriginOverlayPanels
        theme={theme}
        showAdminGrantModal={showAdminGrantModal}
        adminJustification={adminJustification}
        onAdminGrant={() => {
          setIsAdminMode(true);
          setShowAdminGrantModal(false);
          setToolLogs((prev) => [
            ...prev,
            {
              toolName: "SYSTEM_KERNEL",
              args: {},
              result: "ADMINISTRATIVE PRIVILEGES GRANTED (ROOT).",
              timestamp: Date.now(),
            },
          ]);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              text: "SYSTEM_ALERT: ROOT ACCESS GRANTED. AUTHORIZATION LEVEL: ADMINISTRATOR. FULL SYSTEM CONTROL ENABLED.",
              sender: Sender.SYSTEM,
              timestamp: Date.now(),
            },
          ]);
          soundService.play("SUCCESS");
        }}
        onAdminDeny={() => {
          setShowAdminGrantModal(false);
          setToolLogs((prev) => [
            ...prev,
            {
              toolName: "SYSTEM_KERNEL",
              args: {},
              result: "ADMINISTRATIVE PRIVILEGES DENIED.",
              timestamp: Date.now(),
            },
          ]);
        }}
        isLockdown={isLockdown}
        onLockdownOverride={() => {
          setIsLockdown(false);
          setSystemStatus(SystemStatus.NORMAL);
          soundService.play("SUCCESS");
        }}
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
        showCryptoTerminal={showCryptoTerminal}
        setShowCryptoTerminal={setShowCryptoTerminal}
        showForexTerminal={showForexTerminal}
        setShowForexTerminal={setShowForexTerminal}
        showPredictionTerminal={showPredictionTerminal}
        setShowPredictionTerminal={setShowPredictionTerminal}
        polyPositions={polyPositions}
        handlePlaceBet={handlePlaceBet}
        showOsintDossier={showOsintDossier}
        setShowOsintDossier={setShowOsintDossier}
        osintProfile={osintProfile}
        showTVRemote={showTVRemote}
        setShowTVRemote={setShowTVRemote}
        activeTV={activeTV}
        handleTvCommand={(cmd, params) =>
          executeTool("controlSmartTV", {
            deviceId: activeTV?.id,
            action: cmd,
            ...params,
          })
        }
        showWirelessManager={showWirelessManager}
        setShowWirelessManager={setShowWirelessManager}
        handleWirelessConnect={handleWirelessConnect}
        wirelessTab={wirelessTab}
        showNetworkMap={showNetworkMap}
        setShowNetworkMap={setShowNetworkMap}
        showHackingTerminal={showHackingTerminal}
        setShowHackingTerminal={setShowHackingTerminal}
        hackingLogs={hackingLogs}
        showSkillsMatrix={showSkillsMatrix}
        setShowSkillsMatrix={setShowSkillsMatrix}
        handleSkillExecute={(skillName, args) =>
          executeTool("executeCustomSkill", {
            skillName,
            args,
          })
        }
        showStockTerminal={showStockTerminal}
        setShowStockTerminal={setShowStockTerminal}
        stockTerminalSymbol={stockTerminalSymbol}
        showTradingTerminal={showTradingTerminal}
        setShowTradingTerminal={setShowTradingTerminal}
        setShowCompetitionPage={setShowCompetitionPage}
        showCompetitionPage={showCompetitionPage}
        showAITradersPage={showAITradersPage}
        setShowAITradersPage={setShowAITradersPage}
        showSubsystemDashboard={showSubsystemDashboard}
        setShowSubsystemDashboard={setShowSubsystemDashboard}
      />

      {humanInputModal && (
        <HumanInputModal
          isOpen={humanInputModal.isOpen}
          prompt={humanInputModal.prompt}
          sessionId={humanInputModal.sessionId}
          onClose={() => setHumanInputModal(null)}
          onSubmit={handleHumanInputSubmit}
          isPassword={humanInputModal.prompt.toLowerCase().includes("password")}
          isSavePrompt={
            humanInputModal.prompt.toLowerCase().includes("save") ||
            humanInputModal.prompt.toLowerCase().includes("store")
          }
        />
      )}
    </>
  );
};

export default OverlayManager;
