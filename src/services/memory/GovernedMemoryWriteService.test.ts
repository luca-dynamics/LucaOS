import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { MemoryGovernanceService } from "./MemoryGovernanceService";
import { MemoryProposalService, type CreateMemoryProposalInput } from "./MemoryProposalService";
import { GovernedMemoryWriteService, type SafeMemoryWriter } from "./GovernedMemoryWriteService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createStack(writer?: SafeMemoryWriter) {
  const storage = new MemoryStorage();
  const provenance = new ProvenanceGateService(storage);
  const inbox = { ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: `inbox:${Math.random()}`, ...(event as Record<string, unknown>) } as never)) };
  const approvals = new ApprovalRequestCenterService({ storage, provenance, inbox });
  const memoryGovernance = new MemoryGovernanceService(storage);
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const savedKeys: Array<{ key: string; value: string }> = [];
  const memory: SafeMemoryWriter = writer ?? {
    saveMemory: vi.fn(async (key: string, value: string) => { savedKeys.push({ key, value }); return { id: `mem:${savedKeys.length}` }; }),
  };
  const proposals = new MemoryProposalService({ storage, provenance, approvals, inbox, memoryGovernance, bus });
  const writeService = new GovernedMemoryWriteService({ storage, proposals, approvals, provenance, memoryGovernance, inbox, bus, memory });
  return { storage, provenance, approvals, inbox, memoryGovernance, bus, proposals, writeService, savedKeys, memory };
}

function makeProvenance(stack: ReturnType<typeof createStack>) {
  return stack.provenance.createProvenanceRecord({ sourceType: "memory", sourceId: "chat", sourceTrustLevel: "local", createdBy: "luca" });
}

function baseInput(provenanceId: string, overrides: Partial<CreateMemoryProposalInput> = {}): CreateMemoryProposalInput {
  return {
    title: "User prefers dark mode",
    summary: "Remember the user prefers dark UI.",
    proposedMemory: "The user prefers dark mode in the UI.",
    kind: "preference",
    source: "chat",
    provenanceIds: [provenanceId],
    riskLevel: "low",
    confidence: 0.8,
    ...overrides,
  };
}

function approvedProposal(stack: ReturnType<typeof createStack>, overrides: Partial<CreateMemoryProposalInput> = {}) {
  const prov = makeProvenance(stack);
  const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId, overrides));
  stack.proposals.approveProposal(proposal.proposalId);
  return { proposal, prov };
}

describe("GovernedMemoryWriteService", () => {
  it("cannot write without approval", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId));
    const check = stack.writeService.canWriteProposal(proposal.proposalId);
    expect(check.allowed).toBe(false);
    expect(check.blockedBy).toContain("not_approved");
  });

  it("cannot write a high-risk proposal", async () => {
    const stack = createStack();
    const { proposal } = approvedProposal(stack, { riskLevel: "elevated" });
    const check = stack.writeService.canWriteProposal(proposal.proposalId);
    expect(check.allowed).toBe(false);
    expect(check.blockedBy).toContain("risk_too_high");
    const result = await stack.writeService.writeApprovedProposal(proposal.proposalId);
    expect(result.status).toBe("blocked");
    expect(stack.savedKeys).toHaveLength(0);
  });

  it("cannot write if provenance is revoked", () => {
    const stack = createStack();
    const { proposal, prov } = approvedProposal(stack);
    stack.provenance.revoke(prov.provenanceId);
    const check = stack.writeService.canWriteProposal(proposal.proposalId);
    expect(check.allowed).toBe(false);
    expect(check.blockedBy.some((reason) => reason.includes("revoked"))).toBe(true);
  });

  it("cannot write if provenance is quarantined", () => {
    const stack = createStack();
    const { proposal, prov } = approvedProposal(stack);
    stack.provenance.quarantine(prov.provenanceId);
    const check = stack.writeService.canWriteProposal(proposal.proposalId);
    expect(check.allowed).toBe(false);
    expect(check.blockedBy.some((reason) => reason.includes("quarantined"))).toBe(true);
  });

  it("writes once, consumes the one-shot approval, and blocks the second attempt", async () => {
    const stack = createStack();
    const { proposal } = approvedProposal(stack);

    const first = await stack.writeService.writeApprovedProposal(proposal.proposalId);
    expect(first.status).toBe("succeeded");
    expect(first.consumedApproval).toBe(true);
    expect(stack.savedKeys).toHaveLength(1);
    expect(stack.proposals.getProposal(proposal.proposalId)?.status).toBe("written");

    const second = await stack.writeService.writeApprovedProposal(proposal.proposalId);
    expect(second.status).toBe("blocked");
    expect(stack.savedKeys).toHaveLength(1);
  });

  it("emits an inbox event and trace record on successful write", async () => {
    const stack = createStack();
    const { proposal } = approvedProposal(stack);
    await stack.writeService.writeApprovedProposal(proposal.proposalId);
    expect(stack.inbox.ingestEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "memory_write_succeeded" }));
    expect(stack.bus.emit).toHaveBeenCalledWith("memory_write_succeeded", expect.objectContaining({ proposalId: proposal.proposalId }));
    expect(stack.writeService.listMemoryWrites().some((write) => write.status === "succeeded")).toBe(true);
  });

  it("writes sanitized memory content", async () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const proposal = stack.proposals.createProposal(baseInput(prov.provenanceId, {
      proposedMemory: "Use token=plaintextsecretvalue when calling the API.",
      riskLevel: "low",
    }));
    // not blocked at create (no high-signal secret), but redacted before write
    stack.proposals.approveProposal(proposal.proposalId);
    await stack.writeService.writeApprovedProposal(proposal.proposalId);
    expect(stack.savedKeys[0]?.value).not.toContain("plaintextsecretvalue");
  });

  it("produces a diagnostics summary", async () => {
    const stack = createStack();
    const { proposal } = approvedProposal(stack);
    await stack.writeService.writeApprovedProposal(proposal.proposalId);
    const summary = stack.writeService.getDiagnosticsSummary();
    expect(summary.totalWrites).toBeGreaterThanOrEqual(1);
    expect(summary.succeededWrites).toBeGreaterThanOrEqual(1);
  });
});
