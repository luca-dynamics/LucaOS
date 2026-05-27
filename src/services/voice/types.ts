export type LucaVoiceMode = "text" | "voice";

export type LucaVoiceRuntimeStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "understanding"
  | "acting"
  | "speaking"
  | "confirming"
  | "error";

export type LucaVoiceProviderKind = "local" | "cloud" | "byok";

export interface LucaVoiceRuntimeMetadata {
  runtimeKind: "voice_scaffold";
  audioApisCalled: false;
  sttApisCalled: false;
  ttsApisCalled: false;
  systemApisCalled: false;
  heavyModelsLoaded: false;
  storageWritesEnabled: false;
  requiresExplicitOptIn: true;
}
export type LucaVoiceRuntimeEventType =
  | "voice_session_started"
  | "voice_session_stopped"
  | "voice_text_input_received"
  | "voice_transcript_received"
  | "voice_command_handled"
  | "voice_command_needs_confirmation"
  | "voice_command_rejected"
  | "voice_command_failed"
  | "voice_confirmation_requested"
  | "voice_confirmation_completed"
  | "voice_output_started"
  | "voice_output_completed"
  | "voice_output_interrupted";

export interface LucaVoiceSession {
  sessionId: string;
  mode: LucaVoiceMode;
  language: string;
  startedAt: string;
  lastActivityAt: string;
  metadata?: Record<string, unknown>;
}

export type LucaVoiceInputKind =
  | "audio_input"
  | "text_input"
  | "wake_word"
  | "push_to_talk";

export interface LucaVoiceInputEvent {
  kind: LucaVoiceInputKind;
  sessionId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceTranscriptEvent {
  transcript: string;
  language: string;
  confidence: number;
  isFinal: boolean;
  source: LucaVoiceProviderKind | "manual";
}

export interface LucaVoiceIntentContext {
  screen?: string;
  onboardingStep?: string;
  dashboardPanel?: string;
  activeTool?: string;
  missionId?: string;
  stepId?: string;
}

export interface LucaVoiceIntentEvent {
  intent: string;
  commandText: string;
  confidence: number;
  context: LucaVoiceIntentContext;
}

export type LucaVoiceCommandStatus =
  | "handled"
  | "needs_confirmation"
  | "rejected"
  | "failed";

export interface LucaVoiceCommandResult {
  status: LucaVoiceCommandStatus;
  spokenResponse?: string;
  textResponse?: string;
  action?: string;
  reason?: string;
  metadata: LucaVoiceRuntimeMetadata & Record<string, unknown>;
}

export type LucaVoiceOutputKind =
  | "tts_started"
  | "tts_chunk"
  | "tts_completed"
  | "tts_interrupted";

export interface LucaVoiceOutputEvent {
  kind: LucaVoiceOutputKind;
  text: string;
  voiceId?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export type LucaVoiceRiskLevel = "low" | "medium" | "high" | "critical";

export interface LucaVoiceSafetyConfirmation {
  confirmationId: string;
  riskLevel: LucaVoiceRiskLevel;
  prompt: string;
  requiredPhrase?: string;
  confirmed: boolean;
  reason: string;
}

export interface LucaVoiceTapeEvent {
  eventType: string;
  sessionId: string;
  missionId?: string;
  stepId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceTapeRecord {
  eventType: LucaVoiceRuntimeEventType;
  sessionId: string;
  timestamp: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceTapeSinkSnapshot {
  sessionId?: string;
  totalRecords: number;
  records: LucaVoiceTapeRecord[];
}

export interface LucaVoiceTapeSink {
  record(record: LucaVoiceTapeRecord): void;
  listRecords(sessionId?: string): LucaVoiceTapeRecord[];
  getSnapshot(sessionId?: string): LucaVoiceTapeSinkSnapshot;
  reset(): void;
}

export interface LucaVoiceRuntimeEventBridgeResult {
  ok: boolean;
  error?: string;
}

export interface LucaVoiceRuntimeRecordingOptions {
  enabled?: boolean;
  sink?: LucaVoiceTapeSink;
}

export interface LucaSTTTranscribeInput {
  sessionId: string;
  language?: string;
  audioChunkBase64?: string;
  textHint?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaSTTTranscribeResult {
  transcript: string;
  language: string;
  confidence: number;
  isFinal: boolean;
}

export interface LucaTTSynthesizeInput {
  sessionId: string;
  text: string;
  language?: string;
  voiceId?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaTTSynthesizeResult {
  outputEvent: LucaVoiceOutputEvent;
}

export interface LucaSTTBackendSnapshot {
  id: string;
  label: string;
  providerKind: LucaVoiceProviderKind;
  supportsStreaming: boolean;
  supportedLanguages: string[];
}

export interface LucaTTSBackendSnapshot extends LucaSTTBackendSnapshot {
  supportsVoiceClone: boolean;
  supportsEmotion: boolean;
}

export interface LucaSTTBackend {
  id: string;
  label: string;
  providerKind: LucaVoiceProviderKind;
  supportsStreaming: boolean;
  supportedLanguages: string[];
  transcribe(input: LucaSTTTranscribeInput): Promise<LucaSTTTranscribeResult>;
  getSnapshot(): LucaSTTBackendSnapshot;
}

export interface LucaTTSBackend {
  id: string;
  label: string;
  providerKind: LucaVoiceProviderKind;
  supportsStreaming: boolean;
  supportsVoiceClone: boolean;
  supportsEmotion: boolean;
  supportedLanguages: string[];
  synthesize(input: LucaTTSynthesizeInput): Promise<LucaTTSynthesizeResult>;
  getSnapshot(): LucaTTSBackendSnapshot;
}

export interface LucaSTTSelectRequest {
  language?: string;
  providerKind?: LucaVoiceProviderKind;
  backendId?: string;
}

export interface LucaTTSSelectRequest extends LucaSTTSelectRequest {
  requiresEmotion?: boolean;
  requiresVoiceClone?: boolean;
}

export interface LucaVoiceProviderRouterSnapshot {
  strategy: string;
  details?: Record<string, unknown>;
}

export interface LucaVoiceProviderRouter {
  selectSTTBackend(request: LucaSTTSelectRequest): LucaSTTBackend | undefined;
  selectTTSBackend(request: LucaTTSSelectRequest): LucaTTSBackend | undefined;
  getSnapshot(): LucaVoiceProviderRouterSnapshot;
}
