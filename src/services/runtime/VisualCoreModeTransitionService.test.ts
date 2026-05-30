// PR #145 — VisualCore Governed Mode Transition Guard tests.
//
// Verifies:
// 1. Safe display mode transitions are allowed.
// 2. BROWSER transitions are allowed only with governed session context.
// 3. Sensitive mode transitions are blocked.
// 4. Unknown mode transitions are blocked.
// 5. Browser close/revoke transitions to IDLE are allowed.
// 6. All danger flags remain false.
// 7. Service records bounded, diagnostics accurate.

import { describe, expect, it, vi } from "vitest";
import {
  evaluateModeTransition,
  isTransitionAllowed,
  VisualCoreModeTransitionService,
} from "./VisualCoreModeTransitionService";
import { getVisualCoreUnsafeOrSensitiveModes } from "./VisualCoreGovernancePolicy";

function makeService() {
  const events: unknown[] = [];
  const bus = {
    emit: vi.fn(),
    emitEvent: vi.fn((evt: unknown) => events.push(evt)),
  };
  const storage = {
    store: {} as Record<string, string>,
    getItem(key: string) { return this.store[key] ?? null; },
    setItem(key: string, value: string) { this.store[key] = value; },
  };
  const service = new VisualCoreModeTransitionService({ bus, storage });
  return { service, bus, storage, events };
}

// Non-sensitive modes (ready_for_display_governance or needs_manual_review).
// Modes with needs_sensitive_mode_gate / blocked_until_dedicated_policy are
// classified as sensitive and will be blocked by the transition guard.
const SAFE_DISPLAY_MODES = [
  "IDLE", "DATA", "DATA_ROOM", "REPORTS", "SUBSYSTEMS", "SOVEREIGNTY",
  "CINEMA", "OSINT", "NETWORK", "GEO", "LIVE",
];

// All modes the governance policy considers sensitive (high/critical risk OR
// needs_sensitive_mode_gate / blocked_until_dedicated_policy readiness).
const HIGH_CRITICAL_SENSITIVE_MODES = getVisualCoreUnsafeOrSensitiveModes();
// Include elevated-risk modes that have needs_sensitive_mode_gate readiness
// (not captured by getVisualCoreUnsafeOrSensitiveModes which only returns high/critical).
const ELEVATED_SENSITIVE_MODES = ["STOCKS", "PREDICTIONS"];
const ALL_SENSITIVE_MODES = [...HIGH_CRITICAL_SENSITIVE_MODES, ...ELEVATED_SENSITIVE_MODES];

describe("PR #145 — VisualCore Governed Mode Transition Guard", () => {
  // =========================================================================
  // 1. Safe display mode transitions
  // =========================================================================
  describe("safe display mode transitions", () => {
    it("allows transition to IDLE from any source", () => {
      const decision = evaluateModeTransition({
        fromMode: "BROWSER",
        toMode: "IDLE",
        source: "component_close",
      });
      expect(decision.status).toBe("allowed");
      expect(isTransitionAllowed(decision.status)).toBe(true);
    });

    it("allows transition to safe display modes", () => {
      for (const toMode of SAFE_DISPLAY_MODES) {
        const decision = evaluateModeTransition({
          fromMode: "IDLE",
          toMode,
          source: "prop_update",
        });
        expect(isTransitionAllowed(decision.status), `${toMode} should be allowed`).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. BROWSER transitions
  // =========================================================================
  describe("BROWSER transitions", () => {
    it("allows BROWSER when governed browser session is active", () => {
      const decision = evaluateModeTransition({
        fromMode: "IDLE",
        toMode: "BROWSER",
        source: "remote_command",
        hasBrowserSession: true,
      });
      expect(decision.status).toBe("allowed_governed_browser");
      expect(isTransitionAllowed(decision.status)).toBe(true);
    });

    it("allows BROWSER from prop_update even without existing session", () => {
      const decision = evaluateModeTransition({
        fromMode: "IDLE",
        toMode: "BROWSER",
        source: "prop_update",
        hasBrowserSession: false,
      });
      expect(decision.status).toBe("allowed_governed_browser");
    });

    it("allows BROWSER from local_ui even without existing session", () => {
      const decision = evaluateModeTransition({
        fromMode: "IDLE",
        toMode: "BROWSER",
        source: "local_ui",
        hasBrowserSession: false,
      });
      expect(decision.status).toBe("allowed_governed_browser");
    });

    it("blocks BROWSER from system source without session", () => {
      const decision = evaluateModeTransition({
        fromMode: "IDLE",
        toMode: "BROWSER",
        source: "system",
        hasBrowserSession: false,
      });
      expect(decision.status).toBe("blocked_browser_no_session");
      expect(isTransitionAllowed(decision.status)).toBe(false);
      expect(decision.blockedBy).toContain("browser_no_governed_session");
    });
  });

  // =========================================================================
  // 3. Sensitive mode transitions blocked
  // =========================================================================
  describe("sensitive mode transitions", () => {
    it("blocks all sensitive modes", () => {
      for (const sensitiveMode of ALL_SENSITIVE_MODES) {
        const decision = evaluateModeTransition({
          fromMode: "IDLE",
          toMode: sensitiveMode,
          source: "prop_update",
        });
        expect(decision.status, `${sensitiveMode} should be blocked`).toBe("blocked_sensitive");
        expect(isTransitionAllowed(decision.status)).toBe(false);
        expect(decision.blockedBy?.[0]).toMatch(/^sensitive_mode:/);
      }
    });
  });

  // =========================================================================
  // 4. Unknown mode transitions blocked
  // =========================================================================
  describe("unknown mode transitions", () => {
    it("blocks unknown target modes", () => {
      const decision = evaluateModeTransition({
        fromMode: "IDLE",
        toMode: "DOES_NOT_EXIST",
        source: "remote_command",
      });
      expect(decision.status).toBe("blocked_unknown");
      expect(isTransitionAllowed(decision.status)).toBe(false);
      expect(decision.blockedBy).toContain("unknown_target_mode");
    });
  });

  // =========================================================================
  // 5. Browser close/revoke → IDLE
  // =========================================================================
  describe("browser close/revoke transitions", () => {
    it("allows browser_close → IDLE", () => {
      const decision = evaluateModeTransition({
        fromMode: "BROWSER",
        toMode: "IDLE",
        source: "browser_close",
      });
      expect(decision.status).toBe("allowed");
      expect(isTransitionAllowed(decision.status)).toBe(true);
    });

    it("allows browser_revoke → IDLE", () => {
      const decision = evaluateModeTransition({
        fromMode: "BROWSER",
        toMode: "IDLE",
        source: "browser_revoke",
      });
      expect(decision.status).toBe("allowed");
      expect(isTransitionAllowed(decision.status)).toBe(true);
    });
  });

  // =========================================================================
  // 6. Danger flags
  // =========================================================================
  describe("danger flags", () => {
    it("all danger flags are false in transition records", () => {
      const { service } = makeService();
      const record = service.recordTransition({
        fromMode: "IDLE",
        toMode: "DATA",
        source: "local_ui",
      });
      expect(record.governanceApplied).toBe(true);
      expect(record.transitionOnly).toBe(true);
      expect(record.executionChanged).toBe(false);
      expect(record.captureEnabled).toBe(false);
      expect(record.automationEnabled).toBe(false);
      expect(record.externalActionEnabled).toBe(false);
      expect(record.fileAccessEnabled).toBe(false);
      expect(record.messagingEnabled).toBe(false);
      expect(record.wirelessControlEnabled).toBe(false);
      expect(record.walletPaymentEnabled).toBe(false);
    });

    it("all danger flags are false in diagnostics summary", () => {
      const { service } = makeService();
      service.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "local_ui" });
      const diag = service.getDiagnosticsSummary();
      expect(diag.governanceApplied).toBe(true);
      expect(diag.transitionOnly).toBe(true);
      expect(diag.executionChanged).toBe(false);
      expect(diag.captureEnabled).toBe(false);
      expect(diag.automationEnabled).toBe(false);
      expect(diag.externalActionEnabled).toBe(false);
      expect(diag.fileAccessEnabled).toBe(false);
      expect(diag.messagingEnabled).toBe(false);
      expect(diag.wirelessControlEnabled).toBe(false);
      expect(diag.walletPaymentEnabled).toBe(false);
    });
  });

  // =========================================================================
  // 7. Service records & diagnostics
  // =========================================================================
  describe("service records and diagnostics", () => {
    it("records transitions and lists them", () => {
      const { service } = makeService();
      service.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "prop_update" });
      service.recordTransition({ fromMode: "DATA", toMode: "CINEMA", source: "local_ui" });
      expect(service.listTransitionRecords().length).toBe(2);
    });

    it("diagnostics counts are accurate", () => {
      const { service } = makeService();
      service.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "prop_update" });
      service.recordTransition({ fromMode: "DATA", toMode: "BROWSER", source: "remote_command", hasBrowserSession: true });
      service.recordTransition({ fromMode: "BROWSER", toMode: "IDLE", source: "browser_close" });
      service.recordTransition({ fromMode: "IDLE", toMode: "HACKING", source: "prop_update" });
      service.recordTransition({ fromMode: "IDLE", toMode: "NONEXISTENT", source: "system" });
      const diag = service.getDiagnosticsSummary();
      expect(diag.totalTransitions).toBe(5);
      expect(diag.allowedTransitions).toBe(2); // DATA + IDLE
      expect(diag.allowedGovernedBrowserTransitions).toBe(1);
      expect(diag.blockedSensitiveTransitions).toBe(1); // HACKING
      expect(diag.blockedUnknownTransitions).toBe(1); // NONEXISTENT
    });

    it("emits audit events for each transition", () => {
      const { service, events } = makeService();
      service.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "local_ui" });
      expect(events.length).toBe(1);
      const evt = events[0] as Record<string, unknown>;
      expect(evt.type).toBe("visual_core_mode_transition");
    });

    it("getTransitionRecord retrieves by ID", () => {
      const { service } = makeService();
      const record = service.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "local_ui" });
      const found = service.getTransitionRecord(record.transitionId);
      expect(found).toBeDefined();
      expect(found?.toMode).toBe("DATA");
    });

    it("records are bounded", () => {
      const { service } = makeService();
      for (let i = 0; i < 120; i++) {
        service.recordTransition({ fromMode: "IDLE", toMode: "DATA", source: "system" });
      }
      expect(service.listTransitionRecords().length).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // 8. No forbidden methods
  // =========================================================================
  describe("service API surface", () => {
    it("exposes no execute/navigate/capture/file/messaging/wireless methods", () => {
      const { service } = makeService();
      const forbidden = [
        "execute", "executeCommand", "navigate", "openBrowser",
        "switchMode", "setMode", "capture", "captureScreen",
        "readFile", "sendMessage", "controlWireless", "castToDevice",
      ];
      const proto = service as unknown as Record<string, unknown>;
      for (const method of forbidden) {
        expect(typeof proto[method], `${method} should not be a function`).not.toBe("function");
      }
    });
  });
});
