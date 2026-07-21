import { describe, expect, it } from "vitest";
import type { MemoryProposalRecord } from "../../types/memoryProposal";
import type { PersonalIntelligenceMemoryApprovalAuditRecord } from "../../personal-intelligence/approval";
import {
  buildUnifiedMemoryWriteTimeline,
  mapWrittenProposalToUnifiedEvent,
  summarizeUnifiedMemoryWriteTimeline,
} from "./memoryWriteAuditBridge";

function proposal(
  overrides: Partial<MemoryProposalRecord> = {},
): MemoryProposalRecord {
  return {
    proposalId: "p1",
    title: "Prefers dark mode",
    summary: "User preference",
    proposedMemory: "You prefer dark mode.",
    kind: "preference",
    source: "chat",
    provenanceIds: ["prov:1"],
    actionDigest: "digest",
    status: "written",
    riskLevel: "safe",
    confidence: 0.9,
    reason: "ok",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    writtenAt: "2026-07-02T00:00:00.000Z",
    memoryId: "mem:1",
    metadata: {},
    ...overrides,
  };
}

function audit(
  overrides: Partial<PersonalIntelligenceMemoryApprovalAuditRecord> = {},
): PersonalIntelligenceMemoryApprovalAuditRecord {
  return {
    auditId: "a1",
    proposalId: "p1",
    timestamp: "2026-07-03T00:00:00.000Z",
    eventType: "live_write_completed",
    summary: "Persisted through pilot",
    sideEffectsPerformed: true,
    blockers: [],
    warnings: [],
    ...overrides,
  };
}

describe("memoryWriteAuditBridge", () => {
  it("maps written proposals only", () => {
    expect(mapWrittenProposalToUnifiedEvent(proposal())).toMatchObject({
      kind: "proposal_written",
      memoryId: "mem:1",
      sideEffectsPerformed: true,
    });
    expect(
      mapWrittenProposalToUnifiedEvent(
        proposal({ status: "approval_required" }),
      ),
    ).toBeNull();
  });

  it("merges pilot audit, proposals, and governed writes newest first", () => {
    const events = buildUnifiedMemoryWriteTimeline({
      proposals: [proposal()],
      pilotAuditRecords: [
        audit({
          auditId: "a-old",
          timestamp: "2026-07-01T12:00:00.000Z",
          eventType: "dry_run_completed",
          sideEffectsPerformed: false,
        }),
        audit({ auditId: "a-new", timestamp: "2026-07-04T00:00:00.000Z" }),
      ],
      governedWrites: [
        {
          writeId: "w1",
          proposalId: "p1",
          memoryId: "mem:2",
          actionDigest: "d",
          provenanceIds: ["prov:1"],
          riskLevel: "low",
          status: "succeeded",
          summary: "Saved once",
          consumedApproval: true,
          createdAt: "2026-07-05T00:00:00.000Z",
        },
      ],
    });
    expect(events[0].id).toContain("w1");
    const summary = summarizeUnifiedMemoryWriteTimeline(events);
    expect(summary.total).toBe(4);
    expect(summary.proposalWritten).toBe(1);
    expect(summary.pilotLiveWrites).toBe(1);
    expect(summary.governedSucceeded).toBe(1);
    expect(summary.sideEffectingWrites).toBe(3);
  });
});
