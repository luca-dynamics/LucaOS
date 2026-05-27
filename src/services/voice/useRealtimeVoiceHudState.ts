import { useEffect, useMemo, useState } from "react";
import { realtimeVoiceUiBridge } from "./realtimeVoiceUiBridge";

export const useRealtimeVoiceHudState = () => {
  const [sessionState, setSessionState] = useState(() => realtimeVoiceUiBridge.controller.getState());
  const [modeState, setModeState] = useState(() => realtimeVoiceUiBridge.modeBridge.getState());

  useEffect(() => {
    const unsubSession = realtimeVoiceUiBridge.controller.subscribe(setSessionState);
    const unsubMode = realtimeVoiceUiBridge.modeBridge.subscribe(setModeState);
    return () => {
      unsubSession();
      unsubMode();
    };
  }, []);

  return useMemo(() => ({
    mode: modeState.mode,
    status: sessionState.status,
    isListening: sessionState.isListening,
    isSpeaking: sessionState.isSpeaking,
    canInterrupt: sessionState.canInterrupt,
    activeSessionId: sessionState.sessionId,
    currentTranscript: sessionState.currentTranscript,
    currentResponse: sessionState.currentResponse,
    lastError: sessionState.lastError,
    startSession: realtimeVoiceUiBridge.controller.startSession.bind(realtimeVoiceUiBridge.controller),
    stopSession: realtimeVoiceUiBridge.controller.stopSession.bind(realtimeVoiceUiBridge.controller),
    startListening: realtimeVoiceUiBridge.controller.startListening.bind(realtimeVoiceUiBridge.controller),
    stopListening: realtimeVoiceUiBridge.controller.stopListening.bind(realtimeVoiceUiBridge.controller),
    interrupt: realtimeVoiceUiBridge.controller.interrupt.bind(realtimeVoiceUiBridge.controller),
    reset: realtimeVoiceUiBridge.controller.reset.bind(realtimeVoiceUiBridge.controller),
  }), [modeState.mode, sessionState]);
};
