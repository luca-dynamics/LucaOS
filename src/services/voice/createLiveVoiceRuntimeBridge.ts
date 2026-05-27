import { LiveVoiceRuntimeBridge } from "./LiveVoiceRuntimeBridge";

export function createLiveVoiceRuntimeBridge() {
  const bridge = new LiveVoiceRuntimeBridge();
  return {
    bridge,
    syncFromLiveSession: bridge.syncFromLiveSession.bind(bridge),
    syncFromDiagnostics: bridge.syncFromDiagnostics.bind(bridge),
    syncFromVoiceHudProps: bridge.syncFromVoiceHudProps.bind(bridge),
    syncFromSettings: bridge.syncFromSettings.bind(bridge),
    getRealtimeState: bridge.getRealtimeState.bind(bridge),
    getSnapshot: bridge.getSnapshot.bind(bridge),
    reset: bridge.reset.bind(bridge),
  };
}
