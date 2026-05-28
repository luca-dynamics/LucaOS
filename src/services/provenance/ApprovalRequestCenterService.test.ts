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
});
