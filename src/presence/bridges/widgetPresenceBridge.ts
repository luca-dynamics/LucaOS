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
import { toWidgetDictationState } from "../voice";

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
  return toWidgetDictationState(snapshot.voice);
}

export function getWidgetDisclosureState(snapshot: PresenceSnapshot) {
  return {
    microphone: getPresenceSensorDisclosure("microphone", snapshot.sensors.microphone),
    screen: getPresenceSensorDisclosure("screen", snapshot.sensors.screen),
    approval: getPresenceApprovalDisclosure(snapshot.approval),
  };
}
