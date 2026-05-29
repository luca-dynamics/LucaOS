import { describe, expect, it, vi } from "vitest";
import { AgentPlanningCheckpointService } from "./AgentPlanningCheckpointService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createStack() {
  const storage = new MemoryStorage();
  const inbox = { ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: `inbox:${Math.random()}`, ...(event as Record<string, unknown>) } as never)) };
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const service = new AgentPlanningCheckpointService({ storage, inbox, bus });
  return { storage, inbox, bus, service };
}

describe("AgentPlanningCheckpointService", () => {
  it("creates, lists, approves, rejects, blocks, and archives checkpoints", () => {
    const stack = createStack();
    const checkpoint = stack.service.createCheckpoint({ title: "Plan A", summary: "Plan the next governed requests", proposedNextSteps: ["Propose memory", "Ask for approval"] });
    expect(checkpoint.status).toBe("proposed");
    expect(stack.service.listCheckpoints()).toHaveLength(1);
    expect(stack.service.approveCheckpoint(checkpoint.checkpointId)?.status).toBe("approved");
    expect(stack.service.rejectCheckpoint(checkpoint.checkpointId)?.status).toBe("rejected");
    expect(stack.service.blockCheckpoint(checkpoint.checkpointId, "manual")?.status).toBe("blocked");
    expect(stack.service.archiveCheckpoint(checkpoint.checkpointId)?.status).toBe("archived");
  });

  it("approval never reports auto execution capability", () => {
    const stack = createStack();
    const checkpoint = stack.service.createCheckpoint({ title: "Plan B", summary: "Another plan" });
    stack.service.approveCheckpoint(checkpoint.checkpointId);
    expect(stack.service.getDiagnosticsSummary().canAutoExecute).toBe(false);
    expect((stack.service as unknown as Record<string, unknown>).executeCheckpoint).toBeUndefined();
    expect((stack.service as unknown as Record<string, unknown>).runPlan).toBeUndefined();
  });

  it("sanitizes metadata and limits list fields", () => {
    const stack = createStack();
    const checkpoint = stack.service.createCheckpoint({
      title: "Plan C",
      summary: "Sensitive plan",
      proposedNextSteps: Array.from({ length: 50 }, (_, index) => `step-${index}`),
      metadata: { apiKey: "sk-shouldberedacted12345", note: "ok" },
    });
    expect(checkpoint.proposedNextSteps.length).toBeLessThanOrEqual(20);
    expect(checkpoint.metadata.apiKey).toBe("[redacted]");
    expect(checkpoint.metadata.note).toBe("ok");
  });

  it("produces a diagnostics summary", () => {
    const stack = createStack();
    stack.service.createCheckpoint({ title: "Plan D", summary: "Plan D" });
    const summary = stack.service.getDiagnosticsSummary();
    expect(summary.totalCheckpoints).toBe(1);
    expect(summary.proposedCheckpoints).toBe(1);
  });
});
