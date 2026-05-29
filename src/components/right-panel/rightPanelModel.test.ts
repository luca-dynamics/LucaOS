import { describe, expect, it } from "vitest";
import type { MemoryNode, ToolExecutionLog } from "../../types";
import {
  formatMemoryValue,
  friendlyRuntimeHeadline,
  hasRealGraphData,
  isRenderableMemory,
  normalizeRightPanelMode,
  RIGHT_PANEL_MODES,
  summarizeToolLog,
} from "./rightPanelModel";

function memory(partial: Partial<MemoryNode>): MemoryNode {
  return {
    id: partial.id ?? "memory-1",
    key: partial.key ?? "USER_FACT",
    value: partial.value ?? "remember user preference",
    category: partial.category ?? "FACT",
    timestamp: partial.timestamp ?? 1,
    confidence: partial.confidence ?? 0.9,
    metadata: partial.metadata,
  };
}

describe("right panel control plane model", () => {
  it("maps only CONTROL, ACTIVITY, MEMORY, and LOGS as top-level modes", () => {
    expect(RIGHT_PANEL_MODES).toEqual(["CONTROL", "ACTIVITY", "MEMORY", "LOGS"]);
    expect(RIGHT_PANEL_MODES).not.toContain("MANAGE");
    expect(RIGHT_PANEL_MODES).not.toContain("CLOUD");
    expect(normalizeRightPanelMode("CLOUD")).toBe("CONTROL");
  });

  it("keeps normal-friendly runtime copy", () => {
    expect(friendlyRuntimeHeadline({ pendingApprovals: 1, memoryReady: true })).toBe("1 approval needed");
    expect(friendlyRuntimeHeadline({ lifecycleState: "degraded", memoryReady: true })).toBe("Runtime degraded — review needed");
    expect(friendlyRuntimeHeadline({ pendingApprovals: 0, memoryReady: true })).toBe("Luca is ready · Memory ready");
  });

  it("filters system memories from the archive", () => {
    expect(isRenderableMemory(memory({ category: "SYSTEM" }))).toBe(false);
    expect(isRenderableMemory(memory({ key: "SYSTEM_INSTRUCTION_1" }))).toBe(false);
    expect(isRenderableMemory(memory({ value: "[SYSTEM INSTRUCTION] keep secret" }))).toBe(false);
    expect(isRenderableMemory(memory({ value: "safe user fact" }))).toBe(true);
  });

  it("detects explicit graph metadata without treating archive memories as graph data", () => {
    expect(hasRealGraphData([memory({ metadata: { source: "archive" } })])).toBe(false);
    expect(hasRealGraphData([memory({ metadata: { graphNodes: [] } as any })])).toBe(true);
  });

  it("formats structured and mixed text-plus-json memories", () => {
    expect(formatMemoryValue(JSON.stringify({ symbol: "ETH", action: "buy", confidence: 0.8 })).label).toBe("ETH");
    const mixed = formatMemoryValue('Trade note {"symbol":"SOL","side":"sell"}');
    expect(mixed).toMatchObject({ label: "Trade note", summary: "SOL · SELL", isStructured: true });
  });

  it("summarizes trace logs without fake data", () => {
    const log: ToolExecutionLog = { toolName: "TEST", args: {}, result: "x".repeat(200), timestamp: 1 };
    expect(summarizeToolLog(log).endsWith("…")).toBe(true);
  });
});
