import { describe, expect, it, vi } from "vitest";

vi.mock("../memory/GovernedMemoryWriteService", () => ({
  governedMemoryWriteService: {
    canWriteProposal: vi.fn(() => ({
      allowed: false,
      reason: "Not approved",
      blockedBy: ["not_approved"],
    })),
    writeApprovedProposal: vi.fn(),
    listMemoryWrites: vi.fn(() => []),
  },
}));

vi.mock("../memory/MemoryProposalService", () => ({
  memoryProposalService: {
    listProposals: vi.fn(() => []),
  },
}));

vi.mock("../personalIntelligence/memoryApprovalAuditStore", () => ({
  readMemoryApprovalAuditRecords: vi.fn(() => []),
}));

import { getThinExecutionPilotStatus, runThinExecutionPilot } from "./thinExecutionPilot";
import { governedMemoryWriteService } from "../memory/GovernedMemoryWriteService";

describe("thinExecutionPilot", () => {
  it("reports memory-write-once scope and blocks broader actions", () => {
    const status = getThinExecutionPilotStatus();
    expect(status.kind).toBe("governed_memory_write_once");
    expect(status.executionScope).toBe("memory_write_once");
    expect(status.dryRunRequired).toBe(true);
    expect(status.blockedActions).toContain("skill execution");
    expect(status.sideEffectsPerformed).toBe(false);
  });

  it("refuses write when governed path blocks", async () => {
    const result = await runThinExecutionPilot(
      "governed_memory_write_once",
      "proposal:1",
    );
    expect(result.performed).toBe(false);
    expect(result.blockers).toContain("not_approved");
    expect(governedMemoryWriteService.writeApprovedProposal).not.toHaveBeenCalled();
  });
});
