// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryVaultService } from "./MemoryVaultService";
import type { MemoryNode } from "../../types";

/**
 * Every other MemoryVaultService test injects listNodes/persistNodes, so the
 * default dependency path — the only one production uses — had no coverage.
 * That is exactly how a read path that always returned [] shipped green next to
 * a write path that still persisted, letting any vault write wipe the archive.
 *
 * These tests deliberately construct the service with NO injected deps.
 */

const ARCHIVE_KEY = "LUCA_LUCA_ARCHIVE_V1";

function seedArchive(nodes: Partial<MemoryNode>[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(nodes));
}

function readArchive(): MemoryNode[] {
  const raw = localStorage.getItem(ARCHIVE_KEY);
  return raw ? (JSON.parse(raw) as MemoryNode[]) : [];
}

function node(id: string, key: string, value: string): Partial<MemoryNode> {
  return {
    id,
    key,
    value,
    category: "SEMANTIC",
    timestamp: Date.now(),
  };
}

describe("MemoryVaultService default dependencies", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Keep the default write path off the network: memoryService mirrors saves
    // to Core, and a real timeout would make these slow and non-hermetic.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads back what the default persist path wrote", async () => {
    seedArchive([node("a", "colour", "blue"), node("b", "city", "Lisbon")]);
    const vault = new MemoryVaultService();

    const result = await vault.list();
    expect(result.items.length).toBe(2);
  });

  it("keeps existing memories when a note is added", async () => {
    seedArchive([node("a", "colour", "blue"), node("b", "city", "Lisbon")]);
    const vault = new MemoryVaultService();

    await vault.writeNote("pet", "a cat named Ada");

    const after = readArchive();
    // The regression: this used to persist [newNode] over the whole archive.
    expect(after.length).toBe(3);
    expect(after.map((n) => n.key)).toEqual(
      expect.arrayContaining(["colour", "city", "pet"]),
    );
  });

  it("does not wipe the archive when compressing", async () => {
    seedArchive([
      node("a", "colour", "blue"),
      node("b", "city", "Lisbon"),
      node("c", "pet", "a cat named Ada"),
    ]);
    const vault = new MemoryVaultService();

    await vault.compress();

    expect(readArchive().length).toBeGreaterThan(0);
  });

  it("merge import adds to the archive instead of replacing it", async () => {
    seedArchive([node("a", "colour", "blue")]);
    const vault = new MemoryVaultService();

    const exported = {
      format: "luca_memory_vault_v1" as const,
      exportedAt: new Date(0).toISOString(),
      itemCount: 1,
      items: [
        {
          id: "imported-1",
          content: "imported memory",
          tier: "semantic",
          source: "import",
          createdAt: new Date(0).toISOString(),
          scope: {},
        },
      ],
    };

    await vault.importVault(exported as never, { mode: "merge" });

    const after = readArchive();
    expect(after.length).toBeGreaterThan(1);
    expect(after.some((n) => n.key === "colour")).toBe(true);
  });

  it("rejects an import item missing scope instead of throwing", async () => {
    seedArchive([node("a", "colour", "blue")]);
    const vault = new MemoryVaultService();

    // A hand-written or third-party vault file need not carry scope.
    const exported = {
      format: "luca_memory_vault_v1" as const,
      exportedAt: new Date(0).toISOString(),
      itemCount: 1,
      items: [
        {
          id: "no-scope",
          content: "scopeless memory",
          tier: "semantic",
          source: "import",
          createdAt: new Date(0).toISOString(),
        },
      ],
    };

    const result = await vault.importVault(exported as never, {
      mode: "merge",
    });

    expect(result.ok).toBe(true);
    // The pre-existing archive must survive regardless.
    expect(readArchive().some((n) => n.key === "colour")).toBe(true);
  });

  it("survives a corrupt archive value without throwing", async () => {
    localStorage.setItem(ARCHIVE_KEY, '{"not":"an array"}');
    const vault = new MemoryVaultService();

    const result = await vault.list();
    expect(result.items).toEqual([]);
  });
});
