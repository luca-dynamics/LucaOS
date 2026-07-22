import { describe, expect, it, vi } from "vitest";
import type { MemoryNode } from "../../types";
import { MemoryVaultService } from "./MemoryVaultService";
import {
  ingestChatTurn,
  ingestLucaLinkMemoryPayload,
  installMemoryVaultProductBridge,
  mapChatTurnToIngest,
  mapLucaLinkIngestPayload,
  mapRemoteMemoryNodeToIngest,
  MEMORY_VAULT_INGEST_BUS_EVENT,
} from "./memoryVaultProductBridge";

describe("memoryVaultProductBridge mappers", () => {
  it("maps lucalink ingest payload", () => {
    const e = mapLucaLinkIngestPayload({
      data: { text: "Prefers dark mode", category: "PREFERENCE", deviceId: "phone" },
    });
    expect(e?.text).toContain("dark mode");
    expect(e?.sourceKind).toBe("lucalink");
    expect(e?.sourceId).toBe("phone");
  });

  it("maps remote memory node", () => {
    const e = mapRemoteMemoryNodeToIngest({
      id: "m1",
      key: "pref",
      value: "Likes tea",
      category: "FACT",
      timestamp: 1,
    });
    expect(e?.text).toBe("Likes tea");
    expect(e?.tags).toContain("sync");
  });

  it("maps chat turns and skips system/short", () => {
    expect(mapChatTurnToIngest({ text: "hi", role: "user" })).toBeNull();
    expect(
      mapChatTurnToIngest({ text: "system policy", role: "system" }),
    ).toBeNull();
    expect(
      mapChatTurnToIngest({
        text: "I prefer concise answers always",
        role: "user",
        conversationId: "c1",
      })?.sourceKind,
    ).toBe("chat");
  });
});

describe("memoryVaultProductBridge ingest", () => {
  it("ingests lucalink payload into vault", async () => {
    let store: MemoryNode[] = [];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
      saveMemory: async () => null,
    });

    const result = await ingestLucaLinkMemoryPayload(
      { data: { text: "Remote fact about dogs", deviceId: "d1" } },
      { vault },
    );
    expect(result.written).toBe(1);
    expect(store.some((n) => n.value.includes("dogs"))).toBe(true);
  });

  it("ingests chat turn", async () => {
    let store: MemoryNode[] = [];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
      saveMemory: async () => null,
    });
    const result = await ingestChatTurn(
      { text: "Remember my timezone is PST please", role: "user" },
      { vault },
    );
    expect(result.ok).toBe(true);
    expect(store.length).toBeGreaterThan(0);
  });

  it("installs hooks on link + bus", async () => {
    let store: MemoryNode[] = [];
    const vault = new MemoryVaultService({
      listNodes: () => store,
      persistNodes: (n) => {
        store = n;
      },
      saveMemory: async () => null,
    });

    const linkHandlers = new Map<string, Array<(e: unknown) => void>>();
    const link = {
      on: (event: string, fn: (e: unknown) => void) => {
        const list = linkHandlers.get(event) ?? [];
        list.push(fn);
        linkHandlers.set(event, list);
      },
      off: vi.fn(),
    };

    const busHandlers = new Map<string, Array<(...a: unknown[]) => void>>();
    const bus = {
      on: (event: string, fn: (...a: unknown[]) => void) => {
        const list = busHandlers.get(event) ?? [];
        list.push(fn);
        busHandlers.set(event, list);
      },
      off: vi.fn(),
      emit: vi.fn(),
    };

    const installed = installMemoryVaultProductBridge({
      lucaLink: link,
      bus,
      vault,
    });
    expect(installed.installed).toBe(true);

    // Simulate link event
    for (const fn of linkHandlers.get("event:memory:ingest") ?? []) {
      fn({ data: { text: "From link device hello world", deviceId: "x" } });
    }
    // allow async
    await new Promise((r) => setTimeout(r, 10));
    expect(store.some((n) => n.value.includes("link device"))).toBe(true);

    // Simulate bus event
    for (const fn of busHandlers.get(MEMORY_VAULT_INGEST_BUS_EVENT) ?? []) {
      fn({ text: "Bus manual ingest content here", sourceKind: "manual" });
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(store.some((n) => n.value.includes("Bus manual"))).toBe(true);

    installed.dispose?.();
  });
});
