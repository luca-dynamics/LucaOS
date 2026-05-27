import { VoiceComputerUseConfirmationBridge } from "./VoiceComputerUseConfirmationBridge";
import { LucaVoiceComputerUseConfirmationInput } from "./types";

export function createVoiceComputerUseConfirmationBridge() {
  const bridge = new VoiceComputerUseConfirmationBridge();

  return {
    bridge,
    handle: (input: LucaVoiceComputerUseConfirmationInput) => bridge.handle(input),
  };
}
