import type { MemoryNode } from "../../types";
import type { MemoryItem, MemoryKind } from "../memory/memoryTypes";
import { validateRollbackPlan } from "../persistence/rollbackPlan";
import type { MemoryPersistenceProposal } from "../persistence/persistenceTypes";
import type {
  GovernedMemoryAdapterGateContext,
  GovernedMemoryAdapterGateResult,
  LegacyMemoryServicePayload,
  SanitizedMemoryContentResult,
} from "./governedMemoryAdapterTypes";

const CATEGORY_BY_KIND: Record<MemoryKind, MemoryNode["category"]> = {
  identity: "USER_STATE",
  preference: "USER_STATE",
  project: "SEMANTIC",
  decision: "FACT",
  learning: "AGENT_STATE",
  person: "FACT",
  company: "FACT",
  device: "AGENT_STATE",
  runtime_event: "AGENT_STATE",
};

const FORBIDDEN_CONTENT_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  blocker: string;
}> = [
  {
    pattern: /\bhidden\s+(?:system\s+)?prompts?\b/i,
    blocker: "Memory content must not contain hidden prompts.",
  },
  {
    pattern: /\bsystem\s+prompts?\b/i,
    blocker: "Memory content must not contain system prompts.",
  },
  {
    pattern: /\bprivate\s+reasoning\b/i,
    blocker: "Memory content must not contain private reasoning.",
  },
  {
    pattern: /\bchain[ -]of[ -]thought\b/i,
    blocker: "Memory content must not contain chain-of-thought.",
  },
  {
    pattern: /\braw\s+(?:file|attachment)(?:\s+contents?)?\b/i,
    blocker: "Memory content must not contain raw file or attachment contents.",
  },
  {
    pattern: /\battachment\s+contents?\b/i,
    blocker: "Memory content must not contain attachment contents.",
  },
  {
    pattern:
      /\b(?:password|passphrase|api[ _-]?key|access[ _-]?token|private[ _-]?key|seed[ _-]?phrase|credentials?)\b/i,
    blocker: "Memory content must not contain credentials or secrets.",
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    blocker: "Memory content must not contain private key material.",
  },
  {
    pattern: /\b(?:sk|pk)_[a-z0-9_-]{16,}\b/i,
    blocker: "Memory content contains credential-like material.",
  },
  {
    pattern: /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/,
    blocker: "Memory content contains token-like material.",
  },
];

const METADATA_FOOTER =
  /\n(?:---\s*)?(?:metadata|personal intelligence metadata)\s*(?::|---)[\s\S]*$/i;
const SENSITIVE_ZONES = [
  "credential",
  "financial",
  "health",
  "enterprise",
] as const;

export function sanitizeMemoryContentForLegacyMemoryService(
  memoryItem: MemoryItem,
  maxContentLength = 2000,
): SanitizedMemoryContentResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let content = memoryItem.content.replace(METADATA_FOOTER, "").trim();

  if (!content) {
    blockers.push("Memory content is empty after metadata sanitization.");
  }

  for (const forbidden of FORBIDDEN_CONTENT_PATTERNS) {
    if (forbidden.pattern.test(content)) blockers.push(forbidden.blocker);
  }

  if (!Number.isInteger(maxContentLength) || maxContentLength <= 0) {
    blockers.push(
      "The configured maximum content length must be a positive integer.",
    );
  }

  let truncated = false;
  if (blockers.length === 0 && content.length > maxContentLength) {
    const candidate = content.slice(0, maxContentLength + 1);
    const boundary = Math.max(
      candidate.lastIndexOf(". "),
      candidate.lastIndexOf("? "),
      candidate.lastIndexOf("! "),
      candidate.lastIndexOf("\n"),
    );
    if (boundary < Math.floor(maxContentLength * 0.6)) {
      blockers.push(
        "Memory content exceeds the configured maximum and has no safe semantic truncation boundary.",
      );
    } else {
      content = `${candidate.slice(0, boundary + 1).trim()}…`;
      truncated = true;
      warnings.push(
        `Memory content was safely truncated to fit the ${maxContentLength}-character adapter limit.`,
      );
    }
  }

  return {
    allowed: blockers.length === 0,
    content: blockers.length === 0 ? content : undefined,
    blockers: unique(blockers),
    warnings: unique(warnings),
    truncated,
  };
}

export function convertMemoryItemToLegacyMemoryServicePayload(
  memoryItem: MemoryItem,
  maxContentLength = 2000,
): {
  payload?: LegacyMemoryServicePayload;
  blockers: string[];
  warnings: string[];
} {
  const sanitized = sanitizeMemoryContentForLegacyMemoryService(
    memoryItem,
    maxContentLength,
  );
  if (!sanitized.allowed || sanitized.content === undefined) {
    return { blockers: sanitized.blockers, warnings: sanitized.warnings };
  }

  const category = CATEGORY_BY_KIND[memoryItem.kind];
  return {
    payload: {
      key: `PI:${memoryItem.kind}:${memoryItem.title.trim()}`,
      value: sanitized.content,
      category,
      autoConsolidate: false,
      importance: importanceFor(memoryItem.kind, category),
    },
    blockers: [],
    warnings: sanitized.warnings,
  };
}

export function canPersistPersonalIntelligenceProposal(
  proposal: MemoryPersistenceProposal,
  context: GovernedMemoryAdapterGateContext,
): GovernedMemoryAdapterGateResult {
  const { config, policy, auditRecords, rollbackPlans } = context;
  const blockers: string[] = [];
  const warnings = [...proposal.warnings, ...policy.warnings];

  if (proposal.kind !== "memory")
    blockers.push("Only memory proposals are supported.");
  if (proposal.status !== "approved_for_future_adapter") {
    blockers.push("Proposal must be approved_for_future_adapter.");
  }
  if (proposal.writePerformed !== false) {
    blockers.push(
      "Proposal writePerformed must be false before adapter execution.",
    );
  }
  if (!config.enabled) blockers.push("Governed memory adapter is disabled.");
  if (
    !config.allowedOperations.includes(
      proposal.requestedOperation as "create" | "update",
    )
  ) {
    blockers.push(
      `Operation ${proposal.requestedOperation} is not allowed by adapter configuration.`,
    );
  }
  if (config.blockedPrivacyZones.includes(proposal.privacyZone)) {
    blockers.push(
      `Privacy zone ${proposal.privacyZone} is blocked by adapter configuration.`,
    );
  }
  if (proposal.privacyZone === "private" && !config.allowPrivateWrites) {
    blockers.push(
      "Private memory writes are disabled by adapter configuration.",
    );
  }
  if (
    SENSITIVE_ZONES.includes(
      proposal.privacyZone as (typeof SENSITIVE_ZONES)[number],
    ) &&
    !config.allowSensitiveWrites
  ) {
    blockers.push(
      "Sensitive memory writes are disabled by adapter configuration.",
    );
  }
  if (config.requireExplicitApproval) {
    const approval = proposal.approvalMetadata;
    if (
      !approval ||
      approval.approvedBy !== "user" ||
      approval.explicitUserApproval !== true ||
      Number.isNaN(Date.parse(approval.approvedAt))
    ) {
      blockers.push("Valid explicit user approval metadata is required.");
    }
  }
  blockers.push(...policy.blockers);
  if (!policy.allowedForProposalReview) {
    blockers.push(
      "Persistence policy did not allow this proposal for governed review.",
    );
  }
  if (
    config.requireValidationAudit &&
    !auditRecords.some(
      (record) =>
        record.proposalId === proposal.proposalId &&
        record.eventType === "validated" &&
        record.sideEffectsPerformed === false,
    )
  ) {
    blockers.push("A validation audit record is required.");
  }
  if (
    config.requireRollbackPlan &&
    (proposal.requestedOperation === "create" ||
      proposal.requestedOperation === "update")
  ) {
    const rollbackPlan = rollbackPlans.find(
      (plan) =>
        plan.proposalId === proposal.proposalId &&
        plan.kind === "rollback" &&
        plan.status === "ready_for_future_adapter",
    );
    if (!rollbackPlan || !validateRollbackPlan(rollbackPlan).valid) {
      blockers.push(
        "A valid ready_for_future_adapter rollback plan is required.",
      );
    }
  }
  if (config.allowLucaLinkSync !== false) {
    blockers.push(
      "LucaLink synchronization must remain disabled for this adapter.",
    );
  }

  const converted = convertMemoryItemToLegacyMemoryServicePayload(
    proposal.memoryItem,
    config.maxContentLength,
  );
  blockers.push(...converted.blockers);
  warnings.push(...converted.warnings);

  return {
    allowed: unique(blockers).length === 0,
    blockers: unique(blockers),
    warnings: unique(warnings),
    convertedMemory: converted.payload,
  };
}

function importanceFor(
  kind: MemoryKind,
  category: MemoryNode["category"],
): number {
  if (category === "USER_STATE") return 10;
  if (category === "AGENT_STATE") return 8;
  if (kind === "decision" || kind === "learning") return 8;
  if (kind === "project" || category === "FACT") return 6;
  return 5;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}
