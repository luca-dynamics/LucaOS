import type { PersonalIntelligenceSkillSandboxApprovalRequirement, PersonalIntelligenceSkillSandboxPermissionRequirement } from "../skillSandbox";
import type { PersonalIntelligenceSkillPermissionDecision, PersonalIntelligenceSkillPermissionGate } from "./skillPermissionGrantTypes";

export const DEFAULT_PERMISSION_REVIEW_DURATION_MS = 15 * 60 * 1000;

export function permissionGateInitialStatus(
  requirement: PersonalIntelligenceSkillSandboxPermissionRequirement | PersonalIntelligenceSkillSandboxApprovalRequirement,
): PersonalIntelligenceSkillPermissionGate["status"] {
  if ("blocked" in requirement && requirement.blocked) return "blocked";
  if ("kind" in requirement && requirement.kind === "primary_host") return "requires_primary_approval";
  return "pending";
}

export function canApplySkillPermissionDecision(
  gate: PersonalIntelligenceSkillPermissionGate,
  decision: PersonalIntelligenceSkillPermissionDecision,
): boolean {
  if (gate.status === "blocked") return false;
  if (decision === "grant_for_review" && gate.status === "requires_primary_approval") return false;
  if (decision === "grant_for_review") return ["pending", "denied", "expired"].includes(gate.status);
  if (decision === "deny") return gate.status !== "denied";
  return gate.status === "granted_for_review";
}
