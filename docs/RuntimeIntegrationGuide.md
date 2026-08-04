# Runtime Integration Guide & Provider Adapter Contract

**Status:** Official Platform Integration Specification  
**Version:** 1.0.0  
**Target Package:** `@luca/platform-runtime` & `@luca/conversation-engine`  

---

## 🏛️ Standard Adapter Lifecycle

Every production runtime adapter (STT, LLM, TTS, MCP) must implement the standard 5-phase lifecycle:

```text
  initialize() ──► start() ──► stream() / execute() ──► cancel() / stop() ──► dispose()
```

---

## 📋 Provider Integration Rules

### 1. STT Provider Contract (Streaming Speech-to-Text)
```ts
export interface STTProviderAdapter {
  id: string;
  initialize(): Promise<void>;
  startStream(): Promise<void>;
  onPartialTranscript(callback: (text: string) => void): void;
  onFinalTranscript(callback: (text: string, confidence: number) => void): void;
  stopStream(): Promise<void>;
}
```

### 2. LLM Provider Contract (Streaming Language Model)
```ts
export interface LLMProviderAdapter {
  id: string;
  streamTokens(
    prompt: string,
    onToken: (token: string) => void,
    onComplete: (fullText: string) => void,
    onError: (err: Error) => void
  ): Promise<void>;
  cancel(): void;
}
```

### 3. TTS Provider Contract (Streaming Text-to-Speech)
```ts
export interface TTSProviderAdapter {
  id: string;
  streamAudio(
    textStream: AsyncIterable<string>,
    onAudioChunk: (chunk: ArrayBuffer) => void,
    onPlaybackStarted: () => void,
    onPlaybackEnded: () => void
  ): Promise<void>;
  stopPlaybackImmediately(): void; // Instant barge-in cancellation
}
```

### 4. Error Mapping & Telemetry
* All provider errors must be wrapped in `ModelProviderError` or `ToolExecutionError` from `@luca/protocol`.
* Every invocation must emit telemetry duration events with `ConversationID` and `TurnID`.
