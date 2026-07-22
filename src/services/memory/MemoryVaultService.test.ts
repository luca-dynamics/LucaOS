import { describe, expect, it } from "vitest";
import type { MemoryNode } from "../../types";
import {
  MEMORY_VAULT_EXPORT_FORMAT,
  MemoryVaultService,
} from "./MemoryVaultService";
import type { LucaMemoryItem } from "./MemoryContracts";

function makeNode(
  partial: Partial<MemoryNode> & Pick<MemoryNode, "id" | "key" | "value">,
): MemoryNode {
  return {
    category: "SEMANTIC",
    timestamp: Date.now(),
    confidence: 0.9,
    ...partial,
  };
}

describe("MemoryVaultService", () => {
  it("lists and filters by text", async () => {
    let store: MemoryNode[] = [
      makeNode({ id: "1", key: "pref-color", value: "likes blue" }),
      makeNode({ id: "2", key: "pref-food", value: "likes pasta" }),
    ];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
    });

    const all = await vault.list();
    expect(all.total).toBe(2);

    const filtered = await vault.list({ text: "pasta" });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0].content).toContain("pasta");
  });

  it("updates content and deletes", async () => {
    let store: MemoryNode[] = [
      makeNode({ id: "a", key: "note", value: "old" }),
    ];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
    });

    const updated = await vault.update("a", { content: "new value" });
    expect(updated.ok).toBe(true);
    expect(store[0].value).toBe("new value");

    const deleted = await vault.delete("a");
    expect(deleted.ok).toBe(true);
    expect(store).toHaveLength(0);
  });

  it("exports and imports merge", async () => {
    let store: MemoryNode[] = [
      makeNode({ id: "keep", key: "keep", value: "local" }),
    ];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
    });

    const exported = await vault.exportVault();
    expect(exported.format).toBe(MEMORY_VAULT_EXPORT_FORMAT);
    expect(exported.itemCount).toBe(1);

    const importPayload = {
      format: MEMORY_VAULT_EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      itemCount: 1,
      items: [
        {
          id: "imported",
          tier: "profile",
          scope: { source: "test" },
          content: "from export",
          source: "test",
          createdAt: Date.now(),
        } satisfies LucaMemoryItem,
      ],
    };

    const result = await vault.importVault(importPayload, { mode: "merge" });
    expect(result.ok).toBe(true);
    expect(result.imported).toBe(1);
    expect(store.some((n) => n.id === "keep")).toBe(true);
    expect(store.some((n) => n.id === "imported")).toBe(true);
  });

  it("rejects bad import format", async () => {
    const vault = new MemoryVaultService({
      listNodes: () => [],
      persistNodes: () => undefined,
    });
    const result = await vault.importVault({ format: "nope", items: [] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Expected format/);
  });

  it("ingests device events and compresses duplicates", async () => {
    let store: MemoryNode[] = [];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
      saveMemory: async () => null,
    });

    const ingest = await vault.ingestEvents([
      {
        sourceKind: "device",
        sourceId: "watch",
        text: "User runs at 7am",
      },
      {
        sourceKind: "app",
        sourceId: "calendar",
        text: "User runs at 7am",
      },
    ]);
    expect(ingest.written).toBe(1);

    // Force a same-key style duplicate for compress
    store.push(
      makeNode({
        id: "dup",
        key: store[0].key,
        value: store[0].value,
        timestamp: Date.now() + 1,
      }),
    );
    const compressed = await vault.compress();
    expect(compressed.ok).toBe(true);
    expect(compressed.afterCount).toBeLessThan(compressed.beforeCount);
  });

  it("importLoose accepts plain array", async () => {
    let store: MemoryNode[] = [];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
    });
    const result = await vault.importLoose([
      { id: "x", content: "imported note" },
    ]);
    expect(result.ok).toBe(true);
    expect(result.detected).toBe("plain_array");
    expect(store.some((n) => n.value.includes("imported note"))).toBe(true);
  });
});
