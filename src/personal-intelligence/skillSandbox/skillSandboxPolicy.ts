import type { PersonalIntelligenceSkillRegistryEntry } from "../skills/skillRegistryTypes";
import { classifySkillSandboxPermissionRequirements } from "./skillSandboxPermissions";
import type { PersonalIntelligenceSkillSandboxPolicyEvaluation } from "./skillSandboxTypes";

const BLOCKED_SURFACES = ["skill execution", "tools and MCP", "workflows", "providers and model router", "memory writes", "files", "network and sockets", "browser runtime", "LucaLink", "device control", "shell and package installation", "generated code"];

export function evaluatePersonalIntelligenceSkillSandboxPolicy(entry: PersonalIntelligenceSkillRegistryEntry): PersonalIntelligenceSkillSandboxPolicyEvaluation {
  const permissions = classifySkillSandboxPermissionRequirements(entry);
  const blockers = [...entry.blockers];
  const warnings = [...entry.warnings];
  const blockedPermission = permissions.some((permission) => permission.blocked);

  if (entry.executionEnabled !== false) blockers.push("Registry entry violates the execution-disabled invariant.");
  if (entry.sideEffectsPerformed !== false) blockers.push("Registry entry reports side effects and cannot be sandbox planned.");
  if (blockedPermission) blockers.push("One or more requested permission kinds are prohibited.");
  if (entry.riskLevel === "critical") blockers.push("Critical-risk skills are blocked.");

  const requiresApproval = entry.riskLevel !== "low" || permissions.some((permission) => permission.approvalRequired);
  const requiresSandbox = entry.riskLevel === "high" || entry.riskLevel === "critical" || permissions.some((permission) => permission.sandboxRequired);
  const requiresRuntimeTrace = entry.riskLevel !== "low" || permissions.length > 0;
  const requiresRollbackPlan = entry.riskLevel === "medium" || entry.riskLevel === "high" || entry.riskLevel === "critical" || permissions.some((permission) => ["memory", "file", "network", "browser", "device"].includes(permission.kind));

  let status: PersonalIntelligenceSkillSandboxPolicyEvaluation["status"] = "ready_for_review";
  if (entry.status === "disabled") status = "disabled";
  else if (entry.status === "blocked" || blockers.length > 0) status = "blocked";
  else if (requiresApproval) status = "approval_required";

  warnings.push("Sandbox planning does not grant execution authority or satisfy approval.");
  return {
    status,
    riskLevel: entry.riskLevel,
    requiresApproval,
    requiresSandbox,
    requiresRuntimeTrace,
    requiresRollbackPlan,
    allowedSurfaces: ["manifest inspection", "permission classification", "approval planning", "trace planning", "rollback planning", "readiness review"],
    blockedSurfaces: [...BLOCKED_SURFACES],
    warnings: [...new Set(warnings)],
    blockers: [...new Set(blockers)],
    executionEnabled: false,
    canExecute: false,
    sideEffectsPerformed: false,
  };
}
