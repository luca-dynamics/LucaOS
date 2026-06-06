import { describe, expect, it } from "vitest";
import { createMemoryItem, createMemoryStore, validateMemoryItem } from "./memoryStore";
import { deserializeMemoryJson, serializeMemoryItem } from "./memoryFilesystem";

const now = () => new Date("2026-06-06T12:00:00.000Z");

describe("memory foundation", () => {
  it("validates, stores, and serializes a memory item without filesystem I/O", () => {
    const item = createMemoryItem({ id: "decision-1", kind: "decision", title: "Runtime boundary",
      content: "Keep the foundation passive.", source: "user", confidence: 1, privacyZone: "project",
      tags: ["architecture"], relatedProjectId: "luca-os" }, now);
    expect(validateMemoryItem(item).valid).toBe(true);
    const store = createMemoryStore();
    store.put(item);
    expect(store.get(item.id)).toEqual(item);
    const file = serializeMemoryItem(item);
    expect(file.path).toBe("project/decision/decision-1.json");
    expect(deserializeMemoryJson(file.content)).toEqual(item);
  });

  it("rejects confidence outside the normalized range", () => {
    const invalid = createMemoryItem({ id: "item", kind: "learning", title: "Title", content: "Content",
      source: "test", confidence: 1, privacyZone: "private", tags: [] }, now);
    expect(validateMemoryItem({ ...invalid, confidence: 1.1 }).valid).toBe(false);
  });
});
