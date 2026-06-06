import type { PrivacyZone } from "../privacy/privacyZones";
import type {
  PersonalIntelligencePersistenceProposal,
  PersistenceProposalValidationResult,
} from "./persistenceTypes";

export const ALWAYS_EXPLICIT_APPROVAL_ZONES: readonly PrivacyZone[] = [
  "credential",
  "financial",
  "health",
  "enterprise",
];

export const SENSITIVE_PERSISTENCE_ZONES: readonly PrivacyZone[] = [
  "private",
  ...ALWAYS_EXPLICIT_APPROVAL_ZONES,
];

export interface PersonalIntelligencePersistencePolicy {
  policyId: string;
  allowPrivateProposalReviewWithoutExplicitApproval?: boolean;
  lowConfidenceThreshold?: number;
}

export interface PersistencePolicyEvaluation {
  allowedForProposalReview: boolean;
  approvalRequired: boolean;
  explicitUserApprovalRequired: boolean;
  reviewRequired: boolean;
  blockers: string[];
  warnings: string[];
}

const FORBIDDEN_SERIALIZED_PREVIEW_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  label: string;
}> = [
  { pattern: /hidden\s+(?:system\s+)?prompt/i, label: "hidden prompts" },
  {
    pattern: /private\s+(?:chain[ -]of[ -]thought|reasoning)/i,
    label: "private reasoning",
  },
  {
    pattern: /raw\s+(?:file|attachment|document)(?:\s+contents?)?/i,
    label: "raw files",
  },
  {
    pattern:
      /(?:password|passphrase|api[_ -]?key|access[_ -]?token|private[_ -]?key)\s*[:=]/i,
    label: "credentials",
  },
];

export function isSensitivePersistenceZone(zone: PrivacyZone): boolean {
  return SENSITIVE_PERSISTENCE_ZONES.includes(zone);
}

export function requiresExplicitPersistenceApproval(
  proposal: PersonalIntelligencePersistenceProposal,
  policy?: PersonalIntelligencePersistencePolicy,
): boolean {
  if (ALWAYS_EXPLICIT_APPROVAL_ZONES.includes(proposal.privacyZone))
    return true;
  if (proposal.privacyZone === "private") {
    return !policy?.allowPrivateProposalReviewWithoutExplicitApproval;
  }
  return false;
}

export function listPersistenceBlockers(
  proposal: PersonalIntelligencePersistenceProposal,
): string[] {
  const blockers = [...proposal.blockers];
  if (!proposal.source.trim()) blockers.push("A proposal source is required.");
  if (!proposal.proposalId.trim()) blockers.push("A proposal ID is required.");
  if (proposal.confidence < 0 || proposal.confidence > 1) {
    blockers.push("Confidence must be between 0 and 1.");
  }
  const previews = [proposal.serializedPreview];
  if (proposal.kind === "memory")
    previews.push(proposal.serializedContentPreview);
  for (const preview of previews) {
    if (!preview) continue;
    for (const forbidden of FORBIDDEN_SERIALIZED_PREVIEW_PATTERNS) {
      if (forbidden.pattern.test(preview)) {
        blockers.push(
          `Serialized previews must not include ${forbidden.label}.`,
        );
      }
    }
  }
  return unique(blockers);
}

export function listSensitivePersistenceWarnings(
  proposal: PersonalIntelligencePersistenceProposal,
): string[] {
  const warnings = [...proposal.warnings];
  if (isSensitivePersistenceZone(proposal.privacyZone)) {
    warnings.push(
      `${proposal.privacyZone} data requires governed review before any future adapter may act.`,
    );
  }
  if (proposal.confidence < 0.7) {
    warnings.push("Low-confidence proposals require review.");
  }
  warnings.push(
    "This proposal cannot write data; no storage adapter is connected.",
  );
  return unique(warnings);
}

export function evaluatePersistencePolicy(
  proposal: PersonalIntelligencePersistenceProposal,
  policy: PersonalIntelligencePersistencePolicy,
): PersistencePolicyEvaluation {
  const blockers = listPersistenceBlockers(proposal);
  const warnings = listSensitivePersistenceWarnings(proposal);
  const explicitUserApprovalRequired = requiresExplicitPersistenceApproval(
    proposal,
    policy,
  );
  const threshold = policy.lowConfidenceThreshold ?? 0.7;
  return {
    allowedForProposalReview: blockers.length === 0,
    approvalRequired: true,
    explicitUserApprovalRequired,
    reviewRequired:
      proposal.status === "review_required" ||
      proposal.confidence < threshold ||
      explicitUserApprovalRequired ||
      blockers.length > 0,
    blockers,
    warnings,
  };
}

export function validatePersistenceProposal(
  proposal: PersonalIntelligencePersistenceProposal,
): PersistenceProposalValidationResult {
  const errors: string[] = [];
  if (!proposal.title.trim()) errors.push("title is required");
  if (!proposal.summary.trim()) errors.push("summary is required");
  if (Number.isNaN(Date.parse(proposal.createdAt)))
    errors.push("createdAt must be an ISO date");
  if (Number.isNaN(Date.parse(proposal.updatedAt)))
    errors.push("updatedAt must be an ISO date");
  if (proposal.writePerformed !== false)
    errors.push("writePerformed must remain false");
  if (proposal.kind === "memory") {
    if (!proposal.proposedPath.trim()) errors.push("proposedPath is required");
    if (!proposal.serializedContentPreview.trim())
      errors.push("serializedContentPreview is required");
  }
  const blockers = listPersistenceBlockers(proposal);
  const warnings = listSensitivePersistenceWarnings(proposal);
  return {
    valid: errors.length === 0 && blockers.length === 0,
    errors,
    blockers,
    warnings,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
