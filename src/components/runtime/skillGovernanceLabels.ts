// skillGovernanceLabels — PR #128: Skill Marketplace / Skill Request UX
// Pure helper functions for skill request labels, tones, and next-action copy.
// No service imports. No localStorage. No execution. No side effects.

import type { ApprovalRequestRiskLevel } from "../../types/approvalCenter";
import type {
  SkillGovernanceRequestStatus,
  SkillGovernanceRequestType,
} from "../../types/skillGovernance";

export type SkillGovernanceTone = "good" | "warn" | "danger" | "neutral" | "info";

export function getSkillRequestLabel(status: SkillGovernanceRequestStatus): string {
  switch (status) {
    case "proposed": return "Skill proposed";
    case "approval_required": return "Needs approval";
    case "approved_waiting_install": return "Approved — waiting secure install bridge";
    case "approved_waiting_execution": return "Approved — waiting secure execution bridge";
    case "rejected": return "Rejected";
    case "blocked": return "Blocked for safety";
    case "expired": return "Expired";
    case "revoked": return "Revoked";
  }
}

export function getSkillRequestTone(status: SkillGovernanceRequestStatus): SkillGovernanceTone {
  switch (status) {
    case "proposed": return "info";
    case "approval_required": return "warn";
    case "approved_waiting_install":
    case "approved_waiting_execution":
      return "info";
    case "blocked": return "danger";
    case "rejected":
    case "expired":
    case "revoked":
      return "neutral";
  }
}

export function getSkillRequestNextAction(
  status: SkillGovernanceRequestStatus,
  requestType: SkillGovernanceRequestType,
): string {
  switch (status) {
    case "proposed":
    case "approval_required":
      return `Review and approve or reject this ${getSkillRequestTypeLabel(requestType).toLowerCase()} request. Approval does not install or run this skill.`;
    case "approved_waiting_install":
      return "Waiting for future secure install bridge.";
    case "approved_waiting_execution":
      return "Waiting for future secure execution bridge.";
    case "rejected":
      return "No action needed — request rejected.";
    case "blocked":
      return "No action available — blocked for safety.";
    case "expired":
      return "Create a new skill request if still needed.";
    case "revoked":
      return "No action needed — approval revoked.";
  }
}

export function getSkillRiskLabel(riskLevel: ApprovalRequestRiskLevel): string {
  switch (riskLevel) {
    case "low": return "Low risk";
    case "medium": return "Medium risk";
    case "high": return "High risk";
    case "critical": return "Critical risk";
  }
}

export function getSkillRiskTone(riskLevel: ApprovalRequestRiskLevel): SkillGovernanceTone {
  switch (riskLevel) {
    case "low": return "good";
    case "medium": return "warn";
    case "high":
    case "critical":
      return "danger";
  }
}

export function getSkillCapabilityLabel(capability: string): string {
  const normalized = capability
    .replace(/^risky_capability:/i, "")
    .replace(/[._:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Unknown capability";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getSkillRequestNoExecutionText(): string {
  return "State-only — no skill installed or run";
}

export function getSkillRequestTypeLabel(requestType: SkillGovernanceRequestType): string {
  switch (requestType) {
    case "install": return "Install skill";
    case "enable": return "Enable skill";
    case "run": return "Run skill";
    case "update": return "Update skill";
    case "remove": return "Remove skill";
  }
}

export function getSkillSummaryLine(counts: {
  registeredSkills: number;
  pendingRequests: number;
  approvedWaitingRequests: number;
  blockedRequests: number;
  rejectedRevokedRequests?: number;
}): string {
  const parts: string[] = [];
  if (counts.registeredSkills > 0) parts.push(`${counts.registeredSkills} registered skill${counts.registeredSkills === 1 ? "" : "s"}`);
  if (counts.pendingRequests > 0) parts.push(`${counts.pendingRequests} request${counts.pendingRequests === 1 ? "" : "s"} need review`);
  if (counts.approvedWaitingRequests > 0) parts.push(`${counts.approvedWaitingRequests} approved waiting secure bridge`);
  if (counts.blockedRequests > 0) parts.push(`${counts.blockedRequests} blocked for safety`);
  if ((counts.rejectedRevokedRequests ?? 0) > 0) parts.push(`${counts.rejectedRevokedRequests} rejected/revoked`);
  if (parts.length === 0) return "No skill requests need attention";
  return parts.join(" · ");
}
