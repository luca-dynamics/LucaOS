import type { PresenceRuntimeState, PresenceSnapshot } from "./presenceTypes";

const hiddenSurfaces = () => ({
  miniChat: "hidden" as const,
  hologram: "hidden" as const,
  widget: "hidden" as const,
  dashboard: "hidden" as const,
});

export const defaultPresenceRuntimeState: PresenceRuntimeState = {
  schemaVersion: 1,
  revision: 0,
  visibility: {
    activeSurface: null,
    surfaces: hiddenSurfaces(),
    lastSource: null,
  },
  voice: {
    status: "idle",
    isListening: false,
    isVadActive: false,
    isSpeaking: false,
    amplitude: 0,
    transcript: "",
    transcriptSource: "user",
  },
  sensors: {
    microphone: "unavailable",
    camera: "unavailable",
    screen: "unavailable",
  },
  approval: {
    status: "none",
    prompt: null,
  },
  persona: "ASSISTANT",
  intent: null,
  lastEventId: null,
  lastUpdatedAt: null,
};

export function createPresenceSnapshot(
  state: PresenceRuntimeState = defaultPresenceRuntimeState,
): PresenceSnapshot {
  const { lastEventId: _lastEventId, lastUpdatedAt: _lastUpdatedAt, ...snapshot } = state;
  return JSON.parse(JSON.stringify(snapshot)) as PresenceSnapshot;
}

export function serializePresenceSnapshot(snapshot: PresenceSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializePresenceSnapshot(serialized: string): PresenceSnapshot {
  const parsed = JSON.parse(serialized) as Partial<PresenceSnapshot>;
  if (parsed.schemaVersion !== 1 || typeof parsed.revision !== "number") {
    throw new Error("Unsupported Presence snapshot");
  }
  return parsed as PresenceSnapshot;
}
