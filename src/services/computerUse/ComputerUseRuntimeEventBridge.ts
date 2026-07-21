import {
  ComputerUseBrowserRuntimeAdapterEventInput,
  ComputerUseBrowserRuntimeAdapterRequest,
  ComputerUseBrowserRuntimeAdapterResult,
  ComputerUseMissionIntegrationResult,
  ComputerUseMissionTapeSinkRecord,
  ComputerUseMissionTapeSinkSnapshot,
  ComputerUseGuardDecisionEventInput,
  ComputerUseMissionStepAdapterResult,
  ComputerUseRuntimeEventBridgeOptions,
  ComputerUseRuntimeEventBridgeRecordInput,
  ComputerUseRuntimeEventBridgeResult,
  ComputerUseRuntimeEventType,
} from "./types";

export class ComputerUseRuntimeEventBridge {
  private readonly options: Required<Pick<ComputerUseRuntimeEventBridgeOptions, "redactSensitiveText" | "now">> &
    Pick<ComputerUseRuntimeEventBridgeOptions, "tapeSink">;

  constructor(options: ComputerUseRuntimeEventBridgeOptions) {
    this.options = {
      tapeSink: options.tapeSink,
      redactSensitiveText: options.redactSensitiveText ?? true,
      now: options.now ?? (() => new Date().toISOString()),
    };
  }

  recordDispatchStarted(input: ComputerUseRuntimeEventBridgeRecordInput): ComputerUseRuntimeEventBridgeResult {
    return this.writeRecord("computer_use_dispatch_started", input.missionId, {
      stepId: input.stepId,
      kind: input.kind,
    });
  }

  recordIntegrationResult(result: ComputerUseMissionIntegrationResult): ComputerUseRuntimeEventBridgeResult {
    const missionId = result.step?.missionId ?? "unknown";
    const eventType: ComputerUseRuntimeEventType = result.ok ? "computer_use_dispatch_completed" : "computer_use_dispatch_rejected";
    return this.writeRecord(eventType, missionId, {
      ok: result.ok,
      stepId: result.step?.stepId,
      kind: result.step?.kind,
      reason: result.reason,
      stepResultStatus: result.stepResult?.status,
    });
  }

  recordStepResult(result: ComputerUseMissionStepAdapterResult): ComputerUseRuntimeEventBridgeResult {
    return this.writeRecord("computer_use_step_result", result.missionId, {
      stepId: result.stepId,
      kind: result.kind,
      status: result.status,
      reason: result.reason,
    });
  }

  recordBrowserAdapterStarted(input: ComputerUseBrowserRuntimeAdapterEventInput): ComputerUseRuntimeEventBridgeResult {
    return this.writeRecord("computer_use_browser_adapter_started", input.missionId ?? "unknown", {
      missionId: input.missionId,
      stepId: input.stepId,
      traceId: input.traceId,
      source: input.source,
      lane: input.lane,
      actionType: input.actionType,
      reason: input.reason,
    });
  }

  recordBrowserAdapterResult(
    result: ComputerUseBrowserRuntimeAdapterResult,
    request?: ComputerUseBrowserRuntimeAdapterRequest,
  ): ComputerUseRuntimeEventBridgeResult {
    const reason = result.metadata.reason ?? "";
    const isRejected = reason.toLowerCase().includes("opt-in") || reason.toLowerCase().includes("unsupported");
    const eventType: ComputerUseRuntimeEventType =
      result.status === "executed"
        ? "computer_use_browser_adapter_completed"
        : isRejected
          ? "computer_use_browser_adapter_rejected"
          : "computer_use_browser_adapter_failed";
    const missionId = request?.context?.missionId ?? "unknown";
    return this.writeRecord(eventType, missionId, {
      missionId: request?.context?.missionId,
      stepId: request?.context?.stepId,
      traceId: request?.context?.traceId,
      source: request?.context?.source,
      lane: request?.lane,
      actionType: request?.action?.type,
      status: result.status,
      reason,
      simulated: result.metadata.simulated,
      adapterKind: result.metadata.adapterKind,
    });
  }

  recordGuardDecision(input: ComputerUseGuardDecisionEventInput): ComputerUseRuntimeEventBridgeResult {
    const missionId = input.missionId ?? "unknown";
    const payload = {
      missionId: input.missionId,
      stepId: input.stepId,
      actionType: input.actionType,
      riskLevel: input.riskLevel,
      status: input.status,
      reason: input.reason,
      confirmationRequired: input.confirmationRequired,
      approvalRequirement: input.approvalRequirement,
      approvedBy: input.approvedBy,
      guardPolicyKind: input.guardPolicyKind,
      confirmationId: input.confirmationId,
      storageWritesEnabled: false,
      systemApisCalled: false,
      directHostAllowed: false,
      requiresExplicitOptIn: true,
    };
    const generic = this.writeRecord("computer_use_guard_decision", missionId, payload);
    if (!generic.ok) return generic;
    if (input.status === "allowed") this.writeRecord("computer_use_guard_allowed", missionId, payload);
    if (input.status === "denied") this.writeRecord("computer_use_guard_denied", missionId, payload);
    if (input.status === "needs_confirmation") this.writeRecord("computer_use_guard_needs_confirmation", missionId, payload);
    return generic;
  }

  getSnapshot(missionId?: string): ComputerUseMissionTapeSinkSnapshot {
    return this.options.tapeSink.getSnapshot(missionId);
  }

  reset(): void {
    this.options.tapeSink.reset();
  }

  private writeRecord(eventType: ComputerUseRuntimeEventType, missionId: string, payload: Record<string, unknown>): ComputerUseRuntimeEventBridgeResult {
    try {
      const record: ComputerUseMissionTapeSinkRecord = {
        missionId,
        timestamp: this.options.now(),
        eventType,
        payload: this.sanitize(payload),
        metadata: {
          tapeSinkKind: "scaffold",
          eventBridgeKind: "scaffold",
          storageWritesEnabled: false,
          missionTapeImported: false,
          systemApisCalled: false,
        },
      };
      this.options.tapeSink.record(record);
      return { ok: true, record, metadata: record.metadata };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Unknown recording failure",
        metadata: {
          eventBridgeKind: "scaffold",
          storageWritesEnabled: false,
          missionTapeImported: false,
          systemApisCalled: false,
        },
      };
    }
  }

  private sanitize(payload: Record<string, unknown>): Record<string, unknown> {
    if (!this.options.redactSensitiveText) return payload;
    const actionType = payload.actionType;
    return Object.fromEntries(
      Object.entries(payload).map(([k, v]) => {
        if (typeof v !== "string") return [k, v];
        if (k.toLowerCase().includes("text")) return [k, "[REDACTED]"];
        // type_text reasons often carry typed content — redact them.
        if (k === "reason" && actionType === "type_text") return [k, "[REDACTED]"];
        return [k, v];
      }),
    );
  }
}
