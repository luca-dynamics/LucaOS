import { VoiceComputerUseConfirmationBridge } from "./VoiceComputerUseConfirmationBridge";
import { LucaVoiceComputerUseConfirmationDecision, LucaVoiceComputerUseConfirmationRequest } from "./types";

export function createVoiceComputerUseConfirmationBridge() {
  const bridge = new VoiceComputerUseConfirmationBridge();

  return {
    bridge,
    getState: () => bridge.getState(),
    setPendingRequest: (request: LucaVoiceComputerUseConfirmationRequest) => bridge.setPendingRequest(request),
    resolvePendingRequest: (decision: LucaVoiceComputerUseConfirmationDecision) => bridge.resolvePendingRequest(decision),
    clear: () => bridge.clear(),
  };
}
