import { RealtimeVoiceSessionController, RealtimeVoiceSessionControllerOptions } from "./RealtimeVoiceSessionController";

export function createRealtimeVoiceSessionController(options: RealtimeVoiceSessionControllerOptions = {}) {
  const controller = new RealtimeVoiceSessionController(options);
  return {
    controller,
    startSession: controller.startSession.bind(controller),
    stopSession: controller.stopSession.bind(controller),
    startListening: controller.startListening.bind(controller),
    receivePartialTranscript: controller.receivePartialTranscript.bind(controller),
    receiveFinalTranscript: controller.receiveFinalTranscript.bind(controller),
    startSpeaking: controller.startSpeaking.bind(controller),
    completeSpeaking: controller.completeSpeaking.bind(controller),
    interrupt: controller.interrupt.bind(controller),
    getState: controller.getState.bind(controller),
    getSnapshot: controller.getSnapshot.bind(controller),
    subscribe: controller.subscribe.bind(controller),
    reset: controller.reset.bind(controller),
  };
}
