import { describe, expect, it } from "vitest";
import { MemoryGovernanceService } from "./MemoryGovernanceService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

describe("MemoryGovernanceService", () => {
  it("classifies low-risk and approval-required memory writes", () => {
    const service = new MemoryGovernanceService(new MemoryStorage());
    expect(service.classifyMemoryWriteRisk({ source: "local", confidence: 0.9, memoryType: "preference" })).toBe("auto_allowed_low_risk");
    expect(service.classifyMemoryWriteRisk({ source: "external", writesOperationalInstruction: true })).toBe("approval_required");
  });

  it("quarantines memory governance records", () => {
    const service = new MemoryGovernanceService(new MemoryStorage());
    service.attachGovernanceRecord({ memoryId: "m1", source: "local", confidence: 0.9 });
    expect(service.markQuarantined("m1")?.quarantined).toBe(true);
  });

  it("summarizes existing memory records without destructive migration", () => {
    const service = new MemoryGovernanceService(new MemoryStorage());
    const summaries = service.listGovernanceSummaries([{ id: "legacy-1", category: "chat" }]);
    expect(summaries[0].memoryId).toBe("legacy-1");
    expect(service.listGovernanceSummaries()).toHaveLength(0);
  });
});
