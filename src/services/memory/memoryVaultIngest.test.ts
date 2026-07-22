import { describe, expect, it } from "vitest";
import {
  normalizeMemoryIngestBatch,
  normalizeMemoryIngestEvent,
} from "./memoryVaultIngest";

describe("memoryVaultIngest", () => {
  it("normalizes device event into vault key/content", () => {
    const n = normalizeMemoryIngestEvent({
      sourceKind: "device",
      sourceId: "phone-1",
      title: "Battery note",
      text: "User prefers low power mode overnight",
      tags: ["power"],
    });
    expect(n).toBeTruthy();
    expect(n!.key).toMatch(/^ingest:device:/);
    expect(n!.content).toContain("low power mode");
    expect(n!.tags).toContain("device");
    expect(n!.tags).toContain("power");
  });

  it("skips empty text", () => {
    expect(normalizeMemoryIngestEvent({ text: "  " })).toBeNull();
  });

  it("dedupes batch by content fingerprint", () => {
    const batch = normalizeMemoryIngestBatch([
      { text: "Same fact", sourceKind: "app" },
      { text: "Same fact", sourceKind: "device" },
      { text: "Other fact", sourceKind: "chat" },
    ]);
    expect(batch).toHaveLength(2);
  });
});
