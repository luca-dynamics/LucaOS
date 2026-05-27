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
export type LucaVoiceProviderPreference = LucaVoiceProviderKind | "auto";
export type LucaVoiceProviderAdapterKind =
  | "local_adapter"
  | "luca_prime_cloud_adapter"
  | "byok_adapter";


export interface LucaVoiceRealProviderFeatureFlags {
  enableRealLocalVoiceProvider?: boolean;
  enableRealLucaPrimeVoiceProvider?: boolean;
  enableRealByokVoiceProvider?: boolean;
  enableRealStt?: boolean;
  enableRealTts?: boolean;
  enableRealStreaming?: boolean;
  enableNetworkProviderCalls?: boolean;
  enableLocalModelLoading?: boolean;
}

export type LucaVoiceProviderReadinessStatus = "blocked" | "scaffold_only" | "ready";

export interface LucaVoiceProviderReadinessGate {
  gate: string;
  passed: boolean;
  reason: string;
}

export type LucaVoiceRealProviderAdapterKind =
  | "openai_compatible"
  | "elevenlabs_compatible"
  | "local_model"
  | "custom_byok";

export type LucaVoiceRealProviderAdapterStatus =
  | "disabled"
  | "blocked"
  | "ready"
  | "invocation_disabled";

export interface LucaVoiceRealProviderAdapterRequest {
  providerKind: "local" | "cloud" | "byok";
  capability: "stt" | "tts" | "streaming_stt" | "streaming_tts";
  adapterKind: LucaVoiceRealProviderAdapterKind;
  inputPlaceholder?: string;
  language?: string;
  voiceId?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceRealProviderAdapterResult {
  ok: boolean;
  status: LucaVoiceRealProviderAdapterStatus;
  selectedBackendId?: string;
  selectedProviderKind?: LucaVoiceProviderKind;
  reason?: string;
  outputPlaceholder?: string;
  metadata: {
    adapterKind: "voice_real_provider_adapter_shell";
    shellOnly: true;
    realProviderExecutionEnabled: false;
    audioApisCalled: false;
    microphoneApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    providerApisCalled: false;
    networkApisCalled: false;
    heavyModelsLoaded: false;
    systemApisCalled: false;
    requiresExplicitOptIn: true;
  } & Record<string, unknown>;
}

export interface LucaVoiceProviderReadinessResult {
  status: LucaVoiceProviderReadinessStatus;
  providerKind: LucaVoiceProviderKind;
  capability: "stt" | "tts" | "streaming_stt" | "streaming_tts";
  gates: LucaVoiceProviderReadinessGate[];
  metadata: {
    readinessKind: "voice_provider_readiness_scaffold";
    audioApisCalled: false;
    microphoneApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    providerApisCalled: false;
    networkApisCalled: false;
    heavyModelsLoaded: false;
    systemApisCalled: false;
    requiresExplicitOptIn: true;
  };
}

export interface LucaVoiceProviderAdapterMetadata {
  adapterKind: LucaVoiceProviderAdapterKind;
  providerKind: LucaVoiceProviderKind;
  audioApisCalled: false;
  microphoneApisCalled: false;
  sttApisCalled: false;
  ttsApisCalled: false;
  providerApisCalled: false;
  heavyModelsLoaded: false;
  systemApisCalled: false;
  requiresExplicitOptIn: true;
}

export interface LucaVoiceProviderAdapterSnapshot {
  adapterKind: LucaVoiceProviderAdapterKind;
  providerKind: LucaVoiceProviderKind;
  registeredBackends: string[];
  metadata: LucaVoiceProviderAdapterMetadata;
}

export type LucaVoiceProviderCapability =
  | "stt"
  | "tts"
  | "streaming_stt"
  | "streaming_tts"
  | "voice_clone"
  | "emotion"
  | "multilingual"
  | "low_latency";

export interface LucaVoiceProviderRouteRequest {
  capability: LucaVoiceProviderCapability;
  preference?: LucaVoiceProviderPreference;
  language?: string;
  requiresStreaming?: boolean;
  requiresVoiceClone?: boolean;
  requiresEmotion?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceProviderRouteResult {
  ok: boolean;
  selectedBackendId?: string;
  selectedProviderKind?: LucaVoiceProviderKind;
  reason?: string;
  fallbackUsed: boolean;
  metadata: {
    routerKind: "voice_provider_router_scaffold";
    audioApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    systemApisCalled: false;
    heavyModelsLoaded: false;
    requiresExplicitOptIn: true;
  } & Record<string, unknown>;
}

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

export interface LucaVoiceAudioApiMetadata {
  apiKind: "openai_compatible_audio_scaffold";
  httpServerStarted: false;
  audioApisCalled: false;
  microphoneApisCalled: false;
  sttApisCalled: false;
  ttsApisCalled: false;
  providerApisCalled: false;
  heavyModelsLoaded: false;
  systemApisCalled: false;
  requiresExplicitOptIn: true;
}

export interface LucaVoiceAudioSpeechRequest {
  model: string;
  input: string;
  voice?: string;
  response_format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  speed?: number;
  providerPreference?: LucaVoiceProviderPreference;
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceAudioSpeechResult {
  ok: boolean;
  requestId: string;
  selectedBackendId?: string;
  selectedProviderKind?: LucaVoiceProviderKind;
  audioPlaceholder?: string;
  reason?: string;
  metadata: LucaVoiceAudioApiMetadata;
}

export interface LucaVoiceAudioTranscriptionRequest {
  model?: string;
  filePlaceholder?: string;
  language?: string;
  prompt?: string;
  response_format?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  providerPreference?: LucaVoiceProviderPreference;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceAudioTranscriptionResult {
  ok: boolean;
  requestId: string;
  selectedBackendId?: string;
  selectedProviderKind?: LucaVoiceProviderKind;
  text?: string;
  segments?: Array<Record<string, unknown>>;
  reason?: string;
  metadata: LucaVoiceAudioApiMetadata;
}

export interface LucaVoiceAudioVoiceListResult {
  ok: boolean;
  voices: Array<Record<string, unknown>>;
  metadata: LucaVoiceAudioApiMetadata;
}

export type LucaVoiceOnboardingStep =
  | "welcome"
  | "name"
  | "theme"
  | "background_opacity"
  | "model_mode"
  | "local_model_scan"
  | "preferences"
  | "complete";

export interface LucaVoiceOnboardingCommand {
  step: LucaVoiceOnboardingStep;
  transcript: string;
  intent: string;
  value?: unknown;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface LucaVoiceOnboardingState {
  currentStep: LucaVoiceOnboardingStep;
  userName?: string;
  theme?: string;
  backgroundOpacity?: number;
  modelMode?: "luca_prime" | "local_models" | "byok";
  localModelScanRequested?: boolean;
  preferences?: string[];
  completed: boolean;
  metadata: {
    bridgeKind: "voice_onboarding_scaffold";
    audioApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    systemApisCalled: false;
    heavyModelsLoaded: false;
    requiresExplicitOptIn: true;
  };
}

export interface LucaVoiceOnboardingBridgeResult {
  status: "handled" | "needs_clarification" | "rejected" | "complete";
  state: LucaVoiceOnboardingState;
  spokenResponse: string;
  textResponse: string;
  metadata: LucaVoiceOnboardingState["metadata"];
}


export type LucaVoiceComputerUseConfirmationIntent = "approve" | "reject" | "unknown";

export interface LucaVoiceComputerUseConfirmationInput {
  transcript: string;
  confirmationId?: string;
  sessionId?: string;
  requiredPhrase?: string;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceComputerUseConfirmationResult {
  status: "approved" | "rejected" | "needs_clarification" | "failed";
  intent: LucaVoiceComputerUseConfirmationIntent;
  confirmationId?: string;
  approval?: Record<string, unknown>;
  spokenResponse: string;
  textResponse: string;
  reason?: string;
  metadata: {
    bridgeKind: "voice_computer_use_confirmation_scaffold";
    audioApisCalled: false;
    sttApisCalled: false;
    ttsApisCalled: false;
    systemApisCalled: false;
    directHostAllowed: false;
    browserApisCalled: false;
    requiresExplicitOptIn: true;
  } & Record<string, unknown>;
}

export interface LucaVoiceHudMetadata {
  bridgeKind: "voice_hud_scaffold";
  audioApisCalled: false;
  microphoneApisCalled: false;
  sttApisCalled: false;
  ttsApisCalled: false;
  systemApisCalled: false;
  heavyModelsLoaded: false;
  requiresExplicitOptIn: true;
}

export interface LucaVoiceHudState {
  visible: boolean;
  mode: LucaVoiceMode;
  status: LucaVoiceRuntimeStatus;
  activeSessionId?: string;
  detectedLanguage?: string;
  currentTranscript?: string;
  currentResponse?: string;
  activeCommand?: string;
  confirmationId?: string;
  error?: string;
  metadata: LucaVoiceHudMetadata;
}

export type LucaVoiceHudControl =
  | "show"
  | "hide"
  | "toggle"
  | "start_listening"
  | "stop_listening"
  | "set_text_mode"
  | "set_voice_mode"
  | "interrupt"
  | "clear";

export interface LucaVoiceHudControlResult {
  ok: boolean;
  state: LucaVoiceHudState;
  reason?: string;
  metadata: LucaVoiceHudMetadata;
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

export type LucaVoiceStreamKind = "stt" | "tts";

export type LucaVoiceStreamStatus =
  | "idle"
  | "opening"
  | "streaming"
  | "paused"
  | "completed"
  | "interrupted"
  | "failed";

export interface LucaVoiceStreamChunk {
  streamId: string;
  kind: LucaVoiceStreamKind;
  sequence: number;
  text?: string;
  audioChunk?: string;
  isFinal?: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LucaVoiceStreamingSession {
  streamId: string;
  kind: LucaVoiceStreamKind;
  status: LucaVoiceStreamStatus;
  providerPreference?: LucaVoiceProviderPreference;
  selectedBackendId?: string;
  language?: string;
  startedAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

export interface LucaVoiceStreamingRuntimeMetadata {
  runtimeKind: "voice_streaming_scaffold";
  audioApisCalled: false;
  microphoneApisCalled: false;
  sttApisCalled: false;
  ttsApisCalled: false;
  websocketOpened: false;
  heavyModelsLoaded: false;
  systemApisCalled: false;
  requiresExplicitOptIn: true;
}
