import { describe, expect, it } from "vitest";
import {
  OVERLAY_CAPTURE_SURFACE_IDS,
  type OverlayCaptureSurfaceId,
} from "../../types/overlayCaptureGovernance";
import {
  assertKnownOverlayCaptureSurfaceMap,
  getOverlayCaptureGateDecision,
  getOverlayCaptureGovernanceSummary,
  getOverlayCaptureSurfacePolicy,
  listOverlayCaptureSurfacePolicies,
} from "./OverlayCaptureGovernancePolicy";

describe("OverlayCaptureGovernancePolicy", () => {
  it("maps every known capture overlay surface exactly once", () => {
    const policies = listOverlayCaptureSurfacePolicies();
    expect(policies).toHaveLength(OVERLAY_CAPTURE_SURFACE_IDS.length);
    expect(policies.map((policy) => policy.surfaceId).sort()).toEqual([...OVERLAY_CAPTURE_SURFACE_IDS].sort());
    expect(assertKnownOverlayCaptureSurfaceMap()).toBe(true);
  });

  it("describes capture capabilities and source components for each surface", () => {
    const expectations: Record<OverlayCaptureSurfaceId, string> = {
      presence_monitor: "PresenceMonitor",
      screen_share: "ScreenShare",
      vision_camera: "VisionCameraModal",
      desktop_stream: "DesktopStreamModal",
      luca_recorder: "LucaRecorder",
    };
    for (const surfaceId of OVERLAY_CAPTURE_SURFACE_IDS) {
      const policy = getOverlayCaptureSurfacePolicy(surfaceId);
      expect(policy.sourceComponent).toBe(expectations[surfaceId]);
      expect(policy.captures.length).toBeGreaterThan(0);
      expect(policy.needsExplicitActivationGate).toBe(true);
      expect(policy.recommendedFutureApprovalCopy).toBeTruthy();
    }
  });

  it("marks every gate decision blocked/stub-only", () => {
    for (const surfaceId of OVERLAY_CAPTURE_SURFACE_IDS) {
      const decision = getOverlayCaptureGateDecision(surfaceId);
      expect(decision.allowed).toBe(false);
      expect(["blocked_until_dedicated_policy", "needs_explicit_capture_policy"]).toContain(decision.status);
      expect(decision.blockedBy).toContain(decision.status);
    }
  });

  it("summarizes bypass/tool-linked surfaces without enabling them", () => {
    const summary = getOverlayCaptureGovernanceSummary();
    expect(summary.totalSurfaces).toBe(5);
    expect(summary.mappedSurfaces.sort()).toEqual([...OVERLAY_CAPTURE_SURFACE_IDS].sort());
    expect(summary.captureBypassSurfaces.sort()).toEqual([...OVERLAY_CAPTURE_SURFACE_IDS].sort());
    expect(summary.toolLinkedSurfaces.sort()).toEqual(["luca_recorder", "vision_camera"]);
    expect(summary.explicitGateRequiredSurfaces.sort()).toEqual([...OVERLAY_CAPTURE_SURFACE_IDS].sort());
  });
});
