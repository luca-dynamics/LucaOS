// PR #147 — VisualCore Governance Trace Correlation: cross-service tests.
//
// Verifies correlation IDs across the governance chain (remote command → mode
// transition → display session):
// 1. Each service generates a correlation ID when none is supplied.
// 2. Related records can share the same correlation ID across services.
// 3. Unrelated records receive different correlation IDs.
// 4. Correlation IDs never contain raw URLs, tokens, hashes, or sensitive values.
// 5. Safety flags remain false; blocked sensitive transitions stay blocked.
// 6. Browser shell session references are stored as safe local IDs only.

import { describe, expect, it, vi } from "vitest";
import { VisualCoreRemoteCommandService } from "./VisualCoreRemoteCommandService";
import { VisualCoreModeTransitionService } from "./VisualCoreModeTransitionService";
import { VisualCoreDisplaySessionService } from "./VisualCoreDisplaySessionService";
import { isVisualCoreTraceId } from "./visualCoreTraceCorrelation";

function makeServices() {
  const storage = () => {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
    };
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return {
    remote: new VisualCoreRemoteCommandService({ storage: storage(), bus }),
    transition: new VisualCoreModeTransitionService({ bus, storage: storage() }),
    display: new VisualCoreDisplaySessionService({ bus, storage: storage() }),
  };
}

describe("PR #147 — VisualCore governance trace correlation", () => {
  it("generates a correlation id on each record when none supplied", () => {
    const { remote, transition, display } = makeServices();
    const cmd = remote.recordRemoteCommand({ kind: "SYNC_APP_STATE", source: "app_state_sync" });
    const trn = transition.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "system" });
    const ses = display.createDisplaySession({ mode: "DATA", source: "system" });

    for (const id of [cmd.correlationId, trn.correlationId, ses.correlationId]) {
      expect(isVisualCoreTraceId(id)).toBe(true);
    }
  });

  it("carries the same correlation id across the command → transition → display chain", () => {
    const { remote, transition, display } = makeServices();
    const cmd = remote.recordRemoteCommand({
      type: "BROWSER_NAVIGATE",
      value: "https://gov.test/page",
      source: "ipc_remote_control",
    });
    const trn = transition.recordTransition({
      fromMode: "IDLE",
      toMode: "DATA",
      source: "remote_command",
      correlationId: cmd.correlationId,
    });
    const ses = display.createDisplaySession({
      mode: "DATA",
      source: "prop_update",
      correlationId: trn.correlationId,
    });

    expect(trn.correlationId).toBe(cmd.correlationId);
    expect(ses.correlationId).toBe(cmd.correlationId);
  });

  it("gives unrelated records different correlation ids", () => {
    const { remote, transition } = makeServices();
    const a = remote.recordRemoteCommand({ kind: "SYNC_APP_STATE", source: "app_state_sync" });
    const b = transition.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "system" });
    expect(a.correlationId).not.toBe(b.correlationId);
  });

  it("never derives a correlation id from a raw URL/token/hash", () => {
    const { remote } = makeServices();
    const cmd = remote.recordRemoteCommand({
      type: "BROWSER_NAVIGATE",
      value: "https://bank.example.com/login?token=SUPERSECRET#frag",
      source: "ipc_remote_control",
    });
    const id = cmd.correlationId ?? "";
    expect(id).not.toContain("bank.example.com");
    expect(id).not.toContain("SUPERSECRET");
    expect(id).not.toContain("token");
    expect(id).not.toContain("://");
    expect(isVisualCoreTraceId(id)).toBe(true);
  });

  it("keeps blocked sensitive transitions blocked and non-actionable while correlated", () => {
    const { transition } = makeServices();
    const trn = transition.recordTransition({
      fromMode: "DATA",
      toMode: "WIRELESS",
      source: "remote_command",
    });
    expect(trn.status).toBe("blocked_sensitive");
    expect(isVisualCoreTraceId(trn.correlationId)).toBe(true);
    // All danger flags remain false.
    expect(trn.executionChanged).toBe(false);
    expect(trn.captureEnabled).toBe(false);
    expect(trn.automationEnabled).toBe(false);
    expect(trn.externalActionEnabled).toBe(false);
    expect(trn.fileAccessEnabled).toBe(false);
    expect(trn.messagingEnabled).toBe(false);
    expect(trn.wirelessControlEnabled).toBe(false);
    expect(trn.walletPaymentEnabled).toBe(false);
  });

  it("stores a browser shell session reference only as a safe local id", () => {
    const { transition } = makeServices();
    const ok = transition.recordTransition({
      fromMode: "IDLE",
      toMode: "BROWSER",
      source: "remote_command",
      hasBrowserSession: true,
      browserShellSessionId: "sandboxed-browser-shell:2026-01-01T00:00:00.000Z:ab12cd",
    });
    expect(ok.browserShellSessionId).toBe("sandboxed-browser-shell:2026-01-01T00:00:00.000Z:ab12cd");
    expect(ok.status).toBe("allowed_governed_browser");

    // A URL-shaped reference is rejected (never stored).
    const unsafe = transition.recordTransition({
      fromMode: "IDLE",
      toMode: "BROWSER",
      source: "remote_command",
      hasBrowserSession: true,
      browserShellSessionId: "https://example.com/session?token=abc",
    });
    expect(unsafe.browserShellSessionId).toBeUndefined();
  });
});
