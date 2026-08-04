export interface SpeechRecognizerCallbacks {
  onPartialTranscript: (transcript: string) => void;
  onFinalTranscript: (transcript: string, confidence: number) => void;
  onError: (error: Error) => void;
}

export interface SpeechRecognizerCapabilities {
  supportsPartials: boolean;
  supportsWordTimestamps: boolean;
  supportsSpeakerDiarization: boolean;
  supportsConfidence: boolean;
  supportsLanguageDetection: boolean;
  supportsPunctuation: boolean;
  supportsRealtime: boolean;
  supportsOffline: boolean;
}

export interface STTPerformanceMetrics {
  partialCount: number;
  finalCount: number;
  avgPartialDelayMs: number;
  finalDelayMs: number;
  wordConfidence: number;
  droppedFrames: number;
  reconnectCount: number;
  silenceTimeoutMs: number;
  cancellationMs: number;
  networkLatencyMs: number;
  jitterMs: number;
  bufferUnderruns: number;
}

export interface StreamingSpeechRecognizer {
  id: string;
  name: string;
  capabilities: SpeechRecognizerCapabilities;
  connect(callbacks: SpeechRecognizerCallbacks): Promise<void>;
  pushAudio(pcmFrame: Float32Array | ArrayBuffer): void;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  isReady(): boolean;
  getMetrics(): STTPerformanceMetrics;
}
