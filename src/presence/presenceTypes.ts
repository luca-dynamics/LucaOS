export type PresenceSurface = "miniChat" | "hologram" | "widget" | "dashboard";

export type PresenceSource =
  | "wake-word"
  | "voice-shortcut"
  | "tray"
  | "manual"
  | "luca-link"
  | "system";

export type PresenceVisibility = "hidden" | "summoning" | "visible" | "dismissing" | "failed";

export interface PresenceVisibilityState {
  activeSurface: PresenceSurface | null;
  surfaces: Record<PresenceSurface, PresenceVisibility>;
  lastSource: PresenceSource | null;
  lastReason?: string;
}

export type PresenceVoiceStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface PresenceVoiceState {
  status: PresenceVoiceStatus;
  isListening: boolean;
  isSpeaking: boolean;
  amplitude: number;
  transcript: string;
  transcriptSource: "user" | "model";
}

export type PresenceSensorKind = "microphone" | "camera" | "screen";
export type PresenceCapabilityStatus = "unavailable" | "available" | "requesting" | "active" | "blocked" | "error";

export interface PresenceSensorState {
  microphone: PresenceCapabilityStatus;
  camera: PresenceCapabilityStatus;
  screen: PresenceCapabilityStatus;
}

export type PresenceApprovalStatus = "none" | "pending" | "approved" | "denied" | "expired";

export interface PresenceApprovalPrompt {
  requestId: string;
  summary: string;
  requiresFocus: boolean;
  riskLevel?: "low" | "medium" | "high" | "critical";
}

export interface PresenceApprovalState {
  status: PresenceApprovalStatus;
  prompt: PresenceApprovalPrompt | null;
}

export type PresenceFocusPolicy = "preserve" | "request-input" | "activate-dashboard" | "native-required";
export type PresenceDisclosureLevel = "none" | "ambient" | "active" | "protected";

export interface PresenceElevationState {
  lastScanTimestamp?: number;
  authorizedMissionIds: string[];
  activeMissionScope?: string;
}

export interface PresenceSnapshot {
  schemaVersion: 1;
  revision: number;
  visibility: PresenceVisibilityState;
  voice: PresenceVoiceState;
  sensors: PresenceSensorState;
  approval: PresenceApprovalState;
  persona: string;
  themeHex?: string;
  intent: string | null;
  elevationState?: PresenceElevationState;
}

export interface PresenceRuntimeState extends PresenceSnapshot {
  lastEventId: string | null;
  lastUpdatedAt: number | null;
}
