import {
  ComputerUseMissionIntegrationResult,
  ComputerUseMissionTapeSinkRecord,
  ComputerUseMissionTapeSinkSnapshot,
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
    return Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, typeof v === "string" && k.toLowerCase().includes("text") ? "[REDACTED]" : v]),
    );
  }
}
