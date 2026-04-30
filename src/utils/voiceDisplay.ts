import type { VoiceSessionRoute } from "../services/voiceSessionRouter";

export const getVoiceRouteLabel = (
  routeKind: VoiceSessionRoute["kind"] | null,
): string => {
  switch (routeKind) {
    case "CLOUD_BIDI":
      return "Cloud Voice";
    case "LOCAL_PIPELINE":
      return "Local Voice";
    case "HYBRID_PIPELINE":
      return "Hybrid Voice";
    default:
      return "Voice";
  }
};

export const getFriendlyVoiceStatus = (
  status: string | null | undefined,
  routeKind: VoiceSessionRoute["kind"] | null,
): string => {
  const routeLabel = getVoiceRouteLabel(routeKind);
  const normalized = (status || "").toUpperCase();

  switch (normalized) {
    case "IDLE":
      return `${routeLabel} is ready`;
    case "CONNECTING":
      return `Connecting ${routeLabel.toLowerCase()}...`;
    case "CONNECTED":
      return `${routeLabel} is active`;
    case "WORKING":
      return "Working on your request";
    case "DISCONNECTED":
      return `${routeLabel} is off`;
    case "ERROR":
      return `There was a problem starting ${routeLabel.toLowerCase()}`;
    case "UNSTABLE":
      return `${routeLabel} connection is unstable`;
    case "ROUTE_MISMATCH":
      return `${routeLabel} is switching to a compatible mode`;
    default:
      return status || `${routeLabel} is active`;
  }
};

export const getFriendlyVoiceModelLabel = (
  routeKind: VoiceSessionRoute["kind"] | null,
): string => {
  switch (routeKind) {
    case "CLOUD_BIDI":
      return "Cloud Voice";
    case "LOCAL_PIPELINE":
      return "Private Local Voice";
    case "HYBRID_PIPELINE":
      return "Smart Hybrid Voice";
    default:
      return "Voice";
  }
};

export const getFriendlyVoiceSpeedLabel = (
  latencyMs: number | null | undefined,
): string | null => {
  if (latencyMs == null || Number.isNaN(latencyMs) || latencyMs <= 0) {
    return null;
  }

  if (latencyMs <= 600) {
    return "Fast response";
  }

  if (latencyMs <= 1500) {
    return "Normal response";
  }

  return "Slower response";
};

export const getFriendlyLocalCoreLabel = (
  isLocalCoreConnected?: boolean,
  localCoreReadinessLevel?: "ready" | "limited" | "offline",
): string | null => {
  if (localCoreReadinessLevel === "limited") {
    return "Local core limited";
  }

  if (localCoreReadinessLevel === "ready") {
    return "Local core ready";
  }

  if (localCoreReadinessLevel === "offline") {
    return "Local core offline";
  }

  if (typeof isLocalCoreConnected !== "boolean") {
    return null;
  }

  return isLocalCoreConnected ? "Local core ready" : "Local core offline";
};

export const getFriendlyVoiceTelemetrySummary = ({
  latencyMs,
  isLocalCoreConnected,
  localCoreReadinessLevel,
}: {
  latencyMs?: number | null;
  isLocalCoreConnected?: boolean;
  localCoreReadinessLevel?: "ready" | "limited" | "offline";
}): string | null => {
  const parts = [
    getFriendlyVoiceSpeedLabel(latencyMs),
    getFriendlyLocalCoreLabel(isLocalCoreConnected, localCoreReadinessLevel),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : null;
};

export const getFriendlyAdaptiveVoiceNotice = (
  previousRouteKind: VoiceSessionRoute["kind"] | null,
  nextRouteKind: VoiceSessionRoute["kind"] | null,
): string | null => {
  if (!previousRouteKind || !nextRouteKind || previousRouteKind === nextRouteKind) {
    return null;
  }

  if (nextRouteKind === "LOCAL_PIPELINE") {
    return "Optimized voice mode selected for a faster response";
  }

  if (nextRouteKind === "HYBRID_PIPELINE") {
    return "Balanced voice mode selected for a smoother response";
  }

  if (nextRouteKind === "CLOUD_BIDI") {
    return "Premium voice mode selected for the next session";
  }

  return "Optimized voice mode selected";
};
