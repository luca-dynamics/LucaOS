import type {
  PresenceApprovalState,
  PresenceSensorState,
  PresenceSource,
  PresenceSurface,
  PresenceVoiceState,
} from "./presenceTypes";

interface PresenceEventBase<TType extends string, TPayload = undefined> {
  type: TType;
  eventId: string;
  timestamp: number;
  source: PresenceSource;
  targetSurface?: PresenceSurface;
  reason?: string;
  payload?: TPayload;
}

export type PresenceSummonEvent = PresenceEventBase<"presence/summon", { preserveFocus?: boolean }> & {
  targetSurface: PresenceSurface;
};
export type PresenceDismissEvent = PresenceEventBase<"presence/dismiss"> & { targetSurface: PresenceSurface };
export type PresenceSurfaceReadyEvent = PresenceEventBase<"presence/surface-ready"> & { targetSurface: PresenceSurface };
export type PresenceSurfaceFailedEvent = PresenceEventBase<"presence/surface-failed", { error?: string }> & {
  targetSurface: PresenceSurface;
};
export type PresenceVoiceStateUpdatedEvent = PresenceEventBase<"voice/state-updated", Partial<PresenceVoiceState>>;
export type PresenceVoiceToggleRequestedEvent = PresenceEventBase<"voice/toggle-requested", { enabled?: boolean }>;
export type PresenceWakeWordDetectedEvent = PresenceEventBase<"wake-word/detected", { phrase?: string }>;
export type PresenceSensorStateUpdatedEvent = PresenceEventBase<"sensor/state-updated", Partial<PresenceSensorState>>;
export type PresenceApprovalPromptUpdatedEvent = PresenceEventBase<"approval/prompt-updated", PresenceApprovalState>;
export type PresenceLucaLinkStateSyncReceivedEvent = PresenceEventBase<"lucalink/state-sync-received", Record<string, unknown>>;
export type PresenceDashboardOpenRequestedEvent = PresenceEventBase<"dashboard/open-requested", {
  focusPolicy?: "activate-dashboard" | "native-required";
}> & { targetSurface?: "dashboard" };

export type PresenceEvent =
  | PresenceSummonEvent
  | PresenceDismissEvent
  | PresenceSurfaceReadyEvent
  | PresenceSurfaceFailedEvent
  | PresenceVoiceStateUpdatedEvent
  | PresenceVoiceToggleRequestedEvent
  | PresenceWakeWordDetectedEvent
  | PresenceSensorStateUpdatedEvent
  | PresenceApprovalPromptUpdatedEvent
  | PresenceLucaLinkStateSyncReceivedEvent
  | PresenceDashboardOpenRequestedEvent;
