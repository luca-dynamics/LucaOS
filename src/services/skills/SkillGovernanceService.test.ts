import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { SkillGovernanceService, flagRiskyCapabilities } from "./SkillGovernanceService";

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
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const service = new SkillGovernanceService({ storage, provenance, approvals, inbox, bus });
  return { storage, provenance, approvals, inbox, bus, service };
}

function makeProvenance(stack: ReturnType<typeof createStack>) {
  return stack.provenance.createProvenanceRecord({ sourceType: "skill", sourceId: "skill-source", sourceTrustLevel: "local", createdBy: "luca" });
}

describe("SkillGovernanceService", () => {
  it("requires provenance to create a skill request", () => {
    const stack = createStack();
    expect(() => stack.service.createSkillRequest({ skillId: "s1", skillName: "Notes", requestType: "enable", title: "Enable Notes", description: "Enable note taking", provenanceIds: [] })).toThrow(/provenance/i);
  });

  it("approval is state-only and never installs or runs a skill", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const request = stack.service.createSkillRequest({ skillId: "s1", skillName: "Notes", requestType: "enable", title: "Enable Notes", description: "Enable note taking", requestedCapabilities: ["read_notes"], provenanceIds: [prov.provenanceId] });
    const approved = stack.service.approveSkillRequest(request.skillRequestId);
    expect(approved?.status).toBe("approved_waiting_execution");
    expect(stack.service.getDiagnosticsSummary().canAutoExecute).toBe(false);
    // The service exposes no install/run/enable execution method.
    expect((stack.service as unknown as Record<string, unknown>).runSkill).toBeUndefined();
    expect((stack.service as unknown as Record<string, unknown>).installSkill).toBeUndefined();
    expect((stack.service as unknown as Record<string, unknown>).executeSkill).toBeUndefined();
  });

  it("flags and blocks risky capabilities", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const request = stack.service.createSkillRequest({ skillId: "s2", skillName: "ShellRunner", requestType: "run", title: "Run shell", description: "Wants shell access", requestedCapabilities: ["shell.exec"], provenanceIds: [prov.provenanceId] });
    expect(request.blockedBy && request.blockedBy.length).toBeGreaterThan(0);
    const approved = stack.service.approveSkillRequest(request.skillRequestId);
    expect(approved?.status).toBe("blocked");
  });

  it("flagRiskyCapabilities detects sensitive capability names", () => {
    expect(flagRiskyCapabilities(["read_notes", "network.fetch", "wallet.sign"]).sort()).toEqual(["network.fetch", "wallet.sign"]);
  });

  it("rejects and revokes requests", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    const r1 = stack.service.createSkillRequest({ skillId: "s3", skillName: "A", requestType: "enable", title: "A", description: "A", provenanceIds: [prov.provenanceId] });
    const r2 = stack.service.createSkillRequest({ skillId: "s4", skillName: "B", requestType: "enable", title: "B", description: "B", provenanceIds: [prov.provenanceId] });
    expect(stack.service.rejectSkillRequest(r1.skillRequestId)?.status).toBe("rejected");
    expect(stack.service.revokeSkillRequest(r2.skillRequestId)?.status).toBe("revoked");
  });

  it("produces a diagnostics summary", () => {
    const stack = createStack();
    const prov = makeProvenance(stack);
    stack.service.createSkillRequest({ skillId: "s5", skillName: "C", requestType: "enable", title: "C", description: "C", provenanceIds: [prov.provenanceId] });
    const summary = stack.service.getDiagnosticsSummary();
    expect(summary.totalRequests).toBe(1);
    expect(summary.approvalRequiredRequests).toBe(1);
    expect(summary.canAutoExecute).toBe(false);
  });
});
