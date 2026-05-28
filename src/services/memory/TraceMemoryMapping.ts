import { LUCA_MEMORY_CONTRACT_METADATA, type LucaMemoryItem, type LucaMemoryScope } from "./MemoryContracts";

export type LucaTraceMemorySourceKind =
  | "luca_tracing"
  | "mission_tape"
  | "mission_tape_recorder"
  | "tool_trace"
  | "workflow_trace"
  | "unknown";

export interface LucaTraceMemoryMappingInput {
  sourceKind?: LucaTraceMemorySourceKind;
  trace: Record<string, unknown>;
  scope?: LucaMemoryScope;
  metadata?: Record<string, unknown>;
}

export interface LucaTraceMemoryMappingResult {
  ok: boolean;
  item?: LucaMemoryItem;
  items?: LucaMemoryItem[];
  reason?: string;
  metadata: Record<string, unknown>;
}

const now = () => Date.now();
const asRecord = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
const asString = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

function normalizeTime(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function stableId(prefix: string, rawId?: string): string {
  return `${prefix}-${rawId || `mapped-${now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

export function inferTraceMemorySourceKind(trace: Record<string, unknown>): LucaTraceMemorySourceKind {
  if (Array.isArray(trace.steps) && asString(trace.missionId)) return "mission_tape";
  if (asString(trace.traceId) && asString(trace.event)) return "luca_tracing";
  if (asString(trace.toolName) || asString(trace.toolOrRuntime)) return "tool_trace";
  if (asString(trace.workflowId)) return "workflow_trace";
  if (Array.isArray(trace.guard) || Array.isArray(trace.verification) || Array.isArray(trace.recovery)) return "mission_tape_recorder";
  return "unknown";
}

export function mapTraceToLucaMemoryItem(input: LucaTraceMemoryMappingInput): LucaTraceMemoryMappingResult {
  const sourceKind = input.sourceKind || inferTraceMemorySourceKind(input.trace);
  if (sourceKind === "mission_tape" || sourceKind === "mission_tape_recorder") {
    return mapMissionTapeToLucaMemoryItems(input);
  }

  const trace = input.trace;
  const traceId = asString(trace.traceId) || asString(trace.id);
  const timestamp = normalizeTime(trace.timestamp) ?? now();
  const data = asRecord(trace.data);
  const metadata = asRecord(trace.metadata);
  const item: LucaMemoryItem = {
    id: stableId("trace", traceId),
    tier: "trace",
    scope: {
      ...(input.scope || {}),
      missionId: asString(trace.missionId) || input.scope?.missionId,
      workflowId: asString(trace.workflowId) || input.scope?.workflowId,
      source: "luca_tracing",
    },
    content: JSON.stringify({ event: trace.event || "unknown", traceId, agentId: trace.agentId, duration: trace.duration, error: trace.error }),
    summary: `Trace event ${String(trace.event || "unknown")} for ${traceId || "unknown-trace"}`,
    tags: ["trace", sourceKind, asString(trace.event), asString(trace.status)].filter(Boolean) as string[],
    source: "luca_tracing",
    confidence: 1,
    createdAt: timestamp,
    metadata: {
      traceId,
      spanId: asString(trace.spanId) || asString((trace as Record<string, unknown>).parentSpanId),
      agentId: asString(trace.agentId),
      eventName: asString(trace.event),
      timing: { timestamp, duration: trace.duration },
      status: asString(trace.status),
      error: trace.error,
      snapshot: trace.snapshot,
      data,
      raw: trace,
      sourceKind,
      ...(input.metadata || {}),
      ...metadata,
      ...LUCA_MEMORY_CONTRACT_METADATA,
    },
  };

  return { ok: true, item, metadata: getTraceMemoryMappingSnapshot({ sourceKind, count: 1 }) };
}

export function mapMissionTapeStepToLucaMemoryItem(input: LucaTraceMemoryMappingInput & { step: Record<string, unknown>; stepIndex: number }): LucaTraceMemoryMappingResult {
  const tape = input.trace;
  const step = input.step;
  const missionId = asString(tape.missionId) || input.scope?.missionId;
  const stepId = asString(step.stepId) || `${input.stepIndex}`;
  const status = asString(step.status);
  const timestamp = normalizeTime(step.timestamp) ?? normalizeTime(tape.startedAt) ?? now();
  const toolName = asString(step.toolName) || asString(step.toolOrRuntime);
  const failed = status === "failed" || Boolean(step.error);

  const item: LucaMemoryItem = {
    id: stableId("mission-step", `${missionId || "unknown"}-${stepId}`),
    tier: "operational",
    scope: { ...(input.scope || {}), missionId, source: "mission_tape" },
    content: JSON.stringify({ goal: step.goal, status, notes: step.notes, toolName }),
    summary: `Mission step ${stepId} ${status || "recorded"}`,
    tags: ["mission_tape", "step", status, input.sourceKind || "mission_tape"].filter(Boolean) as string[],
    source: "mission_tape",
    confidence: 1,
    createdAt: timestamp,
    metadata: {
      missionId,
      stepId,
      stepIndex: input.stepIndex,
      toolName,
      success: failed ? false : status ? ["executed", "verified", "recovered"].includes(status) : undefined,
      failure: failed,
      status,
      raw: step,
      ...LUCA_MEMORY_CONTRACT_METADATA,
      ...(input.metadata || {}),
    },
  };
  return { ok: true, item, metadata: getTraceMemoryMappingSnapshot({ sourceKind: input.sourceKind || "mission_tape", count: 1 }) };
}

export function mapMissionTapeToLucaMemoryItems(input: LucaTraceMemoryMappingInput): LucaTraceMemoryMappingResult {
  const tape = input.trace;
  const sourceKind = input.sourceKind || inferTraceMemorySourceKind(tape);
  const missionId = asString(tape.missionId) || input.scope?.missionId;
  const status = asString(tape.status);
  const startedAt = normalizeTime(tape.startedAt) ?? now();
  const completedAt = normalizeTime(tape.completedAt);
  const steps = Array.isArray(tape.steps) ? tape.steps.map(asRecord) : [];
  const guard = Array.isArray(tape.guard) ? tape.guard.map(asRecord) : [];
  const verification = Array.isArray(tape.verification) ? tape.verification.map(asRecord) : [];
  const recovery = Array.isArray(tape.recovery) ? tape.recovery.map(asRecord) : [];
  const toolNames = steps.map((s) => asString(s.toolName) || asString(s.toolOrRuntime)).filter(Boolean) as string[];
  const hasErrors = steps.some((s) => asString(s.status) === "failed" || Boolean(s.error));

  const summary = `Mission ${missionId || "unknown"} ${status || "recorded"}; ${steps.length} steps`;

  const missionItem: LucaMemoryItem = {
    id: stableId("mission-tape", missionId),
    tier: "trace",
    scope: { ...(input.scope || {}), missionId, source: "mission_tape" },
    content: JSON.stringify({ missionId, status, steps: steps.length, guard: guard.length, verification: verification.length, recovery: recovery.length }),
    summary,
    tags: ["mission_tape", status, sourceKind].filter(Boolean) as string[],
    source: sourceKind === "unknown" ? "mission_tape" : sourceKind,
    confidence: 1,
    createdAt: startedAt,
    updatedAt: completedAt,
    metadata: {
      missionId,
      status,
      startedAt: tape.startedAt,
      completedAt: tape.completedAt,
      durationMs: completedAt ? completedAt - startedAt : undefined,
      toolNames,
      hasErrors,
      resultSummary: asRecord(tape.result),
      rawIds: {
        missionId,
        traceId: asString(tape.traceId),
      },
      rawShape: {
        hasSteps: Array.isArray(tape.steps),
        hasGuard: Array.isArray(tape.guard),
        hasVerification: Array.isArray(tape.verification),
        hasRecovery: Array.isArray(tape.recovery),
      },
      raw: tape,
      ...(input.metadata || {}),
      ...LUCA_MEMORY_CONTRACT_METADATA,
    },
  };

  const stepItems = steps.map((step, idx) => mapMissionTapeStepToLucaMemoryItem({ ...input, step, stepIndex: idx }).item).filter(Boolean) as LucaMemoryItem[];
  return { ok: true, items: [missionItem, ...stepItems], item: missionItem, metadata: getTraceMemoryMappingSnapshot({ sourceKind, count: 1 + stepItems.length }) };
}

export function getTraceMemoryMappingSnapshot(input?: Record<string, unknown>) {
  return {
    ...LUCA_MEMORY_CONTRACT_METADATA,
    adapterOnly: true,
    runtimeBehaviorChanged: false,
    traceWritesRedirected: false,
    tapeWritesRedirected: false,
    migrationRequired: false,
    ...(input || {}),
  };
}
