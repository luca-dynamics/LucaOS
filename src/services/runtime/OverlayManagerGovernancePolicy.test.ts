import { describe, expect, it } from "vitest";
import {
  OVERLAY_SURFACE_IDS,
  type OverlaySurfaceId,
} from "../../types/overlayManagerGovernance";
import {
  getOverlayBlockedUntilPolicySurfaces,
  getOverlayDisplayOnlySurfaces,
  getOverlayManagerArchitectureAuditSummary,
  getOverlayNeedsGovernanceSurfaces,
  getOverlaySurfacePolicy,
  getOverlaySurfaceRecommendation,
  listOverlaySurfacePolicies,
} from "./OverlayManagerGovernancePolicy";

describe("OverlayManagerGovernancePolicy", () => {
  it("classifies every declared overlay surface exactly once", () => {
    const policies = listOverlaySurfacePolicies();
    expect(policies).toHaveLength(OVERLAY_SURFACE_IDS.length);
    const ids = policies.map((p) => p.id).sort();
    expect(ids).toEqual([...OVERLAY_SURFACE_IDS].sort());
  });

  it("treats high/critical and sensitive-surface postures as sensitive", () => {
    for (const p of listOverlaySurfacePolicies()) {
      const expectedSensitive =
        p.riskLevel === "high" ||
        p.riskLevel === "critical" ||
        p.postures.includes("sensitive-surface") ||
        p.postures.includes("blocked-until-policy");
      expect(p.sensitive).toBe(expectedSensitive);
    }
  });

  it("flags OriginOverlayPanels as critical and blocked-until-policy", () => {
    const origin = getOverlaySurfacePolicy("origin_overlay_panels");
    expect(origin.riskLevel).toBe("critical");
    expect(origin.postures).toContain("blocked-until-policy");
    expect(origin.sensitive).toBe(true);
    expect(getOverlaySurfaceRecommendation("origin_overlay_panels")).toMatch(
      /blocked until/i,
    );
  });

  it("flags VoiceHud as input-capable, visualcore-linked, and a bypass path", () => {
    const voice = getOverlaySurfacePolicy("voice_hud");
    expect(voice.postures).toContain("input-capable");
    expect(voice.postures).toContain("visualcore-linked");
    expect(voice.capabilities.invokesTools).toBe(true);
    expect(voice.capabilities.canBypassVisualCoreGovernance).toBe(true);
    expect((voice.notes ?? []).join(" ")).toMatch(/approvalRequest|bypass/i);
  });

  it("flags the Android native overlay as a widget-linked sensitive entry point", () => {
    const native = getOverlaySurfacePolicy("android_native_overlay");
    expect(native.postures).toContain("widget-linked");
    expect(native.postures).toContain("blocked-until-policy");
    expect(native.capabilities.requestsSystemPermission).toBe(true);
    expect(native.capabilities.invokesTools).toBe(true);
  });

  it("keeps display-only surfaces low-risk and free of side-effect capabilities", () => {
    for (const id of getOverlayDisplayOnlySurfaces()) {
      const p = getOverlaySurfacePolicy(id);
      // live_content is display-only but elevated/manual-review; allow it.
      if (id === "live_content") continue;
      expect(p.riskLevel).toBe("low");
      expect(p.capabilities.invokesTools).toBe(false);
      expect(p.capabilities.capturesScreenOrCamera).toBe(false);
      expect(p.capabilities.receivesRemoteCommands).toBe(false);
    }
  });

  it("reports an ungoverned summary with stable counts", () => {
    const summary = getOverlayManagerArchitectureAuditSummary();
    expect(summary.governanceApplied).toBe(false);
    expect(summary.totalSurfaces).toBe(18);
    expect(summary.criticalSurfaces).toEqual(["origin_overlay_panels"]);
    expect(summary.displayOnlyCount).toBe(5);
    expect(summary.blockedUntilPolicyCount).toBe(2);

    // Every surface counted once across categories and risk levels.
    const categoryTotal = Object.values(summary.byCategory).reduce(
      (a, b) => a + b,
      0,
    );
    const riskTotal = Object.values(summary.byRiskLevel).reduce(
      (a, b) => a + b,
      0,
    );
    expect(categoryTotal).toBe(18);
    expect(riskTotal).toBe(18);
  });

  it("recommends governance for every needs-governance surface", () => {
    const needs: OverlaySurfaceId[] = getOverlayNeedsGovernanceSurfaces();
    expect(needs.length).toBeGreaterThan(0);
    for (const id of needs) {
      const rec = getOverlaySurfaceRecommendation(id);
      expect(rec).toMatch(/governed|blocked until/i);
    }
    expect(getOverlayBlockedUntilPolicySurfaces()).toEqual([
      "origin_overlay_panels",
      "android_native_overlay",
    ]);
  });
});
