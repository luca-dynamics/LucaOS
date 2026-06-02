import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  lucaLinkArchitectureAuditNote,
  lucaLinkCurrentEventMap,
  lucaLinkHostRoles,
  lucaLinkImplementationRoadmap,
  lucaLinkPermissionCategories,
  lucaLinkSyncLanes,
  lucaLinkTargetComponents,
  lucaLinkTrustLevels,
} from "./lucaLinkArchitectureMap";

type StorageSpy = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "clear" | "key"
> & {
  readonly length: number;
};

function makeStorageSpy(): StorageSpy {
  return {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };
}

function restoreGlobalProperty(
  name: "fetch" | "localStorage" | "sessionStorage",
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }

  delete (globalThis as Record<string, unknown>)[name];
}

describe("lucaLinkArchitectureMap", () => {
  it("defines all target host roles", () => {
    const ids = lucaLinkHostRoles.map((r) => r.id);
    expect(ids).toEqual([
      "primary",
      "companion",
      "execution",
      "sensor",
      "display",
      "guest",
      "embodied",
    ]);
    expect(ids).toContain("primary");
    expect(ids).not.toContain("origin");

    // Only the Primary Host owns memory authority by default.
    expect(lucaLinkHostRoles.filter((r) => r.ownsMemoryAuthority)).toHaveLength(
      1,
    );
    expect(lucaLinkHostRoles.find((r) => r.ownsMemoryAuthority)?.id).toBe(
      "primary",
    );
  });

  it("defines all trust levels in ascending rank order", () => {
    const ids = lucaLinkTrustLevels.map((t) => t.id);
    expect(ids).toEqual(["guest", "paired", "trusted", "admin", "owner"]);
    expect(ids).toContain("owner");
    expect(ids).not.toContain("origin");

    const ranks = lucaLinkTrustLevels.map((t) => t.rank);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  it("defines all sync lanes", () => {
    const ids = lucaLinkSyncLanes.map((l) => l.id);
    expect(ids).toEqual([
      "identity",
      "presence",
      "conversation",
      "memory",
      "settings",
      "mission",
      "sensor",
      "tool",
      "artifact",
      "notification",
      "model",
      "safety",
    ]);
  });

  it("includes the high-risk permission categories", () => {
    const ids = lucaLinkPermissionCategories.map((p) => p.id);
    for (const required of [
      "shell.execute",
      "files.write",
      "git.create_pr",
      "memory.write",
      "robotics.motion",
    ] as const) {
      expect(ids).toContain(required);
    }

    // Each of these must be classified high or critical risk.
    for (const id of [
      "shell.execute",
      "git.create_pr",
      "robotics.motion",
      "payment.spend",
    ] as const) {
      const descriptor = lucaLinkPermissionCategories.find((p) => p.id === id);
      expect(
        descriptor?.risk === "high" || descriptor?.risk === "critical",
      ).toBe(true);
    }
  });

  it("snapshots the known existing runtime events", () => {
    const names = lucaLinkCurrentEventMap.map((e) => e.name);
    for (const known of [
      "register",
      "registered",
      "message",
      "sync",
      "registry",
      "mission",
      "SENSOR_PULSE",
      "guest-connected",
      "guest-message",
      "desktop-to-guest",
      "guest-disconnected",
      "webrtc-offer",
      "webrtc-answer",
      "webrtc-ice-candidate",
    ]) {
      expect(names).toContain(known);
    }
  });

  it("enumerates the target architecture components", () => {
    const ids = lucaLinkTargetComponents.map((c) => c.id);
    expect(ids).toContain("transport");
    expect(ids).toContain("identity");
    expect(ids).toContain("host-router");
    expect(ids).toContain("guest-gateway");
    expect(ids).toContain("embodied-host-adapter");
    expect(ids).toContain("audit-log");
  });

  it("covers PR #183 through PR #190 in the roadmap", () => {
    const prNumbers = lucaLinkImplementationRoadmap.map((entry) => entry.pr);
    for (let pr = 183; pr <= 190; pr++) {
      expect(prNumbers).toContain(pr);
    }
    expect(lucaLinkArchitectureAuditNote.pr).toBe(182);
  });

  it("documents the Origin vs Primary Host boundary", () => {
    for (const path of [
      "docs/lucalink-host-mesh-architecture.md",
      "docs/lucalink-device-manifest.md",
      "docs/lucalink-trust-permission-policy.md",
      "docs/lucalink-sync-lane-protocol.md",
    ]) {
      const doc = readFileSync(path, "utf8");
      expect(doc).toContain("## Origin vs Primary Host");
      expect(doc).toContain(
        "Origin is reserved for LucaOS Creator/source-code authority",
      );
      expect(doc).toContain(
        "Primary Host is the user's main trusted device inside LucaLink Mesh",
      );
    }
  });

  it("exports static, side-effect-free, frozen definitions", () => {
    // Importing the module above must not have triggered any runtime behavior.
    // Re-importing should yield identical references (no per-call computation).
    expect(Array.isArray(lucaLinkHostRoles)).toBe(true);

    // Mutating a frozen export must throw in strict mode (ESM is strict).
    expect(() => {
      // @ts-expect-error intentionally testing immutability at runtime
      lucaLinkHostRoles.push({});
    }).toThrow();
  });

  it("does not require browser globals or touch storage/fetch at import time", async () => {
    const fetchSpy = vi.fn();
    const localStorage = makeStorageSpy();
    const sessionStorage = makeStorageSpy();
    const fetchDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "fetch",
    );
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "sessionStorage",
    );

    try {
      Object.defineProperty(globalThis, "fetch", {
        value: fetchSpy,
        configurable: true,
      });
      Object.defineProperty(globalThis, "localStorage", {
        value: localStorage,
        configurable: true,
      });
      Object.defineProperty(globalThis, "sessionStorage", {
        value: sessionStorage,
        configurable: true,
      });
      vi.resetModules();

      await import("./lucaLinkArchitectureMap");

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(localStorage.getItem).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(sessionStorage.getItem).not.toHaveBeenCalled();
      expect(sessionStorage.setItem).not.toHaveBeenCalled();
      expect(sessionStorage.removeItem).not.toHaveBeenCalled();
    } finally {
      restoreGlobalProperty("fetch", fetchDescriptor);
      restoreGlobalProperty("localStorage", localStorageDescriptor);
      restoreGlobalProperty("sessionStorage", sessionStorageDescriptor);
    }
  });
});
