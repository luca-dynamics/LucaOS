import { describe, expect, it, vi } from "vitest";
import { MemoryNode } from "../../types";
import {
  type AgentMemoryWriteGateDependencies,
  proposalKindForCategory,
  requestAgentMemoryWrite,
} from "./agentMemoryWriteGate";

function makeMemory(overrides: Partial<MemoryNode> = {}): MemoryNode {
  return {
    id: "mem-1",
    key: "deploy-region",
    value: "frankfurt",
    category: "FACT",
    timestamp: 1_000,
    confidence: 0.99,
    ...overrides,
  } as MemoryNode;
}

function makeDeps(
  overrides: Partial<AgentMemoryWriteGateDependencies> = {},
): AgentMemoryWriteGateDependencies {
  return {
    isApprovalRequired: () => false,
    saveMemory: vi.fn(async () => ({ memory: makeMemory(), rejection: null })),
    createProvenanceRecord: vi.fn(() => ({ provenanceId: "prov:test" })),
    createProposal: vi.fn(() => ({ proposalId: "proposal-1" })),
    ...overrides,
  };
}

const request = {
  key: "deploy-region",
  value: "frankfurt",
  category: "FACT" as const,
};

describe("proposalKindForCategory", () => {
  it("round-trips the categories that have a dedicated proposal kind", () => {
    // These must survive category -> kind -> category through
    // GovernedMemoryWriteService, or an approved memory lands in the wrong bucket.
    expect(proposalKindForCategory("FACT")).toBe("user_fact");
    expect(proposalKindForCategory("USER_STATE")).toBe("preference");
    expect(proposalKindForCategory("SEMANTIC")).toBe("project_context");
    expect(proposalKindForCategory("SESSION_STATE")).toBe("session_summary");
    expect(proposalKindForCategory("AGENT_STATE")).toBe("agent_state");
  });

  it("maps the two categories with no dedicated kind onto other", () => {
    expect(proposalKindForCategory("SYSTEM")).toBe("other");
    expect(proposalKindForCategory("PROTOCOL")).toBe("other");
  });
});

describe("requestAgentMemoryWrite with approval off", () => {
  it("writes straight through and reports the stored id", async () => {
    const deps = makeDeps();

    const outcome = await requestAgentMemoryWrite(request, deps);

    expect(outcome.status).toBe("written");
    expect(outcome.memoryId).toBe("mem-1");
    expect(deps.createProposal).not.toHaveBeenCalled();
  });

  it("surfaces the archive's own refusal reason", async () => {
    const deps = makeDeps({
      saveMemory: vi.fn(async () => ({
        memory: null,
        rejection: 'Memory tier "durable" is full.',
      })),
    });

    const outcome = await requestAgentMemoryWrite(request, deps);

    expect(outcome.status).toBe("refused");
    expect(outcome.message).toContain("durable");
  });
});

describe("requestAgentMemoryWrite with approval on", () => {
  const approvalOn = { isApprovalRequired: () => true };

  it("stages a proposal instead of writing", async () => {
    const deps = makeDeps(approvalOn);

    const outcome = await requestAgentMemoryWrite(request, deps);

    expect(outcome.status).toBe("pending_approval");
    expect(outcome.proposalId).toBe("proposal-1");
    // The whole point: nothing reaches the archive.
    expect(deps.saveMemory).not.toHaveBeenCalled();
  });

  it("tells the model not to retry and to treat the fact as unconfirmed", async () => {
    const deps = makeDeps(approvalOn);

    const { message } = await requestAgentMemoryWrite(request, deps);

    expect(message).toMatch(/not saved yet/i);
    expect(message).toMatch(/do not retry/i);
    expect(message).toMatch(/unconfirmed/i);
  });

  it("attaches provenance, which the proposal service requires", async () => {
    const deps = makeDeps(approvalOn);

    await requestAgentMemoryWrite(request, deps);

    expect(deps.createProposal).toHaveBeenCalledWith(
      expect.objectContaining({ provenanceIds: ["prov:test"] }),
    );
  });

  it("refuses rather than falling back to a direct write when staging fails", async () => {
    const deps = makeDeps({
      ...approvalOn,
      createProposal: vi.fn(() => {
        throw new Error("proposal store unavailable");
      }),
    });

    const outcome = await requestAgentMemoryWrite(request, deps);

    // Falling back to writing would silently defeat the consent gate.
    expect(outcome.status).toBe("refused");
    expect(deps.saveMemory).not.toHaveBeenCalled();
    expect(outcome.message).toContain("Nothing was written");
  });
});
