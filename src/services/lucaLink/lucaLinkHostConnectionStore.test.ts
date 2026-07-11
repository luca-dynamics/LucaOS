import { describe, expect, it } from "vitest";
import { LucaLinkHostConnectionStore } from "./lucaLinkHostConnectionStore";

const NOW = 1_700_000_000_000;

describe("LucaLinkHostConnectionStore", () => {
  it("owns host connection registry state and delegates registry operations", () => {
    const store = new LucaLinkHostConnectionStore();
    const desktop = store.upsert(
      {
        id: "primary",
        deviceId: "primary",
        displayName: "Primary",
        deviceType: "desktop",
        isCurrentPrimaryHost: true,
      },
      { now: NOW },
    );

    expect(desktop.hostClass).toBe("primary-host");
    expect(store.has("primary")).toBe(true);
    expect(store.get("primary")?.displayName).toBe("Primary");
    expect(store.list()).toHaveLength(1);
    expect(store.summarize().byHostClass["primary-host"]).toBe(1);

    store.upsert(
      {
        id: "watch",
        deviceId: "watch",
        displayName: "Watch",
        deviceType: "smart watch",
      },
      { now: NOW + 1 },
    );

    expect(store.summarize().byHostClass["watch-host"]).toBe(1);
    expect(store.remove("watch")).toBe(true);
    expect(store.has("watch")).toBe(false);

    store.clear();
    expect(store.list()).toEqual([]);
  });
});
