import {
  OVERLAY_CAPTURE_SURFACE_IDS,
  type OverlayCaptureSurfaceId,
  type OverlayCaptureSurfacePolicy,
} from "../../types/overlayCaptureGovernance";

const POLICIES: OverlayCaptureSurfacePolicy[] = [
  {
    surfaceId: "presence_monitor",
    sourceComponent: "PresenceMonitor",
    captures: ["camera"],
    riskLevel: "high",
    canBypassVisualCoreGovernance: true,
    canInvokeTools: false,
    needsExplicitActivationGate: true,
    activationStatus: "needs_explicit_capture_policy",
    recommendedFutureApprovalCopy: "Allow PresenceMonitor to sample the camera for ambient presence detection?",
    userSafeReason: "PresenceMonitor is an ambient camera capture surface and needs a dedicated explicit activation policy.",
  },
  {
    surfaceId: "screen_share",
    sourceComponent: "ScreenShare",
    captures: ["screen"],
    riskLevel: "high",
    canBypassVisualCoreGovernance: true,
    canInvokeTools: false,
    needsExplicitActivationGate: true,
    activationStatus: "needs_explicit_capture_policy",
    recommendedFutureApprovalCopy: "Allow ScreenShare to capture screen frames for this session?",
    userSafeReason: "ScreenShare captures screen frames and needs a dedicated explicit activation policy.",
  },
  {
    surfaceId: "vision_camera",
    sourceComponent: "VisionCameraModal",
    captures: ["camera"],
    riskLevel: "high",
    canBypassVisualCoreGovernance: true,
    canInvokeTools: true,
    needsExplicitActivationGate: true,
    activationStatus: "blocked_until_dedicated_policy",
    recommendedFutureApprovalCopy: "Allow VisionCameraModal to capture/analyze camera frames for this request?",
    userSafeReason: "VisionCameraModal captures camera frames and can invoke analysis, so it stays blocked until a dedicated capture policy exists.",
  },
  {
    surfaceId: "desktop_stream",
    sourceComponent: "DesktopStreamModal",
    captures: ["screen", "desktop_stream"],
    riskLevel: "high",
    canBypassVisualCoreGovernance: true,
    canInvokeTools: false,
    needsExplicitActivationGate: true,
    activationStatus: "blocked_until_dedicated_policy",
    recommendedFutureApprovalCopy: "Allow DesktopStreamModal to stream the desktop target for this session?",
    userSafeReason: "DesktopStreamModal can expose a desktop stream and stays blocked until a dedicated capture policy exists.",
  },
  {
    surfaceId: "luca_recorder",
    sourceComponent: "LucaRecorder",
    captures: ["screen", "audio", "recording"],
    riskLevel: "critical",
    canBypassVisualCoreGovernance: true,
    canInvokeTools: true,
    needsExplicitActivationGate: true,
    activationStatus: "blocked_until_dedicated_policy",
    recommendedFutureApprovalCopy: "Allow LucaRecorder to record this session and create an imprint?",
    userSafeReason: "LucaRecorder records media and creates skill/imprint artifacts, so it stays blocked until a dedicated capture policy exists.",
  },
];

export function listOverlayCaptureSurfacePolicies(): OverlayCaptureSurfacePolicy[] {
  return [...POLICIES];
}

export function getOverlayCaptureSurfacePolicy(
  surfaceId: OverlayCaptureSurfaceId,
): OverlayCaptureSurfacePolicy {
  const policy = POLICIES.find((entry) => entry.surfaceId === surfaceId);
  if (!policy) throw new Error(`Unknown overlay capture surface: ${surfaceId}`);
  return policy;
}

export function getOverlayCaptureGateDecision(
  surfaceId: OverlayCaptureSurfaceId,
) {
  const policy = getOverlayCaptureSurfacePolicy(surfaceId);
  return {
    surfaceId,
    status: policy.activationStatus,
    allowed: false as const,
    blockedBy: [policy.activationStatus],
    userSafeReason: policy.userSafeReason,
  };
}

export function getOverlayCaptureGovernanceSummary() {
  const policies = listOverlayCaptureSurfacePolicies();
  return {
    totalSurfaces: policies.length,
    mappedSurfaces: policies.map((policy) => policy.surfaceId),
    captureBypassSurfaces: policies
      .filter((policy) => policy.canBypassVisualCoreGovernance)
      .map((policy) => policy.surfaceId),
    toolLinkedSurfaces: policies
      .filter((policy) => policy.canInvokeTools)
      .map((policy) => policy.surfaceId),
    explicitGateRequiredSurfaces: policies
      .filter((policy) => policy.needsExplicitActivationGate)
      .map((policy) => policy.surfaceId),
  };
}

export function assertKnownOverlayCaptureSurfaceMap(): boolean {
  const mapped = listOverlayCaptureSurfacePolicies().map((policy) => policy.surfaceId).sort();
  return JSON.stringify(mapped) === JSON.stringify([...OVERLAY_CAPTURE_SURFACE_IDS].sort());
}
