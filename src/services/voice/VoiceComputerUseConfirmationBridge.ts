import {
  LucaVoiceComputerUseConfirmationInput,
  LucaVoiceComputerUseConfirmationResult,
} from "./types";

const defaultMetadata: LucaVoiceComputerUseConfirmationResult["metadata"] = {
  bridgeKind: "voice_computer_use_confirmation_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  requiresExplicitOptIn: true,
};

export class VoiceComputerUseConfirmationBridge {
  handle(input: LucaVoiceComputerUseConfirmationInput): LucaVoiceComputerUseConfirmationResult {
    const normalizedTranscript = input.transcript.trim().toLowerCase();
    const requiredPhrase = input.requiredPhrase?.trim().toLowerCase();

    if (input.intent === "confirm") {
      if (requiredPhrase && normalizedTranscript !== requiredPhrase) {
        return this.makeResult(
          "needs_clarification",
          input.confirmationId,
          false,
          "required_phrase_mismatch",
          "Please repeat the required confirmation phrase exactly.",
        );
      }

      return this.makeResult("confirmed", input.confirmationId, true, undefined, "Confirmed. Proceeding with guarded computer-use action.");
    }

    if (input.intent === "cancel") {
      return this.makeResult("rejected", input.confirmationId, false, "user_cancelled", "Cancelled. The computer-use action will not proceed.");
    }

    return this.makeResult(
      "needs_clarification",
      input.confirmationId,
      false,
      "clarification_required",
      "Please confirm or cancel this computer-use action.",
    );
  }

  private makeResult(
    status: LucaVoiceComputerUseConfirmationResult["status"],
    confirmationId: string,
    accepted: boolean,
    reason: string | undefined,
    response: string,
  ): LucaVoiceComputerUseConfirmationResult {
    return {
      status,
      confirmationId,
      accepted,
      reason,
      spokenResponse: response,
      textResponse: response,
      metadata: { ...defaultMetadata },
    };
  }
}
