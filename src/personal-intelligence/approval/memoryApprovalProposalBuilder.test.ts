import { describe, expect, it } from "vitest";
import { buildMemoryApprovalProposal } from "./memoryApprovalProposalBuilder";
import { runGovernedMemoryApprovalDryRun } from "./memoryApprovalPilot";
import { createDryRunOnlyMemoryServiceDependency } from "./approvalFixtures";
import { validateRollbackPlan } from "../persistence";

const fixedNow = () => new Date("2026-07-04T12:00:00.000Z");

function buildRealBundle() {
  return buildMemoryApprovalProposal({
    proposalId: "proposal:prefers-dark-mode",
    memory: {
      id: "memory:prefers-dark-mode",
      kind: "preference",
      title: "Prefers dark mode",
      content: "The user prefers dark mode across their tools.",
      source: "chat",
      confidence: 0.9,
      privacyZone: "project",
      tags: ["preference", "ui"],
    },
    proposedPath: "memory/preferences/prefers-dark-mode.json",
    approval: {
      approvedBy: "user",
      approvedAt: "2026-07-04T12:00:00.000Z",
      explicitUserApproval: true,
      approvalNote: "Approved from chat.",
    },
    now: fixedNow,
  });
}

describe("buildMemoryApprovalProposal", () => {
  it("produces an approved proposal carrying the real content, not the fixture", () => {
    const { proposal } = buildRealBundle();
    expect(proposal.status).toBe("approved_for_future_adapter");
    expect(proposal.memoryItem.content).toContain("prefers dark mode");
    expect(proposal.memoryItem.content).not.toContain(
      "concise project updates",
    );
    expect(proposal.approvalMetadata?.explicitUserApproval).toBe(true);
    expect(proposal.approvalMetadata?.approvedBy).toBe("user");
  });

  it("links the validation audit to the proposal's auditRefs (gate requirement)", () => {
    const { proposal, auditRecords } = buildRealBundle();
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0].eventType).toBe("validated");
    expect(auditRecords[0].sideEffectsPerformed).toBe(false);
    expect(proposal.auditRefs).toContain(auditRecords[0].auditId);
  });

  it("produces a valid, write-ready rollback plan with no side effects", () => {
    const { rollbackPlans } = buildRealBundle();
    expect(rollbackPlans).toHaveLength(1);
    expect(rollbackPlans[0].status).toBe("ready_for_future_adapter");
    expect(rollbackPlans[0].sideEffectsPerformed).toBe(false);
    expect(validateRollbackPlan(rollbackPlans[0]).valid).toBe(true);
  });

  it("passes the governed adapter dry-run end-to-end with no write", async () => {
    const bundle = buildRealBundle();
    const result = await runGovernedMemoryApprovalDryRun({
      proposal: bundle.proposal,
      policy: bundle.policy,
      auditRecords: bundle.auditRecords,
      rollbackPlans: bundle.rollbackPlans,
      memoryService: createDryRunOnlyMemoryServiceDependency(),
      now: fixedNow,
    });

    expect(result.status).toBe("dry_run");
    expect(result.performed).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.blockers).toHaveLength(0);
  });
});
