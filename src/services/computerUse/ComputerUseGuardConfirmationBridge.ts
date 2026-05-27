import {
  ComputerUseGuardConfirmationBridgeOptions,
  ComputerUseGuardConfirmationBridgeSnapshot,
  ComputerUseGuardConfirmationRequest,
  ComputerUseGuardConfirmationResult,
  ComputerUseGuardDecision,
  ComputerUseGuardDecisionEventInput,
} from "./types";

const confirmationMetadata = {
  bridgeKind: "guard_confirmation_scaffold" as const,
  systemApisCalled: false as const,
  directHostAllowed: false as const,
  storageWritesEnabled: false as const,
  requiresExplicitOptIn: true as const,
};

export class ComputerUseGuardConfirmationBridge {
  private readonly options: Required<Pick<ComputerUseGuardConfirmationBridgeOptions, "now">> &
    Omit<ComputerUseGuardConfirmationBridgeOptions, "now">;

  private readonly requests = new Map<string, ComputerUseGuardConfirmationRequest>();

  constructor(options: ComputerUseGuardConfirmationBridgeOptions = {}) {
    this.options = {
      now: options.now ?? (() => new Date().toISOString()),
      defaultExpiresInMs: options.defaultExpiresInMs,
      enforceRequiredPhrase: options.enforceRequiredPhrase ?? false,
      requiredPhrase: options.requiredPhrase,
    };
  }

  createRequest(input: {
    decision: ComputerUseGuardDecision;
    event?: Pick<ComputerUseGuardDecisionEventInput, "missionId" | "stepId" | "actionType">;
  }): ComputerUseGuardConfirmationRequest | undefined {
    if (input.decision.status !== "needs_confirmation") return undefined;
    const confirmationId = `confirm_${this.requests.size + 1}_${Date.parse(this.options.now())}`;
    const createdAt = this.options.now();
    const expiresAt = this.options.defaultExpiresInMs ? new Date(Date.parse(createdAt) + this.options.defaultExpiresInMs).toISOString() : undefined;
    const missionId = input.decision.metadata.missionId ?? input.event?.missionId;
    const stepId = input.decision.metadata.stepId ?? input.event?.stepId;
    const actionType = input.decision.metadata.actionType ?? input.event?.actionType;
    const requiredPhrase = this.options.requiredPhrase;
    const request: ComputerUseGuardConfirmationRequest = {
      confirmationId,
      missionId,
      stepId,
      actionType,
      riskLevel: input.decision.metadata.riskLevel,
      reason: input.decision.reason,
      requiredPhrase,
      createdAt,
      expiresAt,
      status: "pending",
      metadata: confirmationMetadata,
    };
    this.requests.set(confirmationId, request);
    return request;
  }

  approve(confirmationId: string, input: { approvedBy?: "user" | "policy" | "system"; reason?: string; phrase?: string } = {}): ComputerUseGuardConfirmationResult {
    const request = this.getActiveRequest(confirmationId);
    if (!request) return this.failed(confirmationId, "rejected", "Confirmation request not found.");
    if (this.isExpired(request)) {
      request.status = "expired";
      return this.failed(confirmationId, "expired", "Confirmation request expired.");
    }
    if (this.shouldEnforcePhrase() && request.requiredPhrase && request.requiredPhrase !== input.phrase) {
      return this.failed(confirmationId, "rejected", "Required confirmation phrase mismatch.");
    }
    request.status = "approved";
    return {
      ok: true,
      status: "approved",
      confirmationId,
      approval: {
        userConfirmed: true,
        approvalToken: confirmationId,
        approvedBy: input.approvedBy ?? "user",
        approvalReason: input.reason ?? "Approved via confirmation bridge.",
      },
      metadata: confirmationMetadata,
    };
  }

  reject(confirmationId: string, reason = "Rejected via confirmation bridge."): ComputerUseGuardConfirmationResult {
    const request = this.getActiveRequest(confirmationId);
    if (!request) return this.failed(confirmationId, "rejected", "Confirmation request not found.");
    if (this.isExpired(request)) {
      request.status = "expired";
      return this.failed(confirmationId, "expired", "Confirmation request expired.");
    }
    request.status = "rejected";
    return {
      ok: true,
      status: "rejected",
      confirmationId,
      reason,
      metadata: confirmationMetadata,
    };
  }

  getSnapshot(missionId?: string): ComputerUseGuardConfirmationBridgeSnapshot {
    const records = [...this.requests.values()].map((request) => (this.isExpired(request) && request.status === "pending" ? { ...request, status: "expired" as const } : request));
    return {
      requests: missionId ? records.filter((record) => record.missionId === missionId) : records,
      metadata: confirmationMetadata,
    };
  }

  reset(): void {
    this.requests.clear();
  }

  private failed(confirmationId: string, status: "rejected" | "expired", reason: string): ComputerUseGuardConfirmationResult {
    return { ok: false, status, confirmationId, reason, metadata: confirmationMetadata };
  }

  private getActiveRequest(confirmationId: string): ComputerUseGuardConfirmationRequest | undefined {
    return this.requests.get(confirmationId);
  }

  private shouldEnforcePhrase(): boolean {
    return this.options.enforceRequiredPhrase;
  }

  private isExpired(request: ComputerUseGuardConfirmationRequest): boolean {
    return Boolean(request.expiresAt && Date.parse(request.expiresAt) < Date.parse(this.options.now()));
  }
}
