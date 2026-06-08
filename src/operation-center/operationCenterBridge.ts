import type { LucaLinkAdapterFileInstallPermissionDecision } from "../services/lucaLink/adapterFileInstallPermissions";
import type { LucaLinkDryRunHandoffSimulation } from "../services/lucaLink/dryRunHandoff";
import type {
  OperationCenterItem,
  OperationCenterRiskLevel,
  OperationCenterStatus,
} from "./operationCenterTypes";

const FIXTURE_TIME = "2026-06-07T12:00:00.000Z";

type SafeRisk = OperationCenterRiskLevel;
type SafeStatus = OperationCenterStatus;

export interface SkillPermissionGateSummary {
  gateId: string;
  skillId: string;
  planId: string;
  kind: "permission" | "approval";
  permissionKind?: string;
  approvalKind?: string;
  label: string;
  reason: string;
  status: string;
  riskLevel: SafeRisk;
  required: boolean;
  reviewedAt?: string;
  expiresAt?: string;
  decisionReason?: string;
}

interface SafeSummaryBase {
  id: string;
  title: string;
  summary: string;
  status: string;
  riskLevel?: SafeRisk;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  requiredApprovals?: readonly string[];
  blockedActions?: readonly string[];
  warnings?: readonly string[];
  blockers?: readonly string[];
  auditSummary?: string;
}

export interface SkillSandboxPlanSummary extends SafeSummaryBase {
  planId?: string;
  skillId?: string;
}

export interface RuntimeTraceSummary extends SafeSummaryBase {
  traceId?: string;
  relatedMissionId?: string;
}

export interface LearningEventSummary extends SafeSummaryBase {
  traceId?: string;
}

export interface MissionEvaluationSummary extends SafeSummaryBase {
  missionId?: string;
}

export interface MemoryApprovalSummary extends SafeSummaryBase {
  requestId?: string;
}

export interface AdapterSandboxPlanSummary extends SafeSummaryBase {
  planId?: string;
  hostId?: string;
}

export interface WebDisplayIntentSummary extends SafeSummaryBase {
  requestId?: string;
  hostId?: string;
}

export interface ApprovalNotificationSummary extends SafeSummaryBase {
  requestId?: string;
  hostId?: string;
}

export interface SensorSnapshotSummary extends SafeSummaryBase {
  hostId?: string;
}

export interface TransportPermissionDecisionSummary extends SafeSummaryBase {
  requestId?: string;
  hostId?: string;
}

const statusMap: Record<string, SafeStatus> = {
  action_required: "pending",
  allowed_preview: "model_only",
  approval_required: "approval_required",
  blocked: "blocked",
  denied: "denied",
  disabled: "disabled",
  dry_run_passed: "ready_for_review",
  expired: "expired",
  granted_for_review: "granted_for_review",
  misaligned: "approval_required",
  pending: "pending",
  proposal_ready: "ready_for_review",
  read_only: "read_only",
  ready: "read_only",
  ready_for_review: "ready_for_review",
  requires_primary_approval: "approval_required",
  unsupported: "unsupported",
};

const normalizeStatus = (status: string, fallback: SafeStatus): SafeStatus => statusMap[status] ?? fallback;
const copy = (values?: readonly string[]) => values ? [...values] : [];

function createItem(
  input: SafeSummaryBase,
  source: OperationCenterItem["source"],
  category: OperationCenterItem["category"],
  status: SafeStatus,
  relations: Partial<Pick<OperationCenterItem, "relatedSkillId" | "relatedPlanId" | "relatedTraceId" | "relatedMissionId" | "relatedHostId" | "relatedRequestId">> = {},
): OperationCenterItem {
  return {
    itemId: input.id,
    source,
    category,
    title: input.title,
    summary: input.summary,
    status,
    riskLevel: input.riskLevel ?? "low",
    createdAt: input.createdAt ?? FIXTURE_TIME,
    updatedAt: input.updatedAt,
    expiresAt: input.expiresAt,
    ...relations,
    requiredApprovals: copy(input.requiredApprovals),
    blockedActions: copy(input.blockedActions),
    warnings: copy(input.warnings),
    blockers: copy(input.blockers),
    auditSummary: input.auditSummary,
    sideEffectsPerformed: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  };
}

export function createOperationItemsFromSkillPermissionGates(
  gates: readonly SkillPermissionGateSummary[],
): OperationCenterItem[] {
  return gates.map((gate) => createItem({
    id: `operation:${gate.gateId}`,
    title: gate.label,
    summary: gate.reason,
    status: gate.status,
    riskLevel: gate.riskLevel,
    createdAt: gate.reviewedAt ?? FIXTURE_TIME,
    updatedAt: gate.reviewedAt,
    expiresAt: gate.expiresAt,
    requiredApprovals: gate.kind === "approval" || gate.required ? [gate.approvalKind ?? gate.permissionKind ?? "user review"] : [],
    blockedActions: ["skill execution"],
    warnings: gate.decisionReason ? [gate.decisionReason] : [],
    blockers: gate.status === "blocked" ? [gate.reason] : [],
    auditSummary: `Skill permission gate is ${gate.status.replace(/_/g, " ")} for review only.`,
  }, "personal_intelligence", "skill_permission_gate", normalizeStatus(gate.status, "pending"), {
    relatedSkillId: gate.skillId,
    relatedPlanId: gate.planId,
  }));
}

export const createOperationItemsFromSkillSandboxPlans = (plans: readonly SkillSandboxPlanSummary[]) =>
  plans.map((plan) => createItem(plan, "personal_intelligence", "skill_sandbox", normalizeStatus(plan.status, "model_only"), { relatedSkillId: plan.skillId, relatedPlanId: plan.planId }));

export const createOperationItemsFromRuntimeTraces = (traces: readonly RuntimeTraceSummary[]) =>
  traces.map((trace) => createItem(trace, "runtime", "runtime_trace", normalizeStatus(trace.status, "model_only"), { relatedTraceId: trace.traceId, relatedMissionId: trace.relatedMissionId }));

export const createOperationItemsFromLearningEvents = (events: readonly LearningEventSummary[]) =>
  events.map((event) => createItem(event, "personal_intelligence", "learning_event", normalizeStatus(event.status, "ready_for_review"), { relatedTraceId: event.traceId }));

export const createOperationItemsFromMissionEvaluations = (evaluations: readonly MissionEvaluationSummary[]) =>
  evaluations.map((evaluation) => createItem(evaluation, "personal_intelligence", "mission_alignment", normalizeStatus(evaluation.status, "approval_required"), { relatedMissionId: evaluation.missionId }));

export const createOperationItemsFromMemoryApprovalPilot = (summaries: readonly MemoryApprovalSummary[]) =>
  summaries.map((summary) => createItem(summary, "personal_intelligence", "memory_approval", normalizeStatus(summary.status, "approval_required"), { relatedRequestId: summary.requestId }));

export const createOperationItemsFromAdapterSandboxPlans = (plans: readonly AdapterSandboxPlanSummary[]) =>
  plans.map((plan) => createItem(plan, "lucalink", "adapter_sandbox", normalizeStatus(plan.status, "model_only"), { relatedPlanId: plan.planId, relatedHostId: plan.hostId }));

export const createOperationItemsFromWebDisplayIntents = (intents: readonly WebDisplayIntentSummary[]) =>
  intents.map((intent) => createItem(intent, "lucalink", "web_display", normalizeStatus(intent.status, "approval_required"), { relatedRequestId: intent.requestId, relatedHostId: intent.hostId }));

export const createOperationItemsFromApprovalNotifications = (notifications: readonly ApprovalNotificationSummary[]) =>
  notifications.map((notification) => createItem(notification, "lucalink", "approval_notification", normalizeStatus(notification.status, "pending"), { relatedRequestId: notification.requestId, relatedHostId: notification.hostId }));

export const createOperationItemsFromSensorSnapshots = (snapshots: readonly SensorSnapshotSummary[]) =>
  snapshots.map((snapshot) => createItem(snapshot, "lucalink", "sensor_bridge", normalizeStatus(snapshot.status, "read_only"), { relatedHostId: snapshot.hostId }));

export const createOperationItemsFromTransportPermissionDecisions = (decisions: readonly TransportPermissionDecisionSummary[]) =>
  decisions.map((decision) => createItem(decision, "lucalink", "transport_permission", normalizeStatus(decision.status, "model_only"), { relatedRequestId: decision.requestId, relatedHostId: decision.hostId }));

export const createOperationItemsFromAdapterFileInstallDecisions = (
  decisions: readonly LucaLinkAdapterFileInstallPermissionDecision[],
) => decisions.map((decision) => createItem({
  id: `operation:${decision.decisionId}`,
  title: decision.operation === "file_write"
    ? "Adapter file-write permission decision"
    : "Adapter install permission decision",
  summary: decision.reason,
  status: decision.status,
  riskLevel: decision.riskLevel,
  requiredApprovals: decision.requiredApprovals
    .filter((requirement) => !requirement.satisfied)
    .map((requirement) => requirement.kind),
  blockedActions: decision.operation === "file_write"
    ? ["adapter file write", "adapter execution"]
    : ["adapter package install", "adapter execution"],
  warnings: decision.warnings,
  blockers: decision.blockers,
  auditSummary: `${decision.operation.replace(/_/g, " ")} decision is ${decision.status.replace(/_/g, " ")} for informational review only.`,
}, "lucalink", "adapter_file_install", normalizeStatus(decision.status, "unsupported"), {
  relatedRequestId: decision.requestId,
}));


export const createOperationItemsFromLucaLinkDryRunHandoffSimulations = (
  simulations: readonly LucaLinkDryRunHandoffSimulation[],
) => simulations.map((simulation) => createItem({
  id: `operation:${simulation.simulationId}`,
  title: "LucaLink dry-run handoff simulation",
  summary: `${simulation.transportSummary} ${simulation.adapterSummary}`,
  status: simulation.status,
  riskLevel: simulation.riskLevel,
  createdAt: simulation.createdAt,
  requiredApprovals: simulation.requiredApprovals,
  blockedActions: simulation.blockedActions,
  warnings: simulation.warnings,
  blockers: simulation.blockers,
  auditSummary: `Dry-run only with ${simulation.simulatedSteps.length} deterministic steps; handoff and every runtime capability remain disabled.`,
}, "lucalink", "lucalink_dry_run", normalizeStatus(simulation.status, "disabled"), {
  relatedHostId: simulation.targetHostId,
}));
