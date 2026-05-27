import { ComputerUseGuardConfirmationBridgeSnapshot } from "../computerUse/types";
import { LucaVoiceComputerUseConfirmationInput } from "./types";
import { VoiceComputerUseConfirmationBridge } from "./VoiceComputerUseConfirmationBridge";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

interface ComputerUseGuardConfirmationBridgeLike {
  approve(
    confirmationId: string,
    input?: { approvedBy?: "user" | "policy" | "system"; reason?: string; phrase?: string },
  ): {
    ok: boolean;
    status: "pending" | "approved" | "rejected" | "expired";
    confirmationId: string;
    approval?: Record<string, unknown>;
    reason?: string;
  };
  reject(confirmationId: string, reason?: string): {
    ok: boolean;
    status: "pending" | "approved" | "rejected" | "expired";
    confirmationId: string;
    reason?: string;
  };
  getSnapshot(missionId?: string): ComputerUseGuardConfirmationBridgeSnapshot;
  reset?(): void;
}

export function createVoiceComputerUseConfirmationBridge(options: {
  confirmationBridge: ComputerUseGuardConfirmationBridgeLike;
  eventBridge?: VoiceRuntimeEventBridge;
  sessionId?: string;
}) {
  const bridge = new VoiceComputerUseConfirmationBridge(options.confirmationBridge, options.eventBridge, options.sessionId);

  return {
    bridge,
    handleTranscript: (input: LucaVoiceComputerUseConfirmationInput) => bridge.handleTranscript(input),
    handleText: (input: LucaVoiceComputerUseConfirmationInput) => bridge.handleText(input),
    getSnapshot: (missionId?: string) => bridge.getSnapshot(missionId),
    reset: () => options.confirmationBridge.reset?.(),
  };
}
