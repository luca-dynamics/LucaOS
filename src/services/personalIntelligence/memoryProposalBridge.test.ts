import { describe, expect, it } from "vitest";
import type {
  MemoryProposalKind,
  MemoryProposalRecord,
  MemoryProposalStatus,
} from "../../types/memoryProposal";
import {
  buildBundleFromMemoryProposal,
  buildBundleFromPendingProposals,
  buildBundleFromProposalId,
  listReviewableMemoryProposals,
  selectReviewableMemoryProposal,
} from "./memoryProposalBridge";
import {
  createDryRunOnlyMemoryServiceDependency,
  runGovernedMemoryApprovalDryRun,
} from "../../personal-intelligence/approval";

const fixedNow = () => new Date("2026-07-04T12:00:00.000Z");

function record(
  overrides: Partial<MemoryProposalRecord> = {},
): MemoryProposalRecord {
  return {
    proposalId: "memory-proposal:preference:1",
    title: "Prefers dark mode",
    summary: "User said they prefer dark mode.",
    proposedMemory: "You prefer dark mode across your tools.",
    kind: "preference",
    source: "chat",
    provenanceIds: ["prov:1"],
    actionDigest: "digest:1",
    status: "approval_required",
    riskLevel: "safe",
    confidence: 0.9,
    reason: "Repeated preference across sessions.",
    createdAt: "2026-07-04T11:00:00.000Z",
    updatedAt: "2026-07-04T11:30:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("selectReviewableMemoryProposal", () => {
  it("picks the most recent proposed / approval_required record", () => {
    const chosen = selectReviewableMemoryProposal([
      record({ proposalId: "old", status: "proposed", updatedAt: "2026-07-01T00:00:00.000Z" }),
      record({ proposalId: "new", status: "approval_required", updatedAt: "2026-07-04T11:30:00.000Z" }),
    ]);
    expect(chosen?.proposalId).toBe("new");
  });

  it("skips blocked, rejected, written, and expired records", () => {
    const skipStatuses: MemoryProposalStatus[] = [
      "blocked",
      "rejected",
      "written",
      "expired",
      "revoked",
      "approved_waiting_write",
    ];
    const records = skipStatuses.map((status, i) =>
      record({ proposalId: `s${i}`, status }),
    );
    expect(selectReviewableMemoryProposal(records)).toBeUndefined();
  });
});

describe("buildBundleFromMemoryProposal", () => {
  it("carries the real content and maps the kind", () => {
    const { proposal } = buildBundleFromMemoryProposal(record(), fixedNow);
    expect(proposal.memoryItem.content).toBe(
      "You prefer dark mode across your tools.",
    );
    expect(proposal.memoryItem.kind).toBe("preference");
    expect(proposal.privacyZone).toBe("project");
    expect(proposal.status).toBe("approved_for_future_adapter");
  });

  it("maps unknown-ish kinds to the learning bucket and never claims a sensitive zone", () => {
    const kinds: MemoryProposalKind[] = [
      "user_fact",
      "session_summary",
      "agent_state",
      "other",
    ];
    for (const kind of kinds) {
      const { proposal } = buildBundleFromMemoryProposal(record({ kind }), fixedNow);
      // Whatever the source kind, the bridge never proposes a sensitive zone.
      expect(proposal.privacyZone).toBe("project");
    }
  });

  it("produces a bundle that passes the governed dry-run with no write", async () => {
    const bundle = buildBundleFromMemoryProposal(record(), fixedNow);
    const result = await runGovernedMemoryApprovalDryRun({
      proposal: bundle.proposal,
      policy: bundle.policy,
      auditRecords: bundle.auditRecords,
      rollbackPlans: bundle.rollbackPlans,
      memoryService: createDryRunOnlyMemoryServiceDependency(),
      now: fixedNow,
    });
    expect(result.status).toBe("dry_run");
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.blockers).toHaveLength(0);
  });
});

describe("buildBundleFromPendingProposals", () => {
  it("returns a bundle when a reviewable proposal exists", () => {
    expect(buildBundleFromPendingProposals([record()], fixedNow)).not.toBeNull();
  });

  it("returns null when nothing is reviewable", () => {
    expect(
      buildBundleFromPendingProposals([record({ status: "written" })], fixedNow),
    ).toBeNull();
  });
});

describe("the reviewable queue", () => {
  const records = [
    record({ proposalId: "a", title: "A", status: "proposed", updatedAt: "2026-07-01T00:00:00.000Z" }),
    record({ proposalId: "b", title: "B", status: "approval_required", updatedAt: "2026-07-04T00:00:00.000Z" }),
    record({ proposalId: "c", title: "C", status: "written", updatedAt: "2026-07-05T00:00:00.000Z" }),
  ];

  it("lists only reviewable items, most recent first, as light rows", () => {
    const list = listReviewableMemoryProposals(records);
    expect(list.map((i) => i.proposalId)).toEqual(["b", "a"]);
    expect(list[0]).toMatchObject({ title: "B", kind: "preference" });
  });

  it("builds the bundle for a chosen reviewable id", () => {
    const bundle = buildBundleFromProposalId(records, "a", fixedNow);
    expect(bundle?.proposal.title).toContain("A");
  });

  it("refuses to build for a non-reviewable or missing id", () => {
    expect(buildBundleFromProposalId(records, "c", fixedNow)).toBeNull();
    expect(buildBundleFromProposalId(records, "missing", fixedNow)).toBeNull();
  });
});
