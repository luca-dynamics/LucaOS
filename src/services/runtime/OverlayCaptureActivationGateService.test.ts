import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_OVERLAY_CAPTURE_GATE_RECORDS,
  OVERLAY_CAPTURE_SURFACE_IDS,
} from "../../types/overlayCaptureGovernance";
import { OverlayCaptureActivationGateService } from "./OverlayCaptureActivationGateService";

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return new OverlayCaptureActivationGateService({ storage, bus });
}

describe("OverlayCaptureActivationGateService", () => {
  let service: OverlayCaptureActivationGateService;

  beforeEach(() => {
    service = makeService();
  });

  it("records every activation attempt as blocked/stub-only", () => {
    for (const surfaceId of OVERLAY_CAPTURE_SURFACE_IDS) {
      const record = service.recordActivationAttempt(surfaceId);
      expect(record.surfaceId).toBe(surfaceId);
      expect(record.allowed).toBe(false);
      expect(["blocked_until_dedicated_policy", "needs_explicit_capture_policy"]).toContain(record.status);
      expect(record.blockedBy).toContain(record.status);
      expect(record.activationGateStubOnly).toBe(true);
      expect(record.captureStarted).toBe(false);
    }
    expect(service.listRecords()).toHaveLength(OVERLAY_CAPTURE_SURFACE_IDS.length);
  });

  it("bounds retained records", () => {
    for (let i = 0; i < MAX_OVERLAY_CAPTURE_GATE_RECORDS + 25; i += 1) {
      service.recordActivationAttempt("presence_monitor");
    }
    expect(service.listRecords()).toHaveLength(MAX_OVERLAY_CAPTURE_GATE_RECORDS);
    expect(service.getDiagnosticsSummary().totalRecords).toBe(MAX_OVERLAY_CAPTURE_GATE_RECORDS);
  });

  it("counts diagnostics by blocked status", () => {
    service.recordActivationAttempt("presence_monitor");
    service.recordActivationAttempt("screen_share");
    service.recordActivationAttempt("vision_camera");

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalRecords).toBe(3);
    expect(summary.needsExplicitCapturePolicyAttempts).toBe(2);
    expect(summary.blockedUntilDedicatedPolicyAttempts).toBe(1);
    expect(summary.surfaces.sort()).toEqual([...OVERLAY_CAPTURE_SURFACE_IDS].sort());
  });

  it("keeps every dangerous safety flag false", () => {
    const record = service.recordActivationAttempt("luca_recorder");
    const summary = service.getDiagnosticsSummary();

    for (const flags of [record, summary]) {
      expect(flags.governanceApplied).toBe(true);
      expect(flags.activationGateStubOnly).toBe(true);
      expect(flags.captureStarted).toBe(false);
      expect(flags.captureStopped).toBe(false);
      expect(flags.capturePermissionRequested).toBe(false);
      expect(flags.executionChanged).toBe(false);
      expect(flags.toolExecutionEnabled).toBe(false);
      expect(flags.automationEnabled).toBe(false);
      expect(flags.externalActionEnabled).toBe(false);
      expect(flags.fileAccessEnabled).toBe(false);
      expect(flags.messagingEnabled).toBe(false);
      expect(flags.wirelessControlEnabled).toBe(false);
      expect(flags.walletPaymentEnabled).toBe(false);
    }
  });

  it("exposes no direct capture, permission, or execution methods", () => {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(service),
    ).filter((name) => name !== "constructor" && !name.startsWith("#"));

    expect(methods.sort()).toEqual(
      ["getDiagnosticsSummary", "listRecords", "recordActivationAttempt"].sort(),
    );
    for (const forbidden of ["startCapture", "stopCapture", "requestPermission", "execute"]) {
      expect(methods).not.toContain(forbidden);
    }
  });
});
