import React from "react";
import { Sparkles, Dna, ShieldAlert } from "lucide-react";
import { PresenceMonitor } from "../Awareness/PresenceMonitor";
import { ScreenShare } from "../ScreenShare";
import GhostCursor from "../GhostCursor";
import LiveContentDisplay from "../LiveContentDisplay";
import SecurityGate from "../SecurityGate";
import AdminGrantModal from "../AdminGrantModal";
import WhatsAppManager from "../WhatsAppManager";
import TelegramManager from "../TelegramManager";
import TwitterManager from "../social/TwitterManager";
import InstagramManager from "../social/InstagramManager";
import LinkedInManager from "../social/LinkedInManager";
import DiscordManager from "../social/DiscordManager";
import YouTubeManager from "../social/YouTubeManager";
import LucaLinkModal from "../LucaLinkModal";
import ProfileManager from "../ProfileManager";
import CodeEditor from "../CodeEditor";
import IngestionModal from "../IngestionModal";
import { AutonomyDashboard } from "../AutonomyDashboard";
import VoiceHud from "../VoiceHud";
import { VoiceCommandConfirmation } from "../VoiceCommandConfirmation";
import VisionCameraModal from "../VisionCameraModal";
import RemoteAccessModal from "../RemoteAccessModal";
import { DesktopStreamModal } from "../DesktopStreamModal";
import GeoTacticalView from "../GeoTacticalView";
import CryptoTerminal from "../CryptoTerminal";
import ForexTerminal from "../ForexTerminal";
import PredictionTerminal from "../PredictionTerminal";
import OsintDossier from "../OsintDossier";
import SmartTVRemote from "../SmartTVRemote";
import WirelessManager from "../WirelessManager";
import AppExplorerModal from "../AppExplorerModal";
import MobileFileBrowser from "../MobileFileBrowser";
import MobileManager from "../MobileManager";
import NetworkMap from "../NetworkMap";
import HackingTerminal from "../HackingTerminal";
import SkillsMatrix from "../SkillsMatrix";
import { LucaRecorder } from "../LucaRecorder";
import StockTerminal from "../StockTerminal";
import AdvancedTradingTerminal from "../trading/AdvancedTradingTerminal";
import CompetitionPage from "../trading/CompetitionPage";
import AITradersPage from "../trading/AITradersPage";
import SubsystemDashboard from "../SubsystemDashboard";
import HumanInputModal from "../HumanInputModal";

import { awarenessService } from "../../services/awarenessService";
import { settingsService } from "../../services/settingsService";
import { soundService } from "../../services/soundService";
import { lucaService } from "../../services/lucaService";
import { voiceCommandService } from "../../services/voiceCommandService";
import { taskQueue } from "../../services/taskQueueService";
import { SystemStatus, Sender } from "../../types";
import { apiUrl } from "../../config/api";

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
  showVoiceHud: boolean;
  toggleVoiceMode: () => void;
  voiceAmplitude: number;
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
    showVoiceHud,
    toggleVoiceMode,
    voiceAmplitude,
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
  } = props;

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
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-xl"
          style={{
            borderColor: `${theme.hex}66`,
            background: `${theme.hex}1a`,
            boxShadow: `0 0 20px ${theme.hex}33`,
          }}
        >
          <Sparkles size={16} className="animate-pulse" />
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

      {backgroundImage && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 opacity-40 animate-in fade-in"
          style={{
            backgroundImage: `url(data:image/jpeg;base64,${backgroundImage})`,
          }}
        />
      )}

      <GhostCursor
        x={ghostCursor.x}
        y={ghostCursor.y}
        type={ghostCursor.type}
        isActive={ghostCursor.active}
      />

      {isRebooting && (
        <div
          className={`absolute inset-0 z-[2000] flex flex-col items-center justify-center font-mono animate-in fade-in duration-200 pointer-events-auto transition-all duration-700 backdrop-blur-[20px]`}
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
            LOADING LUCA CORE: {persona}...
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

      {showAdminGrantModal && (
        <AdminGrantModal
          justification={adminJustification}
          onGrant={() => {
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
          onDeny={() => {
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
        />
      )}

      {showWhatsAppManager && (
        <WhatsAppManager
          onClose={() => setShowWhatsAppManager(false)}
          theme={theme}
        />
      )}

      {showTelegramManager && (
        <TelegramManager
          onClose={() => setShowTelegramManager(false)}
          theme={theme}
        />
      )}

      {showTwitterManager && (
        <TwitterManager
          onClose={() => setShowTwitterManager(false)}
          theme={theme}
        />
      )}

      {showInstagramManager && (
        <InstagramManager
          onClose={() => setShowInstagramManager(false)}
          theme={theme}
        />
      )}

      {showLinkedInManager && (
        <LinkedInManager
          onClose={() => setShowLinkedInManager(false)}
          theme={theme}
        />
      )}

      {showDiscordManager && (
        <DiscordManager
          onClose={() => setShowDiscordManager(false)}
          theme={theme}
        />
      )}

      {showYouTubeManager && (
        <YouTubeManager
          onClose={() => setShowYouTubeManager(false)}
          theme={theme}
        />
      )}

      {showLucaLinkModal && (
        <LucaLinkModal
          onClose={() => setShowLucaLinkModal(false)}
          localIp={localIp || window.location.hostname}
          theme={theme}
        />
      )}

      {showProfileManager && (
        <ProfileManager
          onClose={() => setShowProfileManager(false)}
          onSave={handleSaveProfile}
          currentProfile={userProfile || undefined}
        />
      )}

      {showCodeEditor && (
        <CodeEditor
          onClose={() => setShowCodeEditor(false)}
          initialCwd={currentCwd || "."}
          theme={theme}
        />
      )}

      {showIngestionModal && (
        <IngestionModal
          onClose={() => setShowIngestionModal(false)}
          onIngest={handleIngest}
          theme={theme}
        />
      )}

      {ingestionState.active && (
        <div className="absolute inset-0 z-[950] bg-black/90 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] border border-green-500/50 bg-black p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] rounded-lg">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent,rgba(34,197,94,0.5)_50%,transparent)] animate-scan"></div>
            <div className="flex items-center gap-4 text-green-500 font-bold tracking-widest text-xl mb-6 border-b border-green-500/30 pb-4">
              <Dna className="animate-spin-slow w-8 h-8" />
              <div>
                <div>LUCA EVOLUTION PROTOCOL</div>
                <div className="text-[10px] text-green-400/60 font-mono">
                  INTEGRATING AGENTIC CAPABILITIES...
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden text-xs font-mono text-green-400/80 space-y-2 pl-4 border-l-2 border-green-500/20">
              {ingestionState && ingestionState.skills.length > 0
                ? ingestionState.skills.map((skill: string, i: number) => (
                    <div
                      key={`skill-${i}`}
                      className="animate-in zoom-in duration-500 flex items-center gap-2 text-white font-bold tracking-wider"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      ACQUIRED SKILL: {skill}
                    </div>
                  ))
                : (ingestionState && ingestionState.files.length > 0
                    ? ingestionState.files.slice(-8)
                    : [
                        "Initializing Deep Scan...",
                        "Parsing Jupyter Notebooks...",
                        "Extracting Algorithmic Logic...",
                        "Identifying Agent Architectures...",
                        "Synthesizing Luca Pathways...",
                      ]
                  ).map((file: string, i: number) => (
                    <div
                      key={i}
                      className="truncate animate-in slide-in-from-left-4 fade-in duration-500 flex items-center gap-2"
                    >
                      <span className="text-green-700">&gt;</span>
                      {file}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {isLockdown && (
        <div className="absolute inset-0 z-[900] bg-red-950/90 flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
          <div className="border-4 border-red-500 p-12 rounded-lg bg-black flex flex-col items-center shadow-[0_0_100px_#ef4444] animate-pulse">
            <ShieldAlert size={128} className="text-red-500 mb-6" />
            <h1 className="text-6xl font-display font-bold text-red-500 tracking-[0.2em] mb-4">
              LOCKDOWN
            </h1>
            <div className="text-2xl font-mono text-red-400 tracking-widest mb-8">
              DEFENSE PROTOCOL ALPHA ACTIVE
            </div>
            <div className="mt-8 text-xs text-red-500/50 font-mono pointer-events-auto">
              <button
                onClick={() => {
                  setIsLockdown(false);
                  setSystemStatus(SystemStatus.NORMAL);
                  soundService.play("SUCCESS");
                }}
                className="border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-black transition-colors"
              >
                OVERRIDE AUTH CODE: OMEGA-9
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutonomyDashboard && (
        <AutonomyDashboard
          onClose={() => setShowAutonomyDashboard(false)}
          theme={theme}
        />
      )}

      <VoiceHud
        isActive={isVoiceMode}
        isVisible={showVoiceHud}
        onClose={toggleVoiceMode}
        amplitude={voiceAmplitude}
        transcript={voiceTranscript}
        transcriptSource={voiceTranscriptSource as any}
        isVadActive={voiceBackend === "local" ? localVadActive : isVadActive}
        searchResults={voiceSearchResults}
        visualData={visualData}
        onClearVisualData={() => setVisualData(null)}
        isSpeaking={voiceTranscriptSource === "model"}
        paused={showCamera}
        persona={persona as any}
        modelName={voiceModel}
        theme={theme}
        statusMessage={
          voiceHubError
            ? `VOICE SYSTEM ERROR: ${voiceHubError}`
            : presenceMode === "SENTRY"
              ? "SENTRY MODE ACTIVE - LISTENING FOR 'HEY LUCA'"
              : voiceStatus || "VOICE UPLINK ACTIVE"
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
          theme={theme}
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

      {showGeoTactical && (
        <GeoTacticalView
          targetName={trackingTarget}
          markers={tacticalMarkers}
          onClose={() => setShowGeoTactical(false)}
        />
      )}

      {showCryptoTerminal && (
        <CryptoTerminal
          onClose={() => setShowCryptoTerminal(false)}
          theme={theme}
        />
      )}

      {showForexTerminal && (
        <ForexTerminal
          onClose={() => setShowForexTerminal(false)}
          theme={theme}
        />
      )}

      {showPredictionTerminal && (
        <PredictionTerminal
          positions={polyPositions}
          onBet={handlePlaceBet}
          onClose={() => setShowPredictionTerminal(false)}
          theme={theme}
        />
      )}

      {showOsintDossier && (
        <OsintDossier
          profile={osintProfile}
          onClose={() => setShowOsintDossier(false)}
          theme={theme}
        />
      )}

      {showTVRemote && (
        <SmartTVRemote
          device={activeTV}
          onClose={() => setShowTVRemote(false)}
          onCommand={(cmd: string, params: any) =>
            executeTool("controlSmartTV", {
              deviceId: activeTV?.id,
              action: cmd,
              ...params,
            })
          }
          theme={theme}
        />
      )}

      {showWirelessManager && (
        <WirelessManager
          onClose={() => setShowWirelessManager(false)}
          onConnect={handleWirelessConnect}
          activeTab={wirelessTab}
          theme={theme}
        />
      )}

      {showAppExplorer && (
        <AppExplorerModal
          isOpen={showAppExplorer}
          onClose={() => setShowAppExplorer(false)}
          theme={theme}
        />
      )}

      {showMobileFileBrowser && (
        <MobileFileBrowser
          onClose={() => setShowMobileFileBrowser(false)}
          serverUrl={apiUrl("")}
        />
      )}

      {showMobileManager && (
        <MobileManager
          device={activeMobileDevice}
          onClose={() => setShowMobileManager(false)}
        />
      )}

      {showNetworkMap && (
        <NetworkMap onClose={() => setShowNetworkMap(false)} />
      )}

      {showHackingTerminal && (
        <HackingTerminal
          onClose={() => setShowHackingTerminal(false)}
          toolLogs={hackingLogs}
          theme={theme}
        />
      )}

      {showSkillsMatrix && (
        <SkillsMatrix
          onClose={() => setShowSkillsMatrix(false)}
          theme={theme}
          onExecute={async (skillName, args) => {
            return await executeTool("executeCustomSkill", {
              skillName,
              args,
            });
          }}
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

      {showStockTerminal && (
        <StockTerminal
          onClose={() => setShowStockTerminal(false)}
          initialSymbol={stockTerminalSymbol}
          theme={theme}
        />
      )}

      {showTradingTerminal && (
        <AdvancedTradingTerminal
          onClose={() => setShowTradingTerminal(false)}
          onOpenCompetition={() => {
            setShowTradingTerminal(false);
            setShowCompetitionPage(true);
          }}
          theme={theme}
        />
      )}

      {showCompetitionPage && (
        <CompetitionPage
          onClose={() => setShowCompetitionPage(false)}
          theme={theme}
        />
      )}

      {showAITradersPage && (
        <AITradersPage
          onClose={() => setShowAITradersPage(false)}
          theme={theme}
        />
      )}

      {showSubsystemDashboard && (
        <SubsystemDashboard
          onClose={() => setShowSubsystemDashboard(false)}
          theme={theme}
        />
      )}

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
