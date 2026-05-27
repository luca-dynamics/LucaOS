import {
  LucaVoiceComputerUseConfirmationDecision,
  LucaVoiceComputerUseConfirmationRequest,
  LucaVoiceComputerUseConfirmationResult,
  LucaVoiceComputerUseConfirmationState,
} from "./types";

const defaultMetadata = {
  bridgeKind: "voice_computer_use_confirmation_scaffold" as const,
  audioApisCalled: false as const,
  sttApisCalled: false as const,
  ttsApisCalled: false as const,
  systemApisCalled: false as const,
  heavyModelsLoaded: false as const,
  requiresExplicitOptIn: true as const,
};

export class VoiceComputerUseConfirmationBridge {
  private state: LucaVoiceComputerUseConfirmationState = {
    pendingRequest: undefined,
    lastDecision: undefined,
    metadata: defaultMetadata,
  };

  getState(): LucaVoiceComputerUseConfirmationState {
    return {
      ...this.state,
      pendingRequest: this.state.pendingRequest
        ? { ...this.state.pendingRequest, metadata: { ...this.state.pendingRequest.metadata } }
        : undefined,
      lastDecision: this.state.lastDecision ? { ...this.state.lastDecision } : undefined,
      metadata: { ...this.state.metadata },
    };
  }

  setPendingRequest(request: LucaVoiceComputerUseConfirmationRequest): LucaVoiceComputerUseConfirmationState {
    this.state = { ...this.state, pendingRequest: { ...request }, lastDecision: undefined };
    return this.getState();
  }

  resolvePendingRequest(input: LucaVoiceComputerUseConfirmationDecision): LucaVoiceComputerUseConfirmationResult {
    const pending = this.state.pendingRequest;
    if (!pending || pending.confirmationId !== input.confirmationId) {
      return {
        ok: false,
        accepted: false,
        reason: "no_matching_pending_confirmation",
        state: this.getState(),
        metadata: { ...defaultMetadata },
      };
    }

    this.state = {
      ...this.state,
      pendingRequest: undefined,
      lastDecision: {
        confirmationId: input.confirmationId,
        accepted: input.accepted,
        reason: input.reason,
        decidedAt: new Date().toISOString(),
      },
    };

    return {
      ok: true,
      accepted: input.accepted,
      reason: input.reason,
      state: this.getState(),
      metadata: { ...defaultMetadata },
    };
  }

  clear(): LucaVoiceComputerUseConfirmationState {
    this.state = { pendingRequest: undefined, lastDecision: undefined, metadata: defaultMetadata };
    return this.getState();
  }
}
