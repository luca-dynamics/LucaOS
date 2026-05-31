import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS,
  ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS,
} from "../../types/originOverlayCriticalControls";
import { OriginOverlayCriticalControlGateService } from "./OriginOverlayCriticalControlGateService";

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return new OriginOverlayCriticalControlGateService({ storage, bus });
}

describe("OriginOverlayCriticalControlGateService", () => {
  let service: OriginOverlayCriticalControlGateService;

  beforeEach(() => {
    service = makeService();
  });

  it("records every critical-control attempt as blocked/stub-only", () => {
    for (const controlId of ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS) {
      const record = service.recordCriticalActionAttempt(controlId);
      expect(record.controlId).toBe(controlId);
      expect(record.allowed).toBe(false);
      expect(["blocked_until_origin_control_policy", "needs_dedicated_critical_control_policy"]).toContain(record.status);
      expect(record.blockedBy).toContain(record.status);
      expect(record.criticalControlGateStubOnly).toBe(true);
      expect(record.controlExecuted).toBe(false);
    }
  });

  it("bounds retained records", () => {
    for (let i = 0; i < MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS + 25; i += 1) {
      service.recordCriticalActionAttempt("admin_grant_root");
    }
    expect(service.listRecords()).toHaveLength(MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS);
    expect(service.getDiagnosticsSummary().totalRecords).toBe(MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS);
  });

  it("counts diagnostics by blocked status", () => {
    service.recordCriticalActionAttempt("admin_grant_root");
    service.recordCriticalActionAttempt("smart_tv_remote");
    service.recordCriticalActionAttempt("lockdown_override");

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalRecords).toBe(3);
    expect(summary.blockedUntilOriginControlPolicyAttempts).toBe(2);
    expect(summary.needsDedicatedCriticalControlPolicyAttempts).toBe(1);
    expect(summary.controls).toEqual(ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS);
  });

  it("keeps every dangerous safety flag false", () => {
    const record = service.recordCriticalActionAttempt("custom_skill_execution");
    const summary = service.getDiagnosticsSummary();

    for (const flags of [record, summary]) {
      expect(flags.governanceApplied).toBe(true);
      expect(flags.criticalControlGateStubOnly).toBe(true);
      expect(flags.controlExecuted).toBe(false);
      expect(flags.rootAdminGranted).toBe(false);
      expect(flags.lockdownOverridden).toBe(false);
      expect(flags.destructiveActionEnabled).toBe(false);
      expect(flags.deviceControlEnabled).toBe(false);
      expect(flags.customSkillExecutionEnabled).toBe(false);
      expect(flags.toolExecutionEnabled).toBe(false);
      expect(flags.automationEnabled).toBe(false);
      expect(flags.externalActionEnabled).toBe(false);
      expect(flags.fileAccessEnabled).toBe(false);
      expect(flags.messagingEnabled).toBe(false);
      expect(flags.wirelessControlEnabled).toBe(false);
      expect(flags.walletPaymentEnabled).toBe(false);
    }
  });

  it("exposes no execute, root, lockdown, device, or skill methods", () => {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(service),
    ).filter((name) => name !== "constructor" && !name.startsWith("#"));

    expect(methods.sort()).toEqual(
      ["getDiagnosticsSummary", "listRecords", "recordCriticalActionAttempt"].sort(),
    );
    for (const forbidden of ["execute", "grantRoot", "overrideLockdown", "controlDevice", "runSkill"]) {
      expect(methods).not.toContain(forbidden);
    }
  });
});
