import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { GovernedActionRequestService } from "./GovernedActionRequestService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

describe("GovernedActionRequestService", () => {
  it("creates dry-run request records, links approval, and exposes no execute method", () => {
    const storage = new MemoryStorage();
    const provenance = new ProvenanceGateService(storage);
    const prov = provenance.createProvenanceRecord({ sourceType: "tool_action", sourceId: "tool" });
    const inbox = { ingestEvent: vi.fn() };
    const approvals = new ApprovalRequestCenterService({ storage, provenance, inbox });
    const service = new GovernedActionRequestService({ storage, provenance, approvals, inbox });
    const request = service.createRequest({ kind: "tool", title: "Run tool", description: "Future gated request", requestedCapability: "tool", target: "tool:x", provenanceIds: [prov.provenanceId] });
    expect(request.dryRunOnly).toBe(true);
    expect(request.approvalRequestId).toBeTruthy();
    expect(typeof (service as any).execute).toBe("undefined");
    expect(service.markRejected(request.requestId)?.status).toBe("rejected");
    expect(() => service.createRequest({ kind: "shell", title: "No provenance", description: "Blocked", requestedCapability: "shell", target: "sh", provenanceIds: [] })).toThrow(/provenance/i);
  });
});
