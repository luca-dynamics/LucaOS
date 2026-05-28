import { describe, expect, it } from "vitest";
import { ProvenanceGateService } from "./ProvenanceGateService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function makeGate() { return new ProvenanceGateService(new MemoryStorage()); }

describe("ProvenanceGateService", () => {
  it("changes action digest when action params change", () => {
    const gate = makeGate();
    const provenance = gate.createProvenanceRecord({ sourceType: "external_input", sourceId: "message-1" });
    const base = { actionInstanceId: "one", actionType: "tool", target: "notify", provenanceChain: [provenance.provenanceId], timestampBucket: "2026-05-28T00" };
    expect(gate.computeActionDigest({ ...base, parameters: { text: "a" } })).not.toBe(gate.computeActionDigest({ ...base, parameters: { text: "b" } }));
  });

  it("consumes approval once and blocks reuse across different inputs", () => {
    const gate = makeGate();
    const provenance = gate.createProvenanceRecord({ sourceType: "tool_action", sourceId: "tool-1" });
    const action = { actionInstanceId: "one", actionType: "tool", target: "notify", parameters: { text: "a" }, provenanceChain: [provenance.provenanceId] };
    const approval = gate.requestApproval(action);
    gate.approveOnce(approval.actionDigest);
    expect(gate.checkWhetherActionCanRun(action).allowed).toBe(true);
    expect(gate.checkWhetherActionCanRun(action).allowed).toBe(false);
    expect(gate.checkWhetherActionCanRun({ ...action, actionInstanceId: "two", parameters: { text: "b" } }).allowed).toBe(false);
  });

  it("blocks revoked and quarantined provenance", () => {
    const revokedGate = makeGate();
    const revoked = revokedGate.createProvenanceRecord({ sourceType: "memory", sourceId: "m1" });
    const revokedAction = { actionInstanceId: "one", actionType: "memory", target: "write", parameters: {}, provenanceChain: [revoked.provenanceId] };
    revokedGate.approveOnce(revokedGate.requestApproval(revokedAction).actionDigest);
    revokedGate.revoke(revoked.provenanceId);
    expect(revokedGate.checkWhetherActionCanRun(revokedAction).blockedBy).toContain("revoked_provenance");

    const quarantinedGate = makeGate();
    const quarantined = quarantinedGate.createProvenanceRecord({ sourceType: "skill", sourceId: "s1" });
    const quarantinedAction = { actionInstanceId: "one", actionType: "skill", target: "invoke", parameters: {}, provenanceChain: [quarantined.provenanceId] };
    quarantinedGate.approveOnce(quarantinedGate.requestApproval(quarantinedAction).actionDigest);
    quarantinedGate.quarantine(quarantined.provenanceId);
    expect(quarantinedGate.checkWhetherActionCanRun(quarantinedAction).blockedBy).toContain("quarantined_provenance");
  });
});
