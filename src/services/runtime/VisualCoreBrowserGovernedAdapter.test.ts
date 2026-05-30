// VisualCoreBrowserGovernedAdapter — PR #143: VisualCore Browser Mode
// Governed LucaBrowser Adapter.
//
// Tests proving:
// 1. VisualCore BROWSER mode uses the governed LucaBrowser adapter/session path.
// 2. BROWSER_NAVIGATE classification changes because the governed adapter exists.
// 3. Sensitive VisualCore modes remain untouched/blocked/gated.
// 4. No automation/capture/file/messaging/wireless flags are enabled.

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  evaluateVisualCoreRemoteCommand,
  getVisualCoreRemoteCommandBoundaryLabels,
} from "./VisualCoreRemoteCommandPolicy";
import { VisualCoreRemoteCommandService } from "./VisualCoreRemoteCommandService";
import {
  getVisualCoreSurfacePolicy,
  getVisualCoreReadyForDisplayGovernanceModes,
  getVisualCoreUnsafeOrSensitiveModes,
} from "./VisualCoreGovernancePolicy";
import {
  isVisualCoreModeReadyForDisplayGovernance,
  shouldRecordVisualCoreDisplaySession,
} from "./VisualCoreDisplayGovernance";
import type { VisualCoreSurfaceMode } from "../../types/visualCoreGovernance";

// ---------------------------------------------------------------------------
// Sensitive modes that must stay gated/blocked — must NEVER be affected.
// ---------------------------------------------------------------------------
const SENSITIVE_MODES: VisualCoreSurfaceMode[] = [
  "VISION",
  "SECURITY",
  "HACKING",
  "FILES",
  "RECORDER",
  "TELEGRAM",
  "WHATSAPP",
  "WIRELESS",
  "CODE_EDITOR",
  "INGESTION",
  "AUTONOMY",
  "SKILLS",
];

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return { service: new VisualCoreRemoteCommandService({ storage, bus }), bus };
}

describe("PR #143 — VisualCore Browser Mode Governed LucaBrowser Adapter", () => {
  // =========================================================================
  // 1. BROWSER mode governed adapter integration
  // =========================================================================
  describe("BROWSER mode governance policy", () => {
    it("classifies BROWSER as ready_for_display_governance with elevated risk", () => {
      const policy = getVisualCoreSurfacePolicy("BROWSER");
      expect(policy.readiness).toBe("ready_for_display_governance");
      expect(policy.riskLevel).toBe("elevated");
      expect(policy.sensitive).toBe(false);
      expect(policy.category).toBe("browser_surface");
    });

    it("BROWSER label reflects governed mode", () => {
      const policy = getVisualCoreSurfacePolicy("BROWSER");
      expect(policy.label).toMatch(/Governed/i);
    });

    it("BROWSER notes mention governed adapter, not embedded", () => {
      const policy = getVisualCoreSurfacePolicy("BROWSER");
      const notes = (policy.notes ?? []).join(" ");
      expect(notes).toMatch(/GOVERNED/);
      expect(notes).toMatch(/governed adapter/i);
      expect(notes).not.toMatch(/embedded mode, NOT governed/);
    });

    it("BROWSER is now in the ready-for-display-governance set", () => {
      const ready = getVisualCoreReadyForDisplayGovernanceModes();
      expect(ready).toContain("BROWSER");
    });

    it("BROWSER is eligible for governed display session recording", () => {
      expect(isVisualCoreModeReadyForDisplayGovernance("BROWSER")).toBe(true);
      expect(shouldRecordVisualCoreDisplaySession("BROWSER")).toBe(true);
    });
  });

  // =========================================================================
  // 2. BROWSER_NAVIGATE remote command classification
  // =========================================================================
  describe("BROWSER_NAVIGATE classification with governed adapter", () => {
    it("allows BROWSER_NAVIGATE as record-only with elevated risk", () => {
      const decision = evaluateVisualCoreRemoteCommand({
        type: "BROWSER_NAVIGATE",
        value: "https://example.com/docs",
      });
      expect(decision.kind).toBe("BROWSER_NAVIGATE");
      expect(decision.status).toBe("allowed_record_only");
      expect(decision.riskLevel).toBe("elevated");
      expect(decision.blockedBy).toBeUndefined();
    });

    it("BROWSER_NAVIGATE records have browserGoverned: true", () => {
      const { service } = makeService();
      const record = service.recordRemoteCommand({
        type: "BROWSER_NAVIGATE",
        value: "https://example.com/page",
        source: "ipc_remote_control",
      });
      expect(record.browserGoverned).toBe(true);
      expect(record.status).toBe("allowed_record_only");
    });

    it("non-browser commands still have browserGoverned: false", () => {
      const { service } = makeService();
      const record = service.recordRemoteCommand({
        kind: "SYNC_APP_STATE",
        source: "app_state_sync",
      });
      expect(record.browserGoverned).toBe(false);
    });

    it("diagnostics show browserGoverned: true", () => {
      const { service } = makeService();
      service.recordRemoteCommand({ kind: "SYNC_APP_STATE", source: "app_state_sync" });
      const diag = service.getDiagnosticsSummary();
      expect(diag.browserGoverned).toBe(true);
    });

    it("boundary labels mention governed LucaBrowser adapter", () => {
      const labels = getVisualCoreRemoteCommandBoundaryLabels();
      expect(labels).toContain("Browser navigation governed via LucaBrowser adapter");
      expect(labels).toContain("No capture");
      expect(labels).toContain("No automation");
      expect(labels).toContain("No DOM read");
      expect(labels).toContain("No click/type/scroll");
    });
  });

  // =========================================================================
  // 3. Sensitive modes remain untouched/blocked/gated (regression)
  // =========================================================================
  describe("sensitive mode regression", () => {
    it("sensitive modes remain sensitive and high/critical risk", () => {
      for (const mode of SENSITIVE_MODES) {
        const policy = getVisualCoreSurfacePolicy(mode);
        expect(policy.sensitive, `${mode} should be sensitive`).toBe(true);
        expect(
          ["high", "critical"],
          `${mode} should have high or critical risk`,
        ).toContain(policy.riskLevel);
      }
    });

    it("sensitive modes are NOT in the ready-for-display-governance set", () => {
      const ready = getVisualCoreReadyForDisplayGovernanceModes();
      for (const mode of SENSITIVE_MODES) {
        expect(ready, `${mode} should not be in ready set`).not.toContain(mode);
      }
    });

    it("SET_MODE to sensitive modes is still held or blocked", () => {
      for (const mode of SENSITIVE_MODES) {
        const decision = evaluateVisualCoreRemoteCommand({
          type: "SET_MODE",
          value: mode,
        });
        expect(
          ["needs_approval", "blocked"],
          `SET_MODE to ${mode} should not be allowed`,
        ).toContain(decision.status);
      }
    });

    it("sensitive modes remain in the unsafe/sensitive list", () => {
      const unsafe = getVisualCoreUnsafeOrSensitiveModes();
      for (const mode of SENSITIVE_MODES) {
        expect(unsafe, `${mode} should be in unsafe list`).toContain(mode);
      }
    });
  });

  // =========================================================================
  // 4. No automation/capture/file/messaging/wireless/wallet flags (regression)
  // =========================================================================
  describe("safety flags regression", () => {
    it("BROWSER_NAVIGATE records have all danger flags disabled", () => {
      const { service } = makeService();
      const record = service.recordRemoteCommand({
        type: "BROWSER_NAVIGATE",
        value: "https://safe.test",
        source: "ipc_remote_control",
      });
      expect(record.governanceApplied).toBe(true);
      expect(record.recordOnly).toBe(true);
      expect(record.executionChanged).toBe(false);
      expect(record.captureEnabled).toBe(false);
      expect(record.automationEnabled).toBe(false);
      expect(record.externalActionEnabled).toBe(false);
      expect(record.credentialSensitive).toBe(false);
      expect(record.fileAccessEnabled).toBe(false);
      expect(record.messagingEnabled).toBe(false);
      expect(record.wirelessControlEnabled).toBe(false);
      expect(record.walletPaymentEnabled).toBe(false);
    });

    it("BROWSER mode policy does not enable automation, capture, or sensitive-mode gate", () => {
      const policy = getVisualCoreSurfacePolicy("BROWSER");
      expect(policy.capabilities.captureEnabled).toBe(false);
      expect(policy.capabilities.automationEnabled).toBe(false);
      expect(policy.capabilities.handlesFiles).toBe(false);
      expect(policy.capabilities.handlesMessaging).toBe(false);
      expect(policy.capabilities.handlesWireless).toBe(false);
      expect(policy.capabilities.handlesVision).toBe(false);
      expect(policy.capabilities.recordsMedia).toBe(false);
      expect(policy.capabilities.securityOrHackingSurface).toBe(false);
      expect(policy.capabilities.requiresSensitiveModeGate).toBe(false);
    });

    it("diagnostics summary has all danger flags disabled", () => {
      const { service } = makeService();
      service.recordRemoteCommand({
        type: "BROWSER_NAVIGATE",
        value: "https://x.test",
        source: "ipc_remote_control",
      });
      const diag = service.getDiagnosticsSummary();
      expect(diag.captureEnabled).toBe(false);
      expect(diag.automationEnabled).toBe(false);
      expect(diag.externalActionEnabled).toBe(false);
      expect(diag.fileAccessEnabled).toBe(false);
      expect(diag.messagingEnabled).toBe(false);
      expect(diag.wirelessControlEnabled).toBe(false);
      expect(diag.walletPaymentEnabled).toBe(false);
    });

    it("service exposes no execute/navigate/capture/file/messaging/wireless methods", () => {
      const { service } = makeService();
      const forbidden = [
        "execute",
        "executeCommand",
        "navigate",
        "openBrowser",
        "switchMode",
        "setMode",
        "capture",
        "captureScreen",
        "readFile",
        "sendMessage",
        "controlWireless",
        "castToDevice",
      ];
      const proto = service as unknown as Record<string, unknown>;
      for (const method of forbidden) {
        expect(typeof proto[method], `${method} should not be a function`).not.toBe("function");
      }
    });
  });
});
