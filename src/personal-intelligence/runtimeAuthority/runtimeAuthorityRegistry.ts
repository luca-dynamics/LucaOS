import type { PersonalIntelligenceSkillDryRunSimulation } from "../skillDryRun";
import type { PersonalIntelligenceSkillPermissionGate } from "../skillPermissions";
import type { PersonalIntelligenceSkillSandboxPlan } from "../skillSandbox";
import type { PersonalIntelligenceSkillRegistryEntry } from "../skills";
import { classifyPersonalIntelligenceRuntimeAuthority } from "./runtimeAuthorityPolicy";
import type {
  PersonalIntelligenceRuntimeAuthorityRecord,
  PersonalIntelligenceRuntimeAuthoritySource,
  PersonalIntelligenceRuntimeCapabilityKind,
} from "./runtimeAuthorityTypes";

export interface RuntimeAuthoritySummaryInput {
  id: string;
  source: PersonalIntelligenceRuntimeAuthoritySource;
  capabilityKind: PersonalIntelligenceRuntimeCapabilityKind | string;
  riskLevel?: PersonalIntelligenceRuntimeAuthorityRecord["riskLevel"];
  skillId?: string;
  manifestId?: string;
  planId?: string;
  simulationId?: string;
  createdAt?: string;
}

export interface CreatePersonalIntelligenceRuntimeCapabilityRegistryInput {
  skillRegistryEntries?: readonly PersonalIntelligenceSkillRegistryEntry[];
  sandboxPlans?: readonly PersonalIntelligenceSkillSandboxPlan[];
  permissionGates?: readonly PersonalIntelligenceSkillPermissionGate[];
  dryRunSimulations?: readonly PersonalIntelligenceSkillDryRunSimulation[];
  memoryProposalSummaries?: readonly RuntimeAuthoritySummaryInput[];
  missionEvaluations?: readonly RuntimeAuthoritySummaryInput[];
  runtimeTraceSummaries?: readonly RuntimeAuthoritySummaryInput[];
  capabilitySummaries?: readonly RuntimeAuthoritySummaryInput[];
  now?: () => Date;
}

const capabilityMap: ReadonlyArray<[RegExp, PersonalIntelligenceRuntimeCapabilityKind]> = [
  [/shell/, "shell_command"], [/install|package/, "install_package"], [/credential|secret|token/, "credential_access"],
  [/private.reasoning|hidden.prompt/, "private_reasoning_access"], [/generated.code|code.execution/, "generated_code_execution"],
  [/device/, "device_control"], [/payment|trading/, "payment_or_trading"], [/memory.proposal/, "memory_proposal"],
  [/memory.write/, "memory_write"], [/mcp/, "mcp_invocation"], [/tool/, "tool_invocation"],
  [/workflow/, "workflow_execution"], [/model|summarization/, "model_call"], [/browser/, "browser_action"],
  [/network/, "network_access"], [/file.write/, "file_write"], [/file|text.read/, "file_read"],
  [/connector/, "connector_access"], [/lucalink/, "lucalink_handoff"],
];
const inferKind = (value: string): PersonalIntelligenceRuntimeCapabilityKind =>
  capabilityMap.find(([pattern]) => pattern.test(value.toLowerCase()))?.[1] ?? "skill_execution";

export function createPersonalIntelligenceRuntimeCapabilityRegistry(
  input: CreatePersonalIntelligenceRuntimeCapabilityRegistryInput,
): PersonalIntelligenceRuntimeAuthorityRecord[] {
  const now = input.now ?? (() => new Date());
  const summaries: RuntimeAuthoritySummaryInput[] = [];
  for (const entry of input.skillRegistryEntries ?? []) {
    const declarations = entry.requiredCapabilities.length ? entry.requiredCapabilities : ["skill_execution"];
    for (const declaration of declarations) summaries.push({
      id: `${entry.skillId}:${declaration}`,
      source: "skill_registry",
      capabilityKind: inferKind(declaration),
      riskLevel: entry.riskLevel,
      skillId: entry.skillId,
      manifestId: entry.manifestId,
    });
  }
  for (const plan of input.sandboxPlans ?? []) for (const permission of plan.requiredPermissions) summaries.push({
    id: permission.permissionId,
    source: "sandbox_plan",
    capabilityKind: inferKind(permission.kind),
    riskLevel: permission.riskLevel,
    skillId: plan.skillId,
    manifestId: plan.manifestId,
    planId: plan.planId,
    createdAt: plan.createdAt,
  });
  for (const gate of input.permissionGates ?? []) summaries.push({
    id: gate.gateId,
    source: "permission_gates",
    capabilityKind: inferKind(gate.permissionKind ?? gate.approvalKind ?? "skill_execution"),
    riskLevel: gate.riskLevel,
    skillId: gate.skillId,
    manifestId: gate.manifestId,
    planId: gate.planId,
    createdAt: gate.reviewedAt,
  });
  for (const simulation of input.dryRunSimulations ?? []) summaries.push({
    id: simulation.simulationId,
    source: "dry_run",
    capabilityKind: "skill_execution",
    riskLevel: simulation.riskLevel,
    skillId: simulation.skillId,
    manifestId: simulation.manifestId,
    planId: simulation.planId,
    simulationId: simulation.simulationId,
    createdAt: simulation.createdAt,
  });
  summaries.push(
    ...(input.memoryProposalSummaries ?? []),
    ...(input.missionEvaluations ?? []),
    ...(input.runtimeTraceSummaries ?? []),
    ...(input.capabilitySummaries ?? []),
  );

  return summaries.map((summary) => {
    const simulation = input.dryRunSimulations?.find((item) =>
      item.simulationId === summary.simulationId || item.skillId === summary.skillId
    );
    const gates = (input.permissionGates ?? []).filter((gate) => gate.skillId === summary.skillId);
    const policy = classifyPersonalIntelligenceRuntimeAuthority({
      capabilityKind: summary.capabilityKind,
      source: summary.source,
      riskLevel: summary.riskLevel,
      manifestPresent: Boolean(summary.manifestId) || summary.source === "fixture",
      sandboxPlanPresent: Boolean(summary.planId) || summary.source === "fixture" || summary.source === "skill_registry",
      declarationsComplete: Boolean(summary.id),
      dryRunSuccessful: simulation?.status === "ready_for_review",
      requiredGatesGrantedForReview: gates.length > 0
        && gates.filter((gate) => gate.required).every((gate) => gate.status === "granted_for_review"),
      hasBlockedDeniedOrExpiredGates: gates.some((gate) => ["blocked", "denied", "expired"].includes(gate.status)),
      missionAlignment: simulation?.missionAlignmentSummary.status === "aligned"
        ? "aligned"
        : simulation?.missionAlignmentSummary.status === "misaligned"
          ? "misaligned"
          : simulation ? "reviewed" : "not_provided",
      rollbackExpectationExists: Boolean(simulation?.rollbackExpectations.length),
      runtimeTracePreviewExists: Boolean(simulation?.runtimeTracePreview),
      permanentBlockedCapabilityPresent: (input.skillRegistryEntries ?? [])
        .filter((entry) => entry.skillId === summary.skillId)
        .some((entry) => [...entry.requiredCapabilities, ...entry.requiredPermissions].some((value) => [
          "shell_command", "install_package", "credential_access", "device_control", "payment_or_trading",
          "generated_code_execution", "private_reasoning_access",
        ].includes(inferKind(value)))),
    });
    return {
      authorityId: `runtime-authority:${summary.id}`,
      createdAt: summary.createdAt ?? now().toISOString(),
      source: summary.source,
      skillId: summary.skillId,
      manifestId: summary.manifestId,
      planId: summary.planId,
      simulationId: summary.simulationId,
      capabilityKind: knownCapability(summary.capabilityKind),
      ...policy,
    };
  });
}

function knownCapability(value: string): PersonalIntelligenceRuntimeCapabilityKind {
  const known = [
    "skill_execution", "tool_invocation", "mcp_invocation", "workflow_execution", "model_call",
    "memory_proposal", "memory_write", "browser_action", "network_access", "file_read", "file_write",
    "connector_access", "lucalink_handoff", "shell_command", "install_package", "credential_access",
    "payment_or_trading", "device_control", "generated_code_execution", "private_reasoning_access", "unknown",
  ];
  return known.includes(value) ? value as PersonalIntelligenceRuntimeCapabilityKind : "unknown";
}
