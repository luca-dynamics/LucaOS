import {
  fromWidgetUpdatePayload,
  toHologramUpdatePayload,
  type LegacyPresencePayload,
} from "../presenceCompatibility";
import {
  getPresenceApprovalDisclosure,
  getPresenceSensorDisclosure,
} from "../presenceDisclosurePolicy";
import type { PresenceSnapshot } from "../presenceTypes";
import { createPresenceVoiceActivityEvent } from "../voice";

export interface HologramLegacyPayload extends LegacyPresencePayload {
  presenceSource?: unknown;
}

export interface HologramVoiceDisplayState {
  transcript: string;
  transcriptSource: "user" | "model";
  isListening: boolean;
  isSpeaking: boolean;
  amplitude: number;
  status: PresenceSnapshot["voice"]["status"];
}

export function createHologramPresenceSnapshot(
  payload: HologramLegacyPayload,
): PresenceSnapshot {
  return fromWidgetUpdatePayload(payload);
}

export function toHologramUpdate(
  snapshot: PresenceSnapshot,
  legacyPayload: HologramLegacyPayload = {},
): HologramLegacyPayload {
  return {
    ...legacyPayload,
    ...toHologramUpdatePayload(snapshot),
  };
}

export function getHologramVoiceDisplayState(
  snapshot: PresenceSnapshot,
): HologramVoiceDisplayState {
  const voice = createPresenceVoiceActivityEvent(snapshot.voice);
  return {
    transcript: voice.transcript ?? "",
    transcriptSource: voice.transcriptSource as HologramVoiceDisplayState["transcriptSource"],
    isListening: voice.isListening ?? false,
    isSpeaking: voice.isSpeaking ?? false,
    amplitude: voice.amplitude ?? 0,
    status: voice.status as HologramVoiceDisplayState["status"],
  };
}

export function getHologramDisclosureState(snapshot: PresenceSnapshot) {
  return {
    microphone: getPresenceSensorDisclosure("microphone", snapshot.sensors.microphone),
    screen: getPresenceSensorDisclosure("screen", snapshot.sensors.screen),
    approval: getPresenceApprovalDisclosure(snapshot.approval),
  };
}
