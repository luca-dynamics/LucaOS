import { describe, expect, it } from "vitest";
import {
  ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS,
} from "../../types/originOverlayCriticalControls";
import {
  assertKnownOriginOverlayCriticalControlMap,
  getOriginOverlayCriticalControlGateDecision,
  getOriginOverlayCriticalControlGovernanceSummary,
  getOriginOverlayCriticalControlPolicy,
  listOriginOverlayCriticalControlPolicies,
} from "./OriginOverlayCriticalControlGovernancePolicy";

describe("OriginOverlayCriticalControlGovernancePolicy", () => {
  it("maps all known OriginOverlayPanels critical controls", () => {
    const policies = listOriginOverlayCriticalControlPolicies();
    expect(policies).toHaveLength(ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS.length);
    expect(policies.map((policy) => policy.controlId)).toEqual(ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS);
    expect(assertKnownOriginOverlayCriticalControlMap()).toBe(true);
  });

  it("describes ROOT/admin, lockdown, destructive, device, custom skill, and subsystem controls", () => {
    expect(getOriginOverlayCriticalControlPolicy("admin_grant_root")).toMatchObject({
      sourceComponent: "AdminGrantModal",
      controlKind: "root_admin_grant",
      canAffectSystemSecurityState: true,
      canBypassVisualCoreGovernance: true,
    });
    expect(getOriginOverlayCriticalControlPolicy("lockdown_override").controlKind).toBe("lockdown_override");
    expect(getOriginOverlayCriticalControlPolicy("hacking_terminal").controlKind).toBe("destructive_hacking_tool");
    expect(getOriginOverlayCriticalControlPolicy("smart_tv_remote").canControlDevices).toBe(true);
    expect(getOriginOverlayCriticalControlPolicy("wireless_manager").canControlDevices).toBe(true);
    expect(getOriginOverlayCriticalControlPolicy("custom_skill_execution").controlKind).toBe("custom_skill_execution");
    expect(getOriginOverlayCriticalControlPolicy("subsystem_control").controlKind).toBe("privileged_agent_control");
  });

  it("blocks every critical-control gate decision", () => {
    for (const controlId of ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS) {
      const decision = getOriginOverlayCriticalControlGateDecision(controlId);
      expect(decision.allowed).toBe(false);
      expect(["blocked_until_origin_control_policy", "needs_dedicated_critical_control_policy"]).toContain(decision.status);
      expect(decision.blockedBy).toContain(decision.status);
      expect(decision.recommendedFutureApprovalCopy).toBeTruthy();
    }
  });

  it("summarizes the critical-control risk map", () => {
    const summary = getOriginOverlayCriticalControlGovernanceSummary();
    expect(summary.totalControls).toBe(7);
    expect(summary.criticalControls).toBeGreaterThanOrEqual(5);
    expect(summary.toolExecutingControls).toBeGreaterThanOrEqual(5);
    expect(summary.deviceControlControls).toBe(3);
    expect(summary.systemSecurityControls).toBeGreaterThanOrEqual(5);
  });
});
