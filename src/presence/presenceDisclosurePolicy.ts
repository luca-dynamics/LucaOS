import type {
  PresenceApprovalState,
  PresenceDisclosureLevel,
  PresenceSensorKind,
  PresenceSensorState,
  PresenceSurface,
} from "./presenceTypes";
import { createPresenceSensorDisclosure } from "./sensors";

const SURFACE_LABELS: Record<PresenceSurface, string> = {
  miniChat: "Luca Presence",
  hologram: "Voice Presence",
  widget: "Luca Presence",
  dashboard: "Control Center",
};

export function getPresenceSurfaceLabel(surface: PresenceSurface): string {
  return SURFACE_LABELS[surface];
}

export function getPresenceSensorDisclosure(
  sensor: PresenceSensorKind,
  status: PresenceSensorState[PresenceSensorKind],
): { label: string; level: PresenceDisclosureLevel } {
  const disclosure = createPresenceSensorDisclosure({ kind: sensor, status, active: status === "active" }, sensor);
  const label = disclosure.kind === "screen" ? "Screen Context" : disclosure.kind === "microphone" ? "Voice Presence" : "Device Awareness";
  const level: PresenceDisclosureLevel = disclosure.status === "active" ? "active" : disclosure.status === "requesting" ? "ambient" : "none";
  return { label, level };
}

export function getPresenceApprovalDisclosure(approval: PresenceApprovalState): {
  label: string;
  level: PresenceDisclosureLevel;
} {
  return {
    label: approval.status === "pending" ? "Protected Action" : "No Protected Action Pending",
    level: approval.status === "pending" ? "protected" : "none",
  };
}

export function getPresencePublicModeTerminology(): Record<string, string> {
  return {
    presence: "Luca Presence",
    voice: "Voice Presence",
    screen: "Screen Context",
    approval: "Protected Action",
    awareness: "Device Awareness",
    dashboard: "Control Center",
  };
}
