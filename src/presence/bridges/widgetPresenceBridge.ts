import {
  fromWidgetUpdatePayload,
  toWidgetUpdatePayload,
  type LegacyPresencePayload,
} from "../presenceCompatibility";
import {
  getPresenceApprovalDisclosure,
  getPresenceSensorDisclosure,
} from "../presenceDisclosurePolicy";
import type { PresenceSnapshot } from "../presenceTypes";
import { createPresenceVoiceActivityEvent } from "../voice";

export type WidgetLegacyPayload = LegacyPresencePayload;

export interface WidgetDictationState {
  isListening: boolean;
  isSpeaking: boolean;
  amplitude: number;
  transcript: string;
  transcriptSource: "user" | "model";
  status: PresenceSnapshot["voice"]["status"];
}

export function createWidgetPresenceSnapshot(
  payload: WidgetLegacyPayload,
): PresenceSnapshot {
  return fromWidgetUpdatePayload(payload);
}

export function toWidgetUpdate(
  snapshot: PresenceSnapshot,
  legacyPayload: WidgetLegacyPayload = {},
): WidgetLegacyPayload {
  return {
    ...legacyPayload,
    ...toWidgetUpdatePayload(snapshot),
  };
}

export function getWidgetDictationState(
  snapshot: PresenceSnapshot,
): WidgetDictationState {
  const voice = createPresenceVoiceActivityEvent(snapshot.voice);
  return {
    transcript: voice.transcript ?? "",
    transcriptSource: voice.transcriptSource as WidgetDictationState["transcriptSource"],
    isListening: voice.isListening ?? false,
    isSpeaking: voice.isSpeaking ?? false,
    amplitude: voice.amplitude ?? 0,
    status: voice.status as WidgetDictationState["status"],
  };
}

export function getWidgetDisclosureState(snapshot: PresenceSnapshot) {
  return {
    microphone: getPresenceSensorDisclosure("microphone", snapshot.sensors.microphone),
    screen: getPresenceSensorDisclosure("screen", snapshot.sensors.screen),
    approval: getPresenceApprovalDisclosure(snapshot.approval),
  };
}
