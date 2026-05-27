
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
=======
import { ComputerUseGuardConfirmationBridgeSnapshot } from "../computerUse/types";
import {
  LucaVoiceCommandResult,
  LucaVoiceComputerUseConfirmationInput,
  LucaVoiceComputerUseConfirmationIntent,
  LucaVoiceComputerUseConfirmationResult,
  LucaVoiceRuntimeMetadata,
} from "./types";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

const confirmationMetadataBase = {
  bridgeKind: "voice_computer_use_confirmation_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  directHostAllowed: false,
  browserApisCalled: false,
  requiresExplicitOptIn: true,
} as const;

const runtimeMetadata: LucaVoiceRuntimeMetadata = {
  runtimeKind: "voice_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  storageWritesEnabled: false,
  requiresExplicitOptIn: true,
};

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
}

export class VoiceComputerUseConfirmationBridge {
  constructor(
    private readonly confirmationBridge: ComputerUseGuardConfirmationBridgeLike,
    private readonly eventBridge?: VoiceRuntimeEventBridge,
    private readonly defaultSessionId = "voice_computer_use_confirmation_scaffold",
  ) {}

  handleTranscript(input: LucaVoiceComputerUseConfirmationInput): LucaVoiceComputerUseConfirmationResult {
    return this.handleInput(input, "transcript");
  }

  handleText(input: LucaVoiceComputerUseConfirmationInput): LucaVoiceComputerUseConfirmationResult {
    return this.handleInput(input, "text");
  }

  getSnapshot(missionId?: string): ComputerUseGuardConfirmationBridgeSnapshot {
    return this.confirmationBridge.getSnapshot(missionId);
  }

  private handleInput(
    input: LucaVoiceComputerUseConfirmationInput,
    inputKind: "transcript" | "text",
  ): LucaVoiceComputerUseConfirmationResult {
    const transcript = input.transcript.trim();
    if (!transcript) {
      return this.respond("needs_clarification", "unknown", "Please say approve or reject for this confirmation.", input, inputKind);
    }

    const intent = this.parseIntent(transcript, input.requiredPhrase);
    const targetConfirmationId = this.resolveConfirmationId(input.confirmationId);

    if (!targetConfirmationId) {
      return this.respond("needs_clarification", intent, "There is no pending computer-use confirmation to handle.", input, inputKind);
    }

    if (intent === "approve") {
      const approval = this.confirmationBridge.approve(targetConfirmationId, {
        approvedBy: "user",
        reason: "Approved via voice computer-use confirmation bridge.",
        phrase: transcript,
      });

      if (!approval.ok) {
        return this.respond("failed", intent, approval.reason ?? "Approval failed.", input, inputKind, {
          confirmationId: targetConfirmationId,
        });
      }

      return this.respond("approved", intent, "Confirmed. I approved the pending computer-use request.", input, inputKind, {
        confirmationId: targetConfirmationId,
        approval: approval.approval,
      });
    }

    if (intent === "reject") {
      const rejection = this.confirmationBridge.reject(targetConfirmationId, "Rejected via voice computer-use confirmation bridge.");
      if (!rejection.ok) {
        return this.respond("failed", intent, rejection.reason ?? "Rejection failed.", input, inputKind, {
          confirmationId: targetConfirmationId,
        });
      }

      return this.respond("rejected", intent, "Understood. I rejected the pending computer-use request.", input, inputKind, {
        confirmationId: targetConfirmationId,
      });
    }

    return this.respond("needs_clarification", intent, "Please say yes/approve to continue or no/reject to stop.", input, inputKind, {
      confirmationId: targetConfirmationId,
    });
  }

  private parseIntent(transcript: string, requiredPhrase?: string): LucaVoiceComputerUseConfirmationIntent {
    const lowered = transcript.toLowerCase();
    const normalized = lowered.replace(/\s+/g, " ").trim();

    if (requiredPhrase && transcript === requiredPhrase) {
      return "approve";
    }

    const approvePhrases = ["yes", "confirm", "approve", "go ahead", "confirm action"];
    if (approvePhrases.some((phrase) => normalized === phrase || normalized.includes(phrase))) return "approve";

    const rejectPhrases = ["no", "cancel", "reject", "stop", "do not"];
    if (rejectPhrases.some((phrase) => normalized === phrase || normalized.includes(phrase))) return "reject";

    return "unknown";
  }

  private resolveConfirmationId(confirmationId?: string): string | undefined {
    if (confirmationId) return confirmationId;
    const pending = this.confirmationBridge
      .getSnapshot()
      .requests.filter((request) => request.status === "pending")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return pending[0]?.confirmationId;
  }

  private respond(
    status: LucaVoiceComputerUseConfirmationResult["status"],
    intent: LucaVoiceComputerUseConfirmationIntent,
    responseText: string,
    input: LucaVoiceComputerUseConfirmationInput,
    inputKind: "transcript" | "text",
    extras?: Partial<Pick<LucaVoiceComputerUseConfirmationResult, "confirmationId" | "approval" | "reason">>,
  ): LucaVoiceComputerUseConfirmationResult {
    const result: LucaVoiceComputerUseConfirmationResult = {
      status,
      intent,
      confirmationId: extras?.confirmationId,
      approval: extras?.approval,
      spokenResponse: responseText,
      textResponse: responseText,
      reason: status === "failed" ? responseText : extras?.reason,
      metadata: {
        ...confirmationMetadataBase,
        ...(input.metadata ?? {}),
      },
    };

    this.recordToTape(result, input, inputKind);
    return result;
  }

  private recordToTape(
    result: LucaVoiceComputerUseConfirmationResult,
    input: LucaVoiceComputerUseConfirmationInput,
    inputKind: "transcript" | "text",
  ): void {
    if (!this.eventBridge) return;
    const mappedStatus: LucaVoiceCommandResult["status"] =
      result.status === "approved" ? "handled" : result.status === "needs_clarification" ? "rejected" : result.status;

    try {
      this.eventBridge.recordCommandResult(
        {
          status: mappedStatus,
          spokenResponse: result.spokenResponse,
          textResponse: result.textResponse,
          reason: result.reason,
          metadata: {
            ...runtimeMetadata,
            ...result.metadata,
            confirmationStatus: result.status,
            confirmationIntent: result.intent,
            confirmationId: result.confirmationId,
            inputKind,
          },
        },
        { sessionId: input.sessionId ?? this.defaultSessionId, source: "voice_computer_use_confirmation_scaffold" },
      );
    } catch {
      // non-fatal by contract
    }
  }
}


