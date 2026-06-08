import type { PersonalIntelligenceSkillRegistryEntry } from "../skills/skillRegistryTypes";
import type { PersonalIntelligenceSkillSandboxApprovalKind, PersonalIntelligenceSkillSandboxApprovalRequirement, PersonalIntelligenceSkillSandboxPermissionRequirement, PersonalIntelligenceSkillSandboxPlan } from "./skillSandboxTypes";
import { classifySkillSandboxPermissionRequirements } from "./skillSandboxPermissions";

function isPlan(value: PersonalIntelligenceSkillSandboxPlan | PersonalIntelligenceSkillRegistryEntry): value is PersonalIntelligenceSkillSandboxPlan {
  return "requiredApprovals" in value && "sandboxMode" in value;
}

export function createSkillSandboxApprovalRequirements(planOrEntry: PersonalIntelligenceSkillSandboxPlan | PersonalIntelligenceSkillRegistryEntry): PersonalIntelligenceSkillSandboxApprovalRequirement[] {
  const permissions: PersonalIntelligenceSkillSandboxPermissionRequirement[] = isPlan(planOrEntry)
    ? planOrEntry.requiredPermissions
    : classifySkillSandboxPermissionRequirements(planOrEntry);
  const riskLevel = planOrEntry.riskLevel;
  const privacyZones = isPlan(planOrEntry) ? [] : planOrEntry.privacyZones;
  const kinds = new Map<PersonalIntelligenceSkillSandboxApprovalKind, string>();

  if (riskLevel !== "low") kinds.set("user", "Non-low-risk skills require explicit user approval.");
  if (permissions.length > 0 && privacyZones.some((zone) => !["public", "project"].includes(zone))) kinds.set("privacy", "Private or sensitive privacy zones require separate privacy review.");
  for (const permission of permissions) {
    const kind = permission.kind === "device" ? "primary_host" : permission.kind;
    if (["memory", "model", "tool", "connector", "network", "file", "browser", "lucalink", "primary_host"].includes(kind)) {
      kinds.set(kind as PersonalIntelligenceSkillSandboxApprovalKind, permission.reason);
    }
    if (permission.kind === "lucalink" || permission.kind === "device") kinds.set("primary_host", "LucaLink or device-related requests require primary-host approval.");
  }
  if (riskLevel === "high" || riskLevel === "critical") kinds.set("safety", "High or critical risk requires independent safety approval.");

  return [...kinds].map(([kind, reason], index) => ({
    approvalId: `sandbox-approval:${kind}:${index + 1}`,
    kind,
    label: `${kind.replace(/_/g, " ")} approval`,
    required: true,
    satisfied: false,
    reason,
  }));
}
