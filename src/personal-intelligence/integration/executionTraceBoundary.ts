import { EXECUTION_DOCTRINE_STAGES } from "../doctrine/executionDoctrine";
import type { ExecutionTrace, ExecutionTraceEvent } from "../doctrine/executionDoctrine";
import type { IntegrationMappingDescription } from "./integrationTypes";

export type ExecutionTracePreviewInput = Omit<ExecutionTrace, "events"> & { events?: ExecutionTraceEvent[] };

export function createExecutionTracePreview(input: ExecutionTracePreviewInput): ExecutionTrace {
  const trace: ExecutionTrace = { ...input, events: (input.events ?? []).map(cloneEvent) };
  validateTrace(trace);
  return trace;
}

export function appendExecutionTraceEventPreview(trace: ExecutionTrace, event: ExecutionTraceEvent): ExecutionTrace {
  validateEvent(trace.traceId, event);
  if (trace.events.some((candidate) => candidate.eventId === event.eventId)) throw new Error(`Execution trace event already exists: ${event.eventId}`);
  return { ...trace, events: [...trace.events.map(cloneEvent), cloneEvent(event)] };
}

export function describeRuntimeTraceMapping(): IntegrationMappingDescription {
  return {
    source: "future runtime evidence",
    destination: "Execution Trace preview",
    previewFields: ["traceId", "missionId", "stage", "status", "timestamp", "summary", "detail"],
    forbiddenEffects: ["runtime action", "tool execution", "approval mutation", "automatic learning"],
    notes: ["Trace events are evidence/state only."],
  };
}

export function describeApprovalTraceRequirements(): string[] {
  return [
    "The approve stage records that approval is required; it does not grant approval.",
    "The act stage may only be represented as pending or blocked in this preview boundary.",
    "Approval provenance and runtime enforcement require a separate governed PR.",
  ];
}

function validateTrace(trace: ExecutionTrace): void {
  if (!trace.traceId.trim()) throw new Error("Invalid execution trace preview: traceId is required");
  if (Number.isNaN(Date.parse(trace.startedAt))) throw new Error("Invalid execution trace preview: startedAt must be an ISO date");
  trace.events.forEach((event) => validateEvent(trace.traceId, event));
}

function validateEvent(traceId: string, event: ExecutionTraceEvent): void {
  if (event.traceId !== traceId) throw new Error("Execution trace event must match traceId");
  if (!event.eventId.trim()) throw new Error("Execution trace eventId is required");
  if (!EXECUTION_DOCTRINE_STAGES.includes(event.stage)) throw new Error("Execution trace stage is invalid");
  if (Number.isNaN(Date.parse(event.timestamp))) throw new Error("Execution trace timestamp must be an ISO date");
  if (!event.summary.trim()) throw new Error("Execution trace summary is required");
  if (event.stage === "approve" && !["pending", "blocked"].includes(event.status)) throw new Error("Preview traces cannot grant approval");
  if (event.stage === "act" && !["pending", "blocked"].includes(event.status)) throw new Error("Preview act events must remain pending or blocked");
}

function cloneEvent(event: ExecutionTraceEvent): ExecutionTraceEvent {
  return { ...event, detail: event.detail ? { ...event.detail } : undefined };
}
