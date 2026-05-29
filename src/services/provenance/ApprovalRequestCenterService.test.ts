import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "./ProvenanceGateService";
import { ApprovalRequestCenterService } from "./ApprovalRequestCenterService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createDeps() {
  const storage = new MemoryStorage();
  const provenance = new ProvenanceGateService(storage);
  const prov = provenance.createProvenanceRecord({ sourceType: "tool_action", sourceId: "tool" });
  const inbox = { ingestEvent: vi.fn() };
  return { storage, provenance, prov, inbox };
}

describe("ApprovalRequestCenterService", () => {
  it("creates approval requests, approves once, rejects, and never executes", () => {
    const storage = new MemoryStorage();
    const provenance = new ProvenanceGateService(storage);
    const prov = provenance.createProvenanceRecord({ sourceType: "tool_action", sourceId: "tool" });
    const inbox = { ingestEvent: vi.fn() };
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest({ actionInstanceId: "a", actionType: "shell", target: "terminal", parameters: { command: "echo no" }, provenanceChain: [prov.provenanceId] }, { title: "Shell request", description: "Needs approval", sourceType: "shell", sourceId: "shell:1" });
    expect(request.status).toBe("pending");
    expect(typeof (service as any).execute).toBe("undefined");
    expect(service.approveOnce(request.approvalRequestId)?.status).toBe("approved_once");
    const second = service.createApprovalRequest({ actionInstanceId: "b", actionType: "tool", target: "tool", parameters: {}, provenanceChain: [prov.provenanceId] }, { title: "Tool", description: "Needs approval", sourceType: "tool", sourceId: "tool:1" });
    expect(service.reject(second.approvalRequestId)?.status).toBe("rejected");
  });

  it("deduplicates pending approval requests and approval inbox events by action source digest", () => {
    const storage = new MemoryStorage();
    const provenance = new ProvenanceGateService(storage);
    const prov = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "job" });
    const inbox = { ingestEvent: vi.fn() };
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const identity = { actionInstanceId: "scheduler:job:2026-05-28T12:00:00.000Z", actionType: "scheduled_job", target: "job", parameters: { capability: "shell" }, provenanceChain: [prov.provenanceId], timestampBucket: "2026-05-28T12:00:00.000Z" };

    const first = service.createApprovalRequest(identity, { title: "Risky schedule", description: "Request only", sourceType: "scheduler", sourceId: "job" });
    const second = service.createApprovalRequest(identity, { title: "Risky schedule", description: "Request only", sourceType: "scheduler", sourceId: "job" });

    expect(second.approvalRequestId).toBe(first.approvalRequestId);
    expect(service.listRequests()).toHaveLength(1);
    expect(inbox.ingestEvent).toHaveBeenCalledTimes(1);
    expect(service.findPendingRequestByActionDigest(first.actionDigest, "scheduler", "job")?.approvalRequestId).toBe(first.approvalRequestId);
  });

  it("revoke transitions a pending request to revoked status", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest(
      { actionInstanceId: "c", actionType: "filesystem", target: "fs", parameters: { path: "/etc" }, provenanceChain: [prov.provenanceId] },
      { title: "FS access", description: "Revoke test", sourceType: "filesystem", sourceId: "fs:1" },
    );
    const revoked = service.revoke(request.approvalRequestId);
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.decidedAt).toBeDefined();
  });

  it("revoke returns undefined for nonexistent request ID", () => {
    const { storage, provenance, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    expect(service.revoke("nonexistent-id")).toBeUndefined();
  });

  it("expireOldRequests transitions pending requests past their expiresAt", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest(
      { actionInstanceId: "d", actionType: "network", target: "net", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Network req", description: "Will expire", sourceType: "network", sourceId: "net:1", expiresAt: "2020-01-01T00:00:00.000Z" },
    );
    const expired = service.expireOldRequests("2025-01-01T00:00:00.000Z");
    expect(expired).toHaveLength(1);
    expect(expired[0].status).toBe("expired");
    expect(expired[0].approvalRequestId).toBe(request.approvalRequestId);
  });

  it("expireOldRequests does not expire requests without expiresAt", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    service.createApprovalRequest(
      { actionInstanceId: "e", actionType: "shell", target: "t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "No expiry", description: "Should stay", sourceType: "shell", sourceId: "s:1" },
    );
    const expired = service.expireOldRequests("2099-01-01T00:00:00.000Z");
    expect(expired).toHaveLength(0);
  });

  it("expireOldRequests does not affect non-pending requests", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest(
      { actionInstanceId: "f", actionType: "tool", target: "t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Already approved", description: "Approve first", sourceType: "tool", sourceId: "t:1", expiresAt: "2020-01-01T00:00:00.000Z" },
    );
    service.approveOnce(request.approvalRequestId);
    const expired = service.expireOldRequests("2025-01-01T00:00:00.000Z");
    expect(expired).toHaveLength(0);
  });

  it("getDiagnosticsSummary returns correct counts for all statuses", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });

    const r1 = service.createApprovalRequest(
      { actionInstanceId: "g1", actionType: "shell", target: "t", parameters: { a: 1 }, provenanceChain: [prov.provenanceId] },
      { title: "Approve me", description: "d", sourceType: "shell", sourceId: "s:1" },
    );
    service.approveOnce(r1.approvalRequestId);

    const r2 = service.createApprovalRequest(
      { actionInstanceId: "g2", actionType: "shell", target: "t", parameters: { a: 2 }, provenanceChain: [prov.provenanceId] },
      { title: "Reject me", description: "d", sourceType: "shell", sourceId: "s:2" },
    );
    service.reject(r2.approvalRequestId);

    const r3 = service.createApprovalRequest(
      { actionInstanceId: "g3", actionType: "shell", target: "t", parameters: { a: 3 }, provenanceChain: [prov.provenanceId] },
      { title: "Revoke me", description: "d", sourceType: "shell", sourceId: "s:3" },
    );
    service.revoke(r3.approvalRequestId);

    service.createApprovalRequest(
      { actionInstanceId: "g4", actionType: "shell", target: "t", parameters: { a: 4 }, provenanceChain: [prov.provenanceId] },
      { title: "Pending", description: "d", sourceType: "shell", sourceId: "s:4", expiresAt: "2020-01-01T00:00:00.000Z" },
    );
    service.expireOldRequests("2025-01-01T00:00:00.000Z");

    service.createApprovalRequest(
      { actionInstanceId: "g5", actionType: "shell", target: "t", parameters: { a: 5 }, provenanceChain: [prov.provenanceId] },
      { title: "Still pending", description: "d", sourceType: "shell", sourceId: "s:5" },
    );

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalRequests).toBe(5);
    expect(summary.pendingRequests).toBe(1);
    expect(summary.approvedOnceRequests).toBe(1);
    expect(summary.rejectedRequests).toBe(1);
    expect(summary.revokedRequests).toBe(1);
    expect(summary.expiredRequests).toBe(1);
  });

  it("approveOnce returns undefined for nonexistent request ID", () => {
    const { storage, provenance, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    expect(service.approveOnce("nonexistent-id")).toBeUndefined();
  });

  it("reject returns undefined for nonexistent request ID", () => {
    const { storage, provenance, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    expect(service.reject("nonexistent-id")).toBeUndefined();
  });

  it("re-request after approval does not return stale approved record via dedup", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const identity = { actionInstanceId: "h", actionType: "shell", target: "t", parameters: { x: 1 }, provenanceChain: [prov.provenanceId] };
    const meta = { title: "Repeated", description: "d", sourceType: "shell" as const, sourceId: "s:1" };

    const first = service.createApprovalRequest(identity, meta);
    service.approveOnce(first.approvalRequestId);

    // After approval, findPendingRequestByActionDigest returns undefined
    expect(service.findPendingRequestByActionDigest(first.actionDigest, "shell", "s:1")).toBeUndefined();

    // Re-requesting creates a new pending entry (or overwrites if same-millisecond ID)
    const second = service.createApprovalRequest(identity, meta);
    expect(second.status).toBe("pending");
  });

  it("re-request after rejection does not return stale rejected record via dedup", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const identity = { actionInstanceId: "i", actionType: "tool", target: "t", parameters: {}, provenanceChain: [prov.provenanceId] };
    const meta = { title: "Re-request", description: "d", sourceType: "tool" as const, sourceId: "t:1" };

    const first = service.createApprovalRequest(identity, meta);
    service.reject(first.approvalRequestId);

    // After rejection, findPendingRequestByActionDigest returns undefined
    expect(service.findPendingRequestByActionDigest(first.actionDigest, "tool", "t:1")).toBeUndefined();

    // Re-requesting creates a new pending entry
    const second = service.createApprovalRequest(identity, meta);
    expect(second.status).toBe("pending");
  });

  it("inbox.ingestEvent is called with correct event shape", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest(
      { actionInstanceId: "j", actionType: "skill", target: "skill-target", parameters: { skill: "code" }, provenanceChain: [prov.provenanceId] },
      { title: "Skill approval", description: "Skill needs approval", sourceType: "skill", sourceId: "skill:1", riskLevel: "critical" },
    );

    expect(inbox.ingestEvent).toHaveBeenCalledTimes(1);
    const call = inbox.ingestEvent.mock.calls[0][0];
    expect(call.source).toBe("skill");
    expect(call.eventType).toBe("approval_request_created");
    expect(call.requiresApproval).toBe(true);
    expect(call.title).toBe("Skill approval");
    expect(call.provenance.approvalState).toBe("pending");
    expect(call.provenance.digest).toBe(request.actionDigest);
    expect(call.metadata.approvalRequestId).toBe(request.approvalRequestId);
    expect(call.metadata.riskLevel).toBe("critical");
  });

  it("ingestEvent source is tool_request for tool sourceType", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    service.createApprovalRequest(
      { actionInstanceId: "k", actionType: "tool", target: "tool-t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Tool", description: "d", sourceType: "tool", sourceId: "tool:1" },
    );
    expect(inbox.ingestEvent.mock.calls[0][0].source).toBe("tool_request");
  });

  it("ingestEvent source is system for non-skill non-tool sourceType", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    service.createApprovalRequest(
      { actionInstanceId: "l", actionType: "network", target: "net-t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Net", description: "d", sourceType: "network", sourceId: "net:1" },
    );
    expect(inbox.ingestEvent.mock.calls[0][0].source).toBe("system");
  });

  it("persists requests across service instances via shared storage", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service1 = new ApprovalRequestCenterService({ storage, provenance, inbox });
    service1.createApprovalRequest(
      { actionInstanceId: "m", actionType: "shell", target: "t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Persist", description: "d", sourceType: "shell", sourceId: "s:1" },
    );
    const service2 = new ApprovalRequestCenterService({ storage, provenance, inbox });
    expect(service2.listRequests()).toHaveLength(1);
    expect(service2.listRequests()[0].title).toBe("Persist");
  });

  it("findPendingRequestByActionDigest matches with only digest (no sourceType/sourceId filter)", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest(
      { actionInstanceId: "n", actionType: "shell", target: "t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Find me", description: "d", sourceType: "shell", sourceId: "s:1" },
    );
    const found = service.findPendingRequestByActionDigest(request.actionDigest);
    expect(found?.approvalRequestId).toBe(request.approvalRequestId);
  });

  it("findPendingRequestByActionDigest returns undefined when no pending match", () => {
    const { storage, provenance, prov, inbox } = createDeps();
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const request = service.createApprovalRequest(
      { actionInstanceId: "o", actionType: "shell", target: "t", parameters: {}, provenanceChain: [prov.provenanceId] },
      { title: "Approve first", description: "d", sourceType: "shell", sourceId: "s:1" },
    );
    service.approveOnce(request.approvalRequestId);
    expect(service.findPendingRequestByActionDigest(request.actionDigest)).toBeUndefined();
  });

  it("handles empty provenanceChain with missing fallback in inbox event", () => {
    const { storage, provenance, inbox } = createDeps();
    provenance.createProvenanceRecord({ sourceType: "runtime_snapshot", sourceId: "rt" });
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    service.createApprovalRequest(
      { actionInstanceId: "p", actionType: "memory_write", target: "mem", parameters: {}, provenanceChain: [] },
      { title: "Empty chain", description: "d", sourceType: "memory_write", sourceId: "m:1" },
    );
    const call = inbox.ingestEvent.mock.calls[0][0];
    expect(call.provenance.provenanceId).toBe("missing");
  });

  it("handles malformed JSON in storage gracefully", () => {
    const storage = new MemoryStorage();
    storage.setItem("LUCA_APPROVAL_CENTER_REQUESTS_V1", "broken json!!!");
    const provenance = new ProvenanceGateService(storage);
    const inbox = { ingestEvent: vi.fn() };
    const service = new ApprovalRequestCenterService({ storage, provenance, inbox });
    expect(service.listRequests()).toEqual([]);
  });
});
