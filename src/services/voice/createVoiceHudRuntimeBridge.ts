import { VoiceRuntimeState } from "./VoiceRuntime";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { LucaVoiceHudControl } from "./types";

export function createVoiceHudRuntimeBridge(eventBridge?: VoiceRuntimeEventBridge) {
  const bridge = new VoiceHudRuntimeBridge(eventBridge);

  return {
    bridge,
    sendControl: (control: LucaVoiceHudControl) => bridge.sendControl(control),
    getState: () => bridge.getState(),
    reset: () => bridge.reset(),
    updateTranscript: (transcript?: string) => bridge.updateTranscript(transcript),
    updateResponse: (response?: string) => bridge.updateResponse(response),
    syncFromVoiceRuntimeState: (runtimeState: VoiceRuntimeState) => bridge.syncFromVoiceRuntimeState(runtimeState),
  };
}
