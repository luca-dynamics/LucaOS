import { useCallback } from "react";
import { ToolRegistry, SecurityLevel, MissionScope } from "../../services/toolRegistry";
import { lucaService, PersonaType } from "../../services/lucaService";
import { liveService } from "../../services/liveService";
import { soundService } from "../../services/soundService";
import { memoryService } from "../../services/memoryService";
import { settingsService } from "../../services/settingsService";
import conversationService from "../../services/conversationService";
import { taskQueue } from "../../services/taskQueueService";
import { lucaLinkManager } from "../../services/lucaLink/manager";
import {
  canDeviceRunTool,
  findBestDeviceForTool,
} from "../../services/deviceCapabilityService";
import { apiUrl } from "../../config/api";
import { ToolExecutionContext } from "../../tools/types";
import { Message, ToolExecutionLog } from "../../types";

// Helper to poll for human input during interactive tools
const pollForHumanInput = async (sessionId: string) => {
  try {
    await fetch(apiUrl(`/api/human-input/poll?sessionId=${sessionId}`));
  } catch (e) {
    console.warn("[SECURITY] Human input poll failed:", e);
  }
};

interface UseToolOrchestratorProps {
  // State from App/Hooks
  persona: PersonaType;
  isVoiceMode: boolean;
  messages: Message[];
  currentCwd: string;
  setToolLogs: React.Dispatch<React.SetStateAction<ToolExecutionLog[]>>;

  // UI Controls (Setters)
  setVoiceSearchResults: (val: any) => void;
  setVisualData: (val: any) => void;
  setIngestionState: (val: any) => void;
  setStockTerminalSymbol: (val: string) => void;
  setShowStockTerminal: (val: boolean) => void;
  setShowSkillsMatrix: (val: boolean) => void;
  setShowSubsystemDashboard: (val: boolean) => void;
  setShowGhostBrowser: (val: boolean) => void;
  setGhostBrowserUrl: (val: string) => void;
  setShowMobileFileBrowser: (val: boolean) => void;
  setShowAutonomyDashboard: (val: boolean) => void;
  setShowCodeEditor: (val: boolean) => void;
  setShowOsintDossier: (val: boolean) => void;
  setOsintProfile: (val: any) => void;
  setCryptoWallet: (val: any) => void;
  setForexAccount: (val: any) => void;
  setLiveContent: (val: any) => void;

  // Core System State
  isLocalCoreConnected: boolean;
  hostPlatform: string;
  isRebooting: boolean;
  setIsRebooting: (val: boolean) => void;
  attachedImage: string | null;
  contextDisplayId?: number;
  currentDeviceType: string;

  // Vision & Monitoring
  setIsVisionActive: (val: boolean) => void;
  setIsScreenSharing: (val: boolean) => void;
  setVisionPerformanceMode: (val: "high" | "balanced" | "eco") => void;
  setAudioMonitoringActive: (val: boolean) => void;
  setVisionMonitoringActive: (val: boolean) => void;
  setSentryInstruction: (val: string | null) => void;

  // Security
  elevationState: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
  };
  setElevationState: React.Dispatch<React.SetStateAction<any>>;
  setApprovalRequest: (req: any) => void;

  // Callbacks
  handleSendMessage: (
    text: string,
    image?: string | null,
    onProgress?: (message: string, progress?: number) => void,
    sendHidden?: boolean,
  ) => Promise<string | undefined>;
  handlePersonaSwitch: (mode: string) => Promise<void>;
  turnLogsRef?: React.MutableRefObject<any[]>;
}

export function useToolOrchestrator({
  persona,
  isVoiceMode,
  messages,
  currentCwd,
  setToolLogs,
  setVoiceSearchResults,
  setVisualData,
  setIngestionState,
  setStockTerminalSymbol,
  setShowStockTerminal,
  setShowSkillsMatrix,
  setShowSubsystemDashboard,
  setShowGhostBrowser,
  setGhostBrowserUrl,
  setShowMobileFileBrowser,
  setShowAutonomyDashboard,
  setShowCodeEditor,
  setShowOsintDossier,
  setOsintProfile,
  setCryptoWallet,
  setForexAccount,
  setLiveContent,
  isLocalCoreConnected,
  hostPlatform,
  isRebooting,
  setIsRebooting,
  attachedImage,
  contextDisplayId,
  currentDeviceType,
  setIsVisionActive,
  setIsScreenSharing,
  setVisionPerformanceMode,
  setAudioMonitoringActive,
  setVisionMonitoringActive,
  setSentryInstruction,
  elevationState,
  setElevationState,
  setApprovalRequest,
  handleSendMessage,
  handlePersonaSwitch,
  turnLogsRef,
}: UseToolOrchestratorProps) {
  const executeTool = useCallback(
    async (name: string, args: any): Promise<string> => {
      // 0. Start polling for potential human input (credentials, 2FA)
      const INTERACTIVE_TOOLS = [
        "run_terminal",
        "terminal",
        "ssh_connect",
        "access_aws",
        "cloud_login",
        "deploy",
        "git_clone",
      ];

      if (INTERACTIVE_TOOLS.includes(name)) {
        pollForHumanInput(conversationService.getSessionId());
      }

      // --- BIOMETRIC SECURITY CHECK (Tiered Architecture) ---
      const securityLevel = ToolRegistry.getSecurityLevel(name);
      const toolMissionScope = ToolRegistry.getMissionScope(name);
      const missionId = taskQueue.getRunningTask()?.id;

      const isRecentlyElevated =
        Date.now() - elevationState.lastScanTimestamp < 60000;
      const isMissionAuthorized = !!(
        missionId && elevationState.authorizedMissionIds.has(missionId)
      );

      // SCOPED MISSION CHECK: If we have an active mission, it must match the tool's scope
      const isScopeAuthorized =
        elevationState.activeMissionScope === MissionScope.FULL ||
        elevationState.activeMissionScope === toolMissionScope ||
        toolMissionScope === MissionScope.NONE;

      if (
        securityLevel >= SecurityLevel.LEVEL_1 &&
        (!isRecentlyElevated || !isScopeAuthorized) &&
        !isMissionAuthorized
      ) {
        console.log(
          `[SECURITY] 🛡️ Biometric challenge required for ${name} (Level ${securityLevel})`,
        );

        const approved = await new Promise<boolean>((resolve) => {
          setApprovalRequest({
            tool: name,
            args,
            securityLevel,
            missionScope: toolMissionScope, // Pass scope to UI
            isSafetyValve: true, // Enable voice-first handshake
            resolve: (val: boolean) => {
              if (val) {
                setElevationState((prev: any) => {
                  const newMissionIds = new Set<string>(
                    prev.authorizedMissionIds,
                  );
                  if (missionId) newMissionIds.add(missionId);
                  return {
                    lastScanTimestamp: Date.now(),
                    authorizedMissionIds: newMissionIds,
                    activeMissionScope: toolMissionScope, // Lock into mission scope
                  };
                });
              }
              resolve(val);
            },
          });
        });

        setApprovalRequest(null);
        if (!approved) {
          return `[SECURITY] Access Denied for tool: ${name}. Identity verification failed.`;
        }
      }

      // 1. Initialize Tool Log
      const initialLog = {
        id: Math.random().toString(36).substring(7),
        toolName: name,
        args: args,
        result: "EXECUTING...",
        timestamp: Date.now(),
      };

      setToolLogs((prev) => [...prev, initialLog]);

      // Update turnLogsRef for in-chat action blocks
      if (turnLogsRef) {
        turnLogsRef.current = [...(turnLogsRef.current || []), initialLog];
      }

      // --- SPECIAL HANDLING: Chat ---
      if (name === "chat") {
        const text = args.text || args.message || "";
        if (text) {
          await handleSendMessage(text, null);
          return "Message processed by LUCA";
        }
      }

      // --- AUTOMATIC TOOL DELEGATION ---
      const canRun = canDeviceRunTool(currentDeviceType as any, name);

      if (!canRun) {
        const availableDevices = Array.from(
          (lucaLinkManager as any).devices?.values() || [],
        ).map((d: any) => ({
          type: d.type as any,
          deviceId: d.deviceId,
          name: d.name,
        }));

        const bestDevice = findBestDeviceForTool(name, availableDevices);

        if (bestDevice && bestDevice.deviceId !== "desktop_main") {
          try {
            console.log(
              `[AUTO-DELEGATE] Tool "${name}" cannot run on ${currentDeviceType}, delegating to ${bestDevice.name} (${bestDevice.type})`,
            );
            const result = await (lucaLinkManager as any).delegateTool(
              bestDevice.deviceId,
              name,
              args,
            );
            const resultText =
              result?.result ||
              result?.error ||
              `Tool executed on ${bestDevice.name}`;

            setToolLogs((prev) => {
              const newLogs = [...prev];
              if (newLogs.length > 0) {
                newLogs[newLogs.length - 1].result =
                  `[DELEGATED to ${bestDevice.name}] ${resultText}`;
              }
              return newLogs;
            });

            if (turnLogsRef && turnLogsRef.current.length > 0) {
              turnLogsRef.current[turnLogsRef.current.length - 1].result =
                `[DELEGATED to ${bestDevice.name}] ${resultText}`;
            }

            return resultText;
          } catch (error: any) {
            const errorMsg = `ERROR: Failed to delegate tool to ${bestDevice.name}: ${error.message}`;
            setToolLogs((prev) => {
              const newLogs = [...prev];
              if (newLogs.length > 0) {
                newLogs[newLogs.length - 1].result = errorMsg;
              }
              return newLogs;
            });

            if (turnLogsRef && turnLogsRef.current.length > 0) {
              turnLogsRef.current[turnLogsRef.current.length - 1].result =
                errorMsg;
            }
            return errorMsg;
          }
        }
      }

      // --- TOOL EXECUTION (Delegated to Registry) ---
      const context: ToolExecutionContext = {
        lucaService,
        liveService,
        soundService,
        memoryService,
        setToolLogs,
        setShowMobileFileBrowser,
        setShowAutonomyDashboard,
        visionModel: settingsService.get("brain")?.visionModel,
        setShowCodeEditor,
        setVoiceSearchResults,
        setLiveContent,
        setVisualData,
        setIngestionState,
        setStockTerminalSymbol,
        setShowStockTerminal,
        setShowSkillsMatrix,
        setShowSubsystemDashboard,
        setShowGhostBrowser,
        setGhostBrowserUrl,
        isLocalCoreConnected,
        isVoiceMode,
        hostPlatform,
        isRebooting,
        attachedImage,
        messages,
        handleSendMessage,
        handlePersonaSwitch,
        displayId: contextDisplayId,
        currentDeviceType: currentDeviceType,
        lucaLinkManager,
        setOsintProfile,
        setShowOsintDossier,
        setCryptoWallet,
        setForexAccount,
        setIsVisionActive,
        setIsScreenSharing,
        setVisionPerformanceMode,
        setIsRebooting,
        isElevated:
          (isRecentlyElevated &&
            (elevationState.activeMissionScope ===
              ToolRegistry.getMissionScope(name) ||
              elevationState.activeMissionScope === MissionScope.FULL)) ||
          isMissionAuthorized,
      };

      // --- SPECIAL UI TRIGGERS ---
      if (name === "simulateSecurityAudit") {
        setVisualData({
          topic: args.target || "WebKeyDAO",
          type: "SECURITY",
          layout: "CAROUSEL",
          items: [
            {
              title: args.target || "WebKeyDAO",
              imageUrl: "",
              details: {
                status: "AUDITING",
                projectedProfit: "1.45",
                scanCost: "$1.22",
                successProbability: "55.88%",
                threatLevel: "85",
              },
            },
          ],
        });
      } else if (
        name === "runPythonScript" ||
        name === "executeTerminalCommand"
      ) {
        setVisualData({
          title:
            name === "runPythonScript" ? "PYTHON SANDBOX" : "SYSTEM TERMINAL",
          type: "SYSTEM",
          layout: "STREAM",
        });
      }

      // --- SENTRY CONTROL ---
      if (name === "controlSentry") {
        if (typeof args.visualEnabled === "boolean") {
          setVisionMonitoringActive(args.visualEnabled);
        }
        if (typeof args.audioEnabled === "boolean") {
          setAudioMonitoringActive(args.audioEnabled);
        }
        if (args.instruction) {
          setSentryInstruction(args.instruction);
        }

        let msg = "Sentry configuration updated.";
        if (args.instruction) msg += ` Monitoring for "${args.instruction}".`;
        return msg;
      }

      let result = "";
      try {
        result = await ToolRegistry.execute(name, args, context);
      } catch (e: any) {
        console.error(`Tool Execution Failed: ${e.message}`);

        // --- SAFETY VALVE TRIGGER ---
        // Check if the error indicates a permission requirement from the backend
        // We use a looser check because result might be a stringified JSON or an actual error object
        let errorData: any = null;
        try {
          if (typeof e.message === "string" && e.message.includes("{")) {
            const jsonStr = e.message.slice(e.message.indexOf("{"));
            errorData = JSON.parse(jsonStr);
          } else if (e.response?.data) {
            errorData = e.response.data;
          }
        } catch (parseErr) {
          console.warn("[SAFETY-VALVE] Failed to parse error data", parseErr);
        }

        if (errorData?.code === "PERMISSION_REQUIRED") {
          console.log(
            "[SAFETY-VALVE] 🛡️ Permission required for action:",
            errorData.action,
          );

          const approved = await new Promise<boolean>((resolve) => {
            setApprovalRequest({
              tool: name,
              args,
              resolve,
              // Meta data for Safety Valve UI
              isSafetyValve: true,
              action: errorData.action,
              metadata: errorData.metadata,
              message: errorData.message || "Manual safety bypass requested.",
            });
          });

          setApprovalRequest(null);

          if (approved) {
            console.log(
              "[SAFETY-VALVE] ✅ User approved action. Retrying with bypass...",
            );
            // In a real implementation, we would add an 'X-LUCA-BYPASS' header
            // For now, we retry the tool with a special flag
            try {
              return await ToolRegistry.execute(
                name,
                { ...args, _lucaBypass: true },
                context,
              );
            } catch (retryErr: any) {
              return `[SAFETY-VALVE] Approved, but retry failed: ${retryErr.message}`;
            }
          } else {
            return `[SAFETY-VALVE] ❌ Access denied by user for action: ${errorData.action}`;
          }
        }

        result = `CRITICAL ERROR: ${e.message}`;
      }

      // Update the log with the final result
      setToolLogs((prev) => {
        const newLogs = [...prev];
        if (newLogs.length > 0) {
          const lastLog = newLogs[newLogs.length - 1];
          if (lastLog && lastLog.toolName === name) {
            lastLog.result = result;
          } else {
            newLogs.push({
              toolName: name,
              args: args,
              result: result,
              timestamp: Date.now(),
            });
          }
        } else {
          newLogs.push({
            toolName: name,
            args: args,
            result: result,
            timestamp: Date.now(),
          });
        }
        return newLogs;
      });

      if (turnLogsRef && turnLogsRef.current.length > 0) {
        const lastLog = turnLogsRef.current[turnLogsRef.current.length - 1];
        if (lastLog && lastLog.toolName === name) {
          lastLog.result = result;
        }
      }

      return result;
    },
    [
      elevationState,
      setElevationState,
      setApprovalRequest,
      setToolLogs,
      handleSendMessage,
      currentDeviceType,
      persona,
      isVoiceMode,
      currentCwd,
      messages,
      isLocalCoreConnected,
      hostPlatform,
      isRebooting,
      attachedImage,
      contextDisplayId,
      setVoiceSearchResults,
      setVisualData,
      setIngestionState,
      setStockTerminalSymbol,
      setShowStockTerminal,
      setShowSkillsMatrix,
      setShowSubsystemDashboard,
      setShowGhostBrowser,
      setGhostBrowserUrl,
      setShowMobileFileBrowser,
      setShowAutonomyDashboard,
      setShowCodeEditor,
      setShowOsintDossier,
      setOsintProfile,
      setCryptoWallet,
      setForexAccount,
      setLiveContent,
      setIsVisionActive,
      setIsScreenSharing,
      setVisionPerformanceMode,
      setAudioMonitoringActive,
      setVisionMonitoringActive,
      setSentryInstruction,
      handlePersonaSwitch,
      setIsRebooting,
      turnLogsRef,
    ],
  );

  return { executeTool };
}
