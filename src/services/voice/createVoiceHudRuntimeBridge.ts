import { LucaVoiceHudControl } from "./types";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceRuntimeState } from "./VoiceRuntime";

export function createVoiceHudRuntimeBridge(options?: { eventBridge?: VoiceRuntimeEventBridge; sessionId?: string }) {
  const bridge = new VoiceHudRuntimeBridge(options?.eventBridge, options?.sessionId);

  return {
    bridge,
    sendControl: (control: LucaVoiceHudControl) => bridge.sendControl(control),
    getState: () => bridge.getState(),
    reset: () => bridge.reset(),
    updateTranscript: (transcript?: string) => bridge.updateTranscript(transcript),
    updateResponse: (response?: string) => bridge.updateResponse(response),
    updateCommand: (command?: string) => bridge.updateCommand(command),
    updateConfirmation: (confirmationId?: string) => bridge.updateConfirmation(confirmationId),
    updateError: (error?: string) => bridge.updateError(error),
    syncFromVoiceRuntimeState: (runtimeState: VoiceRuntimeState) => bridge.syncFromVoiceRuntimeState(runtimeState),
  };
}
