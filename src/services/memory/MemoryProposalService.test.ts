import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { MemoryGovernanceService } from "./MemoryGovernanceService";
import { MemoryProposalService, type CreateMemoryProposalInput } from "./MemoryProposalService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createStack() {
  const storage = new MemoryStorage();
  const provenance = new ProvenanceGateService(storage);
  const inbox = { ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: `inbox:${Math.random()}`, ...(event as Record<string, unknown>) } as never)) };
  const approvals = new ApprovalRequestCenterService({ storage, provenance, inbox });
  const memoryGovernance = new MemoryGovernanceService(storage);
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const memoryWrites: string[] = [];
  const saveMemory = vi.fn(async (key: string) => { memoryWrites.push(key); return { id: `mem:${memoryWrites.length}` }; });
  const proposals = new MemoryProposalService({ storage, provenance, approvals, inbox, memoryGovernance, bus });
  return { storage, provenance, approvals, inbox, memoryGovernance, bus, proposals, saveMemory, memoryWrites };
}

function makeProvenance(stack: ReturnType<typeof createStack>) {
  return stack.provenance.createProvenanceRecord({ sourceType: "memory", sourceId: "chat", sourceTrustLevel: "local", createdBy: "luca" });
}

function baseInput(provenanceId: string, overrides: Partial<CreateMemoryProposalInput> = {}): CreateMemoryProposalInput {
  return {
    title: "User prefers dark mode",
    summary: "Remember that the user prefers a dark UI theme.",
    proposedMemory: "The user prefers dark mode in the UI.",
    kind: "preference",
    source: "chat",
    provenanceIds: [provenanceId],
    riskLevel: "low",
    confidence: 0.8,
    ...overrides,
  };
}

describe("MemoryProposalService", () => {
  it("requires provenance to create a proposal", () => {
    const stack = createStack();
    expect(() => stack.proposals.createProposal(baseInput("", { provenanceIds: [] }))).toThrow(/provenance/i);
  });

  it("creates an approval request and does not write memory on create", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId));
    expect(proposal.approvalRequestId).toBeTruthy();
    expect(proposal.status).toBe("approval_required");
    expect(stack.memoryWrites).toHaveLength(0);
    expect(stack.bus.emit).toHaveBeenCalledWith("memory_proposal_created", expect.objectContaining({ proposalId: proposal.proposalId }));
    expect(stack.memoryGovernance.listGovernanceSummaries().some((record) => record.memoryId === `proposal:${proposal.proposalId}`)).toBe(true);
  });

  it("approving does not write memory and marks approved_waiting_write", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId));
    const approved = stack.proposals.approveProposal(proposal.proposalId);
    expect(approved?.status).toBe("approved_waiting_write");
    expect(stack.memoryWrites).toHaveLength(0);
    expect(stack.approvals.hasApprovedOnce(proposal.approvalRequestId!)).toBe(true);
  });

  it("reject/revoke/block update state", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const a = stack.proposals.createProposal(baseInput(prov.provenanceId));
    const b = stack.proposals.createProposal(baseInput(prov.provenanceId, { title: "B" }));
    const c = stack.proposals.createProposal(baseInput(prov.provenanceId, { title: "C" }));
    expect(stack.proposals.rejectProposal(a.proposalId)?.status).toBe("rejected");
    expect(stack.proposals.revokeProposal(b.proposalId)?.status).toBe("revoked");
    expect(stack.proposals.blockProposal(c.proposalId, "manual")?.status).toBe("blocked");
  });

  it("blocks proposals that contain secret-like values", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId, {
      proposedMemory: "My OpenAI key is sk-abcdEFGH12345678ZZZ and you should keep it.",
    }));
    expect(proposal.status).toBe("blocked");
    expect(proposal.riskLevel).toBe("high");
    expect(proposal.proposedMemory).not.toContain("sk-abcdEFGH12345678ZZZ");
    expect(proposal.approvalRequestId).toBeUndefined();
  });

  it("trims storage to the bounded maximum", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    for (let index = 0; index < 510; index += 1) {
      stack.proposals.createProposal(baseInput(prov.provenanceId, { title: `proposal-${index}` }));
    }
    expect(stack.proposals.listProposals().length).toBeLessThanOrEqual(500);
  });

  it("generic approval (approveOnce + sync) moves the proposal to approved_waiting_write without writing memory", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId));
    // Simulate approving from the generic Pending approvals list.
    stack.approvals.approveOnce(proposal.approvalRequestId!);
    const approveOnceSpy = vi.spyOn(stack.approvals, "approveOnce");
    const synced = stack.proposals.syncApprovedFromApprovalRequest(proposal.proposalId);
    expect(synced?.status).toBe("approved_waiting_write");
    // sync must not re-approve (no double-approve / recursion).
    expect(approveOnceSpy).not.toHaveBeenCalled();
    // no memory was written during approval.
    expect(stack.memoryWrites).toHaveLength(0);
  });

  it("sync does not resurrect a rejected proposal", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId));
    stack.proposals.rejectProposal(proposal.proposalId);
    expect(stack.proposals.syncApprovedFromApprovalRequest(proposal.proposalId)?.status).toBe("rejected");
  });

  it("produces a diagnostics summary", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId));
    stack.proposals.approveProposal(proposal.proposalId);
    const summary = stack.proposals.getDiagnosticsSummary();
    expect(summary.totalProposals).toBe(1);
    expect(summary.approvedWaitingWriteProposals).toBe(1);
  });
});
