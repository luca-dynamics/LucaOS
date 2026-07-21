import { describe, expect, it, vi, beforeEach } from "vitest";

const markWritten = vi.fn();
const markProposalWritten = vi.fn();

vi.mock("../memory/MemoryProposalService", () => ({
  memoryProposalService: {
    markWritten: (...args: unknown[]) => markWritten(...args),
  },
}));

vi.mock("../memory/MemoryGovernanceService", () => ({
  memoryGovernanceService: {
    markProposalWritten: (...args: unknown[]) => markProposalWritten(...args),
  },
}));

import { closeMemoryProposalAfterPilotWrite } from "./memoryProposalWriteClose";

describe("closeMemoryProposalAfterPilotWrite", () => {
  beforeEach(() => {
    markWritten.mockReset();
    markProposalWritten.mockReset();
    markWritten.mockReturnValue({
      proposalId: "p1",
      status: "written",
      memoryId: "mem:1",
    });
  });

  it("marks governance then proposal written", () => {
    const result = closeMemoryProposalAfterPilotWrite("p1", "mem:1");
    expect(markProposalWritten).toHaveBeenCalledWith("p1", "mem:1");
    expect(markWritten).toHaveBeenCalledWith("p1", "mem:1");
    expect(result?.status).toBe("written");
  });

  it("still closes the proposal if governance throws", () => {
    markProposalWritten.mockImplementation(() => {
      throw new Error("governance unavailable");
    });
    const result = closeMemoryProposalAfterPilotWrite("p1", "mem:1");
    expect(markWritten).toHaveBeenCalledWith("p1", "mem:1");
    expect(result?.status).toBe("written");
  });

  it("returns undefined if markWritten throws", () => {
    markWritten.mockImplementation(() => {
      throw new Error("store unavailable");
    });
    expect(closeMemoryProposalAfterPilotWrite("p1", "mem:1")).toBeUndefined();
  });
});
