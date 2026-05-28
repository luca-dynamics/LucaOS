import type { LucaUserTier } from "../../types/lucaUserTier";

export type LucaExecutionStepKind =
  | "tool_call"
  | "voice_command"
  | "computer_use"
  | "filesystem"
  | "network"
  | "skill"
  | "memory"
  | "device_control"
  | "self_evolution"
  | "unknown";

export type LucaExecutionRiskLevel = "low" | "medium" | "high" | "critical";

export type LucaExecutionPermissionMode = "auto_allowed" | "confirm_required" | "origin_required" | "blocked";

export type LucaExecutionVerificationStatus = "not_started" | "pending" | "passed" | "failed" | "warning" | "blocked";

export interface LucaExecutionRuntimePosture {
  runtimeBehaviorChanged: false;
  liveExecutionEnabled: false;
  autonomousExecutionEnabled: false;
  persistenceEnabled: false;
  networkCallsEnabled: false;
}

export interface LucaExecutionIntent {
  id: string;
  summary: string;
  actorTier?: LucaUserTier;
  source?: "voice" | "chat" | "tool" | "skill" | "system" | "unknown";
  clarity?: "clear" | "ambiguous" | "missing";
  requestedAt?: string;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
}

export interface LucaExecutionStep {
  id: string;
  intentId?: string;
  planId?: string;
  kind: LucaExecutionStepKind;
  summary: string;
  riskLevel: LucaExecutionRiskLevel;
  permissionMode: LucaExecutionPermissionMode;
  verificationStatus: LucaExecutionVerificationStatus;
  requiresRollback: boolean;
  rollbackAvailable: boolean;
  receiptRequired: boolean;
  receiptAvailable: boolean;
  privacySensitive?: boolean;
  capability?: string;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
}

export interface LucaExecutionPlan {
  id: string;
  intentId?: string;
  summary: string;
  steps: LucaExecutionStep[];
  riskLevel: LucaExecutionRiskLevel;
  permissionMode: LucaExecutionPermissionMode;
  verificationStatus: LucaExecutionVerificationStatus;
  actorTier?: LucaUserTier;
  rollbackPath?: string;
  receiptRequired: boolean;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
  liveExecutionAllowed: false;
}

export interface LucaDeterministicExecutionSnapshot extends LucaExecutionRuntimePosture {
  intent?: LucaExecutionIntent;
  plan?: LucaExecutionPlan;
  steps: LucaExecutionStep[];
  posture: LucaExecutionRuntimePosture;
  architectureOnly: true;
}

const RISK_ORDER: Record<LucaExecutionRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const SENSITIVE_STEP_KINDS: LucaExecutionStepKind[] = [
  "computer_use",
  "filesystem",
  "network",
  "device_control",
  "self_evolution",
];

export const LUCA_DETERMINISTIC_EXECUTION_RUNTIME_POSTURE: LucaExecutionRuntimePosture = {
  runtimeBehaviorChanged: false,
  liveExecutionEnabled: false,
  autonomousExecutionEnabled: false,
  persistenceEnabled: false,
  networkCallsEnabled: false,
};

function makeContractId(prefix: string, value?: string): string {
  return value && value.trim().length > 0 ? value : `${prefix}:contract-only`;
}

function maxRisk(risks: LucaExecutionRiskLevel[]): LucaExecutionRiskLevel {
  return risks.reduce<LucaExecutionRiskLevel>(
    (highest, risk) => (RISK_ORDER[risk] > RISK_ORDER[highest] ? risk : highest),
    "low",
  );
}

function mostRestrictivePermission(modes: LucaExecutionPermissionMode[]): LucaExecutionPermissionMode {
  if (modes.includes("blocked")) return "blocked";
  if (modes.includes("origin_required")) return "origin_required";
  if (modes.includes("confirm_required")) return "confirm_required";
  return "auto_allowed";
}

export function createExecutionIntent(input: Partial<LucaExecutionIntent> & { summary: string }): LucaExecutionIntent {
  return {
    id: makeContractId("intent", input.id),
    summary: input.summary,
    actorTier: input.actorTier,
    source: input.source ?? "unknown",
    clarity: input.clarity ?? "clear",
    requestedAt: input.requestedAt,
    metadata: input.metadata,
    runtimeBehaviorChanged: false,
  };
}

export function createExecutionStep(input: Partial<LucaExecutionStep> & { summary: string; kind?: LucaExecutionStepKind }): LucaExecutionStep {
  const kind = input.kind ?? "unknown";
  const riskLevel = input.riskLevel ?? inferRiskForStepKind(kind);
  const stepWithoutPermission: LucaExecutionStep = {
    id: makeContractId("step", input.id),
    intentId: input.intentId,
    planId: input.planId,
    kind,
    summary: input.summary,
    riskLevel,
    permissionMode: "blocked",
    verificationStatus: input.verificationStatus ?? "not_started",
    requiresRollback: input.requiresRollback ?? RISK_ORDER[riskLevel] >= RISK_ORDER.high,
    rollbackAvailable: input.rollbackAvailable ?? false,
    receiptRequired: input.receiptRequired ?? SENSITIVE_STEP_KINDS.includes(kind),
    receiptAvailable: input.receiptAvailable ?? false,
    privacySensitive: input.privacySensitive,
    capability: input.capability,
    metadata: input.metadata,
    runtimeBehaviorChanged: false,
  };

  return {
    ...stepWithoutPermission,
    permissionMode: input.permissionMode ?? getExecutionPermissionMode(stepWithoutPermission),
  };
}

export function createExecutionPlan(input: Partial<LucaExecutionPlan> & { summary: string; steps?: LucaExecutionStep[] }): LucaExecutionPlan {
  const steps = input.steps ?? [];
  const riskLevel = input.riskLevel ?? (steps.length > 0 ? maxRisk(steps.map((step) => step.riskLevel)) : "low");
  const planWithoutPermission: LucaExecutionPlan = {
    id: makeContractId("plan", input.id),
    intentId: input.intentId,
    summary: input.summary,
    steps,
    riskLevel,
    permissionMode: "blocked",
    verificationStatus: input.verificationStatus ?? "not_started",
    actorTier: input.actorTier,
    rollbackPath: input.rollbackPath,
    receiptRequired: input.receiptRequired ?? steps.some((step) => step.receiptRequired),
    metadata: input.metadata,
    runtimeBehaviorChanged: false,
    liveExecutionAllowed: false,
  };

  return {
    ...planWithoutPermission,
    permissionMode: input.permissionMode ?? getExecutionPermissionMode(planWithoutPermission, input.actorTier),
  };
}

export function inferRiskForStepKind(kind: LucaExecutionStepKind): LucaExecutionRiskLevel {
  switch (kind) {
    case "voice_command":
    case "memory":
      return "low";
    case "tool_call":
    case "skill":
    case "computer_use":
      return "medium";
    case "filesystem":
    case "network":
    case "device_control":
    case "self_evolution":
      return "high";
    case "unknown":
      return "critical";
  }
}

export function getExecutionRiskLevel(stepOrPlan: LucaExecutionStep | LucaExecutionPlan): LucaExecutionRiskLevel {
  if ("steps" in stepOrPlan && stepOrPlan.steps.length > 0) {
    return maxRisk(stepOrPlan.steps.map((step) => step.riskLevel));
  }

  return stepOrPlan.riskLevel;
}

export function getExecutionPermissionMode(
  stepOrPlan: LucaExecutionStep | LucaExecutionPlan,
  actorTier: LucaUserTier = "unknown",
): LucaExecutionPermissionMode {
  if ("steps" in stepOrPlan) {
    if (stepOrPlan.steps.length > 0) {
      return mostRestrictivePermission(stepOrPlan.steps.map((step) => getExecutionPermissionMode(step, actorTier)));
    }

    return permissionForRiskAndKind(stepOrPlan.riskLevel, "voice_command", actorTier);
  }

  return permissionForRiskAndKind(stepOrPlan.riskLevel, stepOrPlan.kind, actorTier);
}

function permissionForRiskAndKind(
  riskLevel: LucaExecutionRiskLevel,
  kind: LucaExecutionStepKind,
  actorTier: LucaUserTier,
): LucaExecutionPermissionMode {
  if (kind === "unknown") return "blocked";
  if (riskLevel === "critical") return "origin_required";

  const isSensitive = SENSITIVE_STEP_KINDS.includes(kind);
  if (riskLevel === "high" && actorTier === "normal" && isSensitive) return "blocked";
  if (riskLevel === "high" || kind === "self_evolution" || kind === "device_control") return "origin_required";
  if (isSensitive || riskLevel === "medium") return "confirm_required";

  return "auto_allowed";
}

export function getDeterministicExecutionSnapshot(input?: {
  intent?: LucaExecutionIntent;
  plan?: LucaExecutionPlan;
  steps?: LucaExecutionStep[];
}): LucaDeterministicExecutionSnapshot {
  return {
    ...LUCA_DETERMINISTIC_EXECUTION_RUNTIME_POSTURE,
    intent: input?.intent,
    plan: input?.plan,
    steps: input?.steps ?? input?.plan?.steps ?? [],
    posture: LUCA_DETERMINISTIC_EXECUTION_RUNTIME_POSTURE,
    architectureOnly: true,
  };
}
