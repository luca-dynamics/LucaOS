import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "./ProvenanceGateService";
import { ApprovalRequestCenterService } from "./ApprovalRequestCenterService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

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

});
