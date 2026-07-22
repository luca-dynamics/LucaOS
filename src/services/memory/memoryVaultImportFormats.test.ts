import { describe, expect, it } from "vitest";
import { MEMORY_VAULT_EXPORT_FORMAT } from "./MemoryVaultService";
import { coerceToMemoryVaultExport } from "./memoryVaultImportFormats";

describe("coerceToMemoryVaultExport", () => {
  it("accepts native vault format", () => {
    const r = coerceToMemoryVaultExport({
      format: MEMORY_VAULT_EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      itemCount: 1,
      items: [
        {
          id: "1",
          tier: "session",
          scope: {},
          content: "hi",
          source: "t",
          createdAt: 1,
        },
      ],
    });
    expect("export" in r).toBe(true);
    if ("export" in r) {
      expect(r.detected).toBe(MEMORY_VAULT_EXPORT_FORMAT);
      expect(r.export.items).toHaveLength(1);
    }
  });

  it("accepts plain array of objects", () => {
    const r = coerceToMemoryVaultExport([
      { id: "a", content: "likes tea" },
      { key: "b", value: "likes coffee" },
    ]);
    expect("export" in r).toBe(true);
    if ("export" in r) {
      expect(r.detected).toBe("plain_array");
      expect(r.export.items).toHaveLength(2);
    }
  });

  it("accepts simplified chatgpt conversations", () => {
    const r = coerceToMemoryVaultExport({
      conversations: [
        {
          title: "Prefs",
          messages: [
            { role: "user", content: "I like dark mode" },
            { role: "assistant", content: "Noted." },
          ],
        },
      ],
    });
    expect("export" in r).toBe(true);
    if ("export" in r) {
      expect(r.detected).toBe("chatgpt_export");
      expect(r.export.items[0].content).toContain("dark mode");
    }
  });

  it("accepts simplified claude chats", () => {
    const r = coerceToMemoryVaultExport({
      chats: [
        {
          name: "Work",
          messages: [{ sender: "human", text: "Ship on Friday" }],
        },
      ],
    });
    expect("export" in r).toBe(true);
    if ("export" in r) {
      expect(r.detected).toBe("claude_export");
      expect(r.export.items[0].content).toContain("Friday");
    }
  });
});
