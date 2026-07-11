import { describe, expect, it } from "vitest";
import { LucaLinkRuntimeStore } from "./lucaLinkRuntimeStore";
import type { LucaLinkRuntimeEnforcementResult } from "./lucaLinkRuntimeEnforcementGate";

function result(id: string, blocked = false): LucaLinkRuntimeEnforcementResult {
  return {
    id,
    timestamp: 1_700_000_000_000,
    mode: "full-outbound",
    scope: "outbound-send",
    eventName: "message",
    decision: blocked ? "deny" : "allow",
    allowed: !blocked,
    blocked,
    queuedApproval: false,
    requiresPrimaryHostApproval: false,
    requiresManualRetry: false,
    requiresFreshConfirmation: false,
    warnings: [],
    errors: [],
    explain: "test result",
  };
}

describe("LucaLinkRuntimeStore", () => {
  it("owns runtime enforcement mode and audit history", () => {
    const store = new LucaLinkRuntimeStore();
    expect(store.getEnforcementMode()).toBe("disabled");

    store.enableEnforcement("full-outbound");
    expect(store.getEnforcementMode()).toBe("full-outbound");
    store.recordEnforcement(result("allow"));
    store.recordEnforcement(result("deny", true));

    expect(store.getEnforcementAudit()).toHaveLength(2);
    expect(store.getEnforcementSummary()).toMatchObject({
      total: 2,
      allowed: 1,
      blocked: 1,
    });

    store.clearEnforcementAudit();
    expect(store.getEnforcementAudit()).toEqual([]);
    store.disableEnforcement();
    expect(store.getEnforcementMode()).toBe("disabled");
  });

  it("owns diagnostics shadow observations", () => {
    const store = new LucaLinkRuntimeStore();
    expect(
      store.observeRuntimeEvent({ eventName: "message", payload: {} }, []),
    ).toBeUndefined();

    store.enableShadowDiagnostics({ now: 1_700_000_000_000 });
    const observation = store.observeRuntimeEvent(
      { eventName: "message", payload: { type: "chat", source: "phone" } },
      [],
    );

    expect(observation).toBeDefined();
    expect(store.getShadowObservations()).toHaveLength(1);
    expect(store.getShadowSummary().total).toBe(1);

    store.clearShadowObservations();
    expect(store.getShadowObservations()).toEqual([]);
  });
});
