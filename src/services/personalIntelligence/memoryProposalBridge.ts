import {
  buildMemoryApprovalProposal,
  type MemoryApprovalProposalBundle,
} from "../../personal-intelligence/approval";
import type { MemoryItemInput } from "../../personal-intelligence/memory/memoryTypes";
import type {
  MemoryProposalKind,
  MemoryProposalRecord,
} from "../../types/memoryProposal";

/**
 * Bridge from the LIVE memory-proposal queue (MemoryProposalService, backed by
 * real chat/agent activity) into the Personal Intelligence governed-write
 * pilot. This is the "real pending-memory source" — it makes the pilot review
 * what Luca actually proposed to remember, not a sample.
 *
 * It lives at the services edge so the personal-intelligence subsystem stays
 * pure: PI never imports the live proposal types; this converter does the
 * mapping and then calls PI's own governed builder.
 */

// Reviewable in the governed pilot: still open for a first write, including
// proposals already approved elsewhere (chat strip / pending approvals) that
// are waiting for the actual memory write. Blocked / rejected / written /
// expired / revoked are never offered again.
const REVIEWABLE_STATUSES = new Set([
  "proposed",
  "approval_required",
  "approved_waiting_write",
]);

// Map the live proposal kind onto a Personal Intelligence memory kind. Anything
// unrecognized falls back to the general "learning" bucket.
const KIND_MAP: Record<MemoryProposalKind, MemoryItemInput["kind"]> = {
  user_fact: "learning",
  preference: "preference",
  project_context: "project",
  session_summary: "runtime_event",
  agent_state: "runtime_event",
  correction: "decision",
  reminder_context: "project",
  other: "learning",
};

/** Every reviewable proposal, most recent first. */
export function listReviewableMemoryProposalRecords(
  records: readonly MemoryProposalRecord[],
): MemoryProposalRecord[] {
  return records
    .filter((record) => REVIEWABLE_STATUSES.has(record.status))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** The most recent proposal the user could actually review, if any. */
export function selectReviewableMemoryProposal(
  records: readonly MemoryProposalRecord[],
): MemoryProposalRecord | undefined {
  return listReviewableMemoryProposalRecords(records)[0];
}

/** A light queue item for the pilot's selector (no governed bundle built yet). */
export interface MemoryApprovalQueueItem {
  proposalId: string;
  title: string;
  kind: MemoryProposalKind;
  updatedAt: string;
}

export function listReviewableMemoryProposals(
  records: readonly MemoryProposalRecord[],
): MemoryApprovalQueueItem[] {
  return listReviewableMemoryProposalRecords(records).map((record) => ({
    proposalId: record.proposalId,
    title: record.title,
    kind: record.kind,
    updatedAt: record.updatedAt,
  }));
}

/** Build the governed bundle for a specific reviewable proposal id, or null. */
export function buildBundleFromProposalId(
  records: readonly MemoryProposalRecord[],
  proposalId: string,
  now: () => Date = () => new Date(),
): MemoryApprovalProposalBundle | null {
  const record = listReviewableMemoryProposalRecords(records).find(
    (candidate) => candidate.proposalId === proposalId,
  );
  return record ? buildBundleFromMemoryProposal(record, now) : null;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/**
 * Convert one live proposal into a governed PI bundle. The content is carried
 * verbatim from the (already secret-sanitized) proposal; PI's own content
 * safety and privacy-zone gates run again inside the adapter. Sensitive zones
 * stay blocked — the bridge never claims a sensitive zone, so a genuinely
 * sensitive memory cannot be smuggled past the gate as "project".
 */
export function buildBundleFromMemoryProposal(
  record: MemoryProposalRecord,
  now: () => Date = () => new Date(),
): MemoryApprovalProposalBundle {
  const memory: MemoryItemInput = {
    id: `memory:${record.proposalId}`,
    kind: KIND_MAP[record.kind] ?? "learning",
    title: record.title,
    content: record.proposedMemory,
    source: record.source,
    confidence: clampConfidence(record.confidence),
    // The bridge only ever proposes a non-sensitive zone. Sensitive content is
    // caught by the adapter's content-safety gate, not silently persisted.
    privacyZone: "project",
    tags: [record.kind],
  };

  return buildMemoryApprovalProposal({
    proposalId: record.proposalId,
    memory,
    proposedPath: `memory/${KIND_MAP[record.kind] ?? "learning"}/${slug(record.proposalId)}.json`,
    approval: {
      approvedBy: "user",
      approvedAt: now().toISOString(),
      explicitUserApproval: true,
      approvalNote: "Selected for governed review from the live proposal queue.",
    },
    now,
  });
}

/**
 * Pick the best reviewable proposal from the live queue and build its bundle,
 * or null when there is nothing to review (the pilot then falls back to its
 * sample so the surface still explains itself).
 */
export function buildBundleFromPendingProposals(
  records: readonly MemoryProposalRecord[],
  now: () => Date = () => new Date(),
): MemoryApprovalProposalBundle | null {
  const record = selectReviewableMemoryProposal(records);
  return record ? buildBundleFromMemoryProposal(record, now) : null;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "proposal"
  );
}
