import type { PresenceFocusPolicy, PresenceSource, PresenceSurface } from "./presenceTypes";

export type PresenceRequestKind = "voice" | "text" | "dashboard" | "control-center" | "recovery" | "debug";

export interface PresenceSurfaceRequest {
  source: PresenceSource;
  requestKind?: PresenceRequestKind;
  explicitTextInput?: boolean;
}

export type DashboardEscalationReason =
  | "explicit-dashboard"
  | "explicit-control-center"
  | "focus-required-approval"
  | "recovery"
  | "debug"
  | "fallback-failure"
  | "ordinary-request";

export function chooseDefaultSurfaceForWakeWord(
  request: PresenceSurfaceRequest = { source: "wake-word", requestKind: "voice" },
): PresenceSurface {
  if (request.requestKind === "text") return "miniChat";
  if (request.requestKind === "dashboard" || request.requestKind === "control-center") return "dashboard";
  return request.source === "wake-word" || request.source === "voice-shortcut" ? "hologram" : "miniChat";
}

export function shouldPreserveFocusForSurface(
  surface: PresenceSurface,
  options: { explicitTextInput?: boolean } = {},
): boolean {
  if (surface === "hologram" || surface === "widget") return true;
  if (surface === "miniChat") return !options.explicitTextInput;
  return false;
}

export function getFocusPolicyForSurface(
  surface: PresenceSurface,
  options: { explicitTextInput?: boolean } = {},
): PresenceFocusPolicy {
  if (surface === "dashboard") return "activate-dashboard";
  return shouldPreserveFocusForSurface(surface, options) ? "preserve" : "request-input";
}

export function shouldEscalateToDashboard(reason: DashboardEscalationReason): boolean {
  return reason !== "ordinary-request";
}

export function getFallbackSurface(
  failedSurface: PresenceSurface,
  options: { fallbackFailed?: boolean; explicitTextInput?: boolean } = {},
): PresenceSurface {
  if (options.fallbackFailed || failedSurface === "dashboard") return "dashboard";
  if (failedSurface === "hologram") return options.explicitTextInput ? "miniChat" : "widget";
  if (failedSurface === "widget") return "hologram";
  return "hologram";
}
