import {
  HfRealtimeVoiceRuntime,
  type HfRealtimeVoiceRuntimeOptions,
} from "./HfRealtimeVoiceRuntime";

export function createHfRealtimeVoiceRuntime(options: HfRealtimeVoiceRuntimeOptions) {
  const runtime = new HfRealtimeVoiceRuntime(options);
  return {
    runtime,
    connect: runtime.connect.bind(runtime),
    disconnect: runtime.disconnect.bind(runtime),
    appendInputAudio: runtime.appendInputAudio.bind(runtime),
    sendText: runtime.sendText.bind(runtime),
    sendImage: runtime.sendImage.bind(runtime),
    sendToolResult: runtime.sendToolResult.bind(runtime),
    createResponse: runtime.createResponse.bind(runtime),
    cancelResponse: runtime.cancelResponse.bind(runtime),
    getSnapshot: runtime.getSnapshot.bind(runtime),
  };
}
