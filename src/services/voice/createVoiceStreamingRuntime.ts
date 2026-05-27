import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceStreamingRuntime } from "./VoiceStreamingRuntime";

export interface CreateVoiceStreamingRuntimeOptions {
  router?: VoiceProviderRouter;
  bridge?: VoiceRuntimeEventBridge;
}

export function createVoiceStreamingRuntime(options: CreateVoiceStreamingRuntimeOptions = {}) {
  const runtime = new VoiceStreamingRuntime(options.router, options.bridge);

  return {
    runtime,
    openStream: runtime.openStream.bind(runtime),
    pushChunk: runtime.pushChunk.bind(runtime),
    pauseStream: runtime.pauseStream.bind(runtime),
    completeStream: runtime.completeStream.bind(runtime),
    interruptStream: runtime.interruptStream.bind(runtime),
    failStream: runtime.failStream.bind(runtime),
    getSnapshot: runtime.getSnapshot.bind(runtime),
    reset: runtime.reset.bind(runtime),
  };
}
