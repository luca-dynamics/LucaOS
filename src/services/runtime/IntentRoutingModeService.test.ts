import { describe, expect, it, vi } from "vitest";
import { IntentRoutingModeService } from "./IntentRoutingModeService";

function makeStore() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value; },
  };
}

describe("IntentRoutingModeService", () => {
  it("defaults to auto", () => {
    const service = new IntentRoutingModeService(makeStore());
    expect(service.getMode()).toBe("auto");
  });

  it("setMode persists and notifies", () => {
    const store = makeStore();
    const service = new IntentRoutingModeService(store);
    const listener = vi.fn();
    service.subscribe(listener);

    service.setMode("fast");
    expect(service.getMode()).toBe("fast");
    expect(store.getItem("LUCA_INTENT_ROUTING_MODE_V1")).toBe("fast");
    expect(listener).toHaveBeenCalledWith("fast");
  });

  it("reads persisted mode on construction", () => {
    const store = makeStore();
    store.setItem("LUCA_INTENT_ROUTING_MODE_V1", "plan");
    const service = new IntentRoutingModeService(store);
    expect(service.getMode()).toBe("plan");
  });

  it("ignores invalid mode from storage", () => {
    const store = makeStore();
    store.setItem("LUCA_INTENT_ROUTING_MODE_V1", "invalid_mode");
    const service = new IntentRoutingModeService(store);
    expect(service.getMode()).toBe("auto");
  });

  it("ignores invalid mode on set", () => {
    const service = new IntentRoutingModeService(makeStore());
    service.setMode("invalid" as any);
    expect(service.getMode()).toBe("auto");
  });

  it("unsubscribe stops notifications", () => {
    const service = new IntentRoutingModeService(makeStore());
    const listener = vi.fn();
    const unsub = service.subscribe(listener);
    unsub();
    service.setMode("agent");
    expect(listener).not.toHaveBeenCalled();
  });

  it("getModeLabel returns descriptive label", () => {
    const service = new IntentRoutingModeService(makeStore());
    expect(service.getModeLabel()).toContain("Auto");
  });

  it("getModeDescription returns description", () => {
    const service = new IntentRoutingModeService(makeStore());
    expect(service.getModeDescription()).toBeTruthy();
  });
});
