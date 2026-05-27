import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  LucaVoiceCommandResult,
  LucaVoiceMode,
  LucaVoiceRuntimeMetadata,
  LucaVoiceRuntimeStatus,
  LucaVoiceSafetyConfirmation,
  LucaVoiceSession,
  LucaVoiceRuntimeRecordingOptions,
  LucaVoiceTranscriptEvent,
} from "./types";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

export interface VoiceRuntimeState {
  status: LucaVoiceRuntimeStatus;
  session?: LucaVoiceSession;
  pendingConfirmation?: LucaVoiceSafetyConfirmation;
  metadata: LucaVoiceRuntimeMetadata;
}

export interface VoiceRuntimeOptions {
  defaultLanguage?: string;
  defaultMode?: LucaVoiceMode;
  recording?: LucaVoiceRuntimeRecordingOptions;
}

const defaultMetadata: LucaVoiceRuntimeMetadata = {
  runtimeKind: "voice_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  storageWritesEnabled: false,
  requiresExplicitOptIn: true,
};

export class VoiceRuntime {
  private state: VoiceRuntimeState = {
    status: "idle",
    metadata: defaultMetadata,
  };

  constructor(
    private readonly registry: VoiceBackendRegistry,
    private readonly options: VoiceRuntimeOptions = {},
    private readonly bridge?: VoiceRuntimeEventBridge,
  ) {}

  getState(): VoiceRuntimeState {
    return {
      ...this.state,
      session: this.state.session ? { ...this.state.session } : undefined,
      pendingConfirmation: this.state.pendingConfirmation
        ? { ...this.state.pendingConfirmation }
        : undefined,
      metadata: { ...this.state.metadata },
    };
  }

  startSession(params?: { mode?: LucaVoiceMode; language?: string; metadata?: Record<string, unknown> }): LucaVoiceSession {
    const now = new Date().toISOString();
    const session: LucaVoiceSession = {
      sessionId: `voice-session-${Date.now()}`,
      mode: params?.mode ?? this.options.defaultMode ?? "voice",
      language: params?.language ?? this.options.defaultLanguage ?? "en",
      startedAt: now,
      lastActivityAt: now,
      metadata: params?.metadata,
    };

    this.state = {
      ...this.state,
      status: "listening",
      session,
      pendingConfirmation: undefined,
    };
    if (this.options.recording?.enabled !== false) {
      this.bridge?.recordSessionStarted(session);
    }

    return session;
  }

  stopSession(): void {
    const currentSession = this.state.session;
    this.state = {
      ...this.state,
      status: "idle",
      session: undefined,
      pendingConfirmation: undefined,
    };
    if (currentSession && this.options.recording?.enabled !== false) {
      this.bridge?.recordSessionStopped(currentSession);
    }
  }

  handleTextInput(input: { text: string; sessionId?: string; metadata?: Record<string, unknown> }): LucaVoiceCommandResult {
    if (this.options.recording?.enabled !== false) {
      this.bridge?.recordTextInput({
        kind: "text_input",
        sessionId: input.sessionId ?? this.state.session?.sessionId ?? "unknown",
        timestamp: new Date().toISOString(),
        metadata: input.metadata,
      });
    }
    return this.processCommandText(input.text, input.sessionId, input.metadata, "text_input");
  }

  handleTranscript(input: LucaVoiceTranscriptEvent & { sessionId?: string; metadata?: Record<string, unknown> }): LucaVoiceCommandResult {
    if (this.options.recording?.enabled !== false) {
      this.bridge?.recordTranscript(input);
    }
    return this.processCommandText(input.transcript, input.sessionId, input.metadata, "transcript");
  }

  requestConfirmation(input: { prompt: string; reason: string; riskLevel?: LucaVoiceSafetyConfirmation["riskLevel"]; requiredPhrase?: string }): LucaVoiceSafetyConfirmation {
    const confirmation: LucaVoiceSafetyConfirmation = {
      confirmationId: `confirm-${Date.now()}`,
      riskLevel: input.riskLevel ?? "medium",
      prompt: input.prompt,
      requiredPhrase: input.requiredPhrase,
      confirmed: false,
      reason: input.reason,
    };

    this.state = { ...this.state, status: "confirming", pendingConfirmation: confirmation };
    if (this.options.recording?.enabled !== false) {
      this.bridge?.recordConfirmationRequested(confirmation, { sessionId: this.state.session?.sessionId });
    }
    return confirmation;
  }

  confirmAction(input: { confirmationId: string; phrase?: string; confirmed: boolean }): LucaVoiceCommandResult {
    const pending = this.state.pendingConfirmation;
    if (!pending || pending.confirmationId !== input.confirmationId) {
      const failed = this.makeResult("failed", "No matching pending confirmation.");
      if (this.options.recording?.enabled !== false) {
        this.bridge?.recordConfirmationCompleted(failed, { sessionId: this.state.session?.sessionId, confirmationId: input.confirmationId });
      }
      return failed;
    }

    if (!input.confirmed) {
      this.state = { ...this.state, status: "idle", pendingConfirmation: undefined };
      const rejected = this.makeResult("rejected", "Action was not confirmed.");
      if (this.options.recording?.enabled !== false) {
        this.bridge?.recordConfirmationCompleted(rejected, { sessionId: this.state.session?.sessionId, confirmationId: input.confirmationId });
      }
      return rejected;
    }

    if (pending.requiredPhrase && pending.requiredPhrase !== input.phrase) {
      const failed = this.makeResult("failed", "Required confirmation phrase mismatch.");
      if (this.options.recording?.enabled !== false) {
        this.bridge?.recordConfirmationCompleted(failed, { sessionId: this.state.session?.sessionId, confirmationId: input.confirmationId });
      }
      return failed;
    }

    this.state = { ...this.state, status: "acting", pendingConfirmation: undefined };
    const handled = this.makeResult("handled", "Confirmation accepted. Scaffold action marked handled.");
    if (this.options.recording?.enabled !== false) {
      this.bridge?.recordConfirmationCompleted(handled, { sessionId: this.state.session?.sessionId, confirmationId: input.confirmationId });
    }
    return handled;
  }

  reset(): void {
    this.registry.reset();
    if (this.options.recording?.enabled !== false) {
      this.options.recording?.sink?.reset();
    }
    this.state = { status: "idle", metadata: defaultMetadata };
  }

  private processCommandText(text: string, sessionId?: string, metadata?: Record<string, unknown>, source?: string): LucaVoiceCommandResult {
    const now = new Date().toISOString();
    if (this.state.session) {
      this.state = {
        ...this.state,
        status: "understanding",
        session: {
          ...this.state.session,
          sessionId: sessionId ?? this.state.session.sessionId,
          lastActivityAt: now,
          metadata: { ...this.state.session.metadata, ...metadata },
        },
      };
    }

    const normalized = text.trim().toLowerCase();
    if (normalized.includes("delete") || normalized.includes("shutdown") || normalized.includes("wipe")) {
      const confirmation = this.requestConfirmation({
        prompt: "This action may be risky. Please confirm to continue.",
        reason: `Risk keyword detected in command: ${text}`,
        riskLevel: "high",
      });

      const result = this.makeResult("needs_confirmation", "Confirmation required before executing action.", {
        confirmationId: confirmation.confirmationId,
      });
      if (this.options.recording?.enabled !== false) {
        this.bridge?.recordCommandResult(result, { sessionId: sessionId ?? this.state.session?.sessionId, source });
      }
      return result;
    }

    this.state = { ...this.state, status: "acting" };
    const result = this.makeResult("handled", "Scaffold command accepted.", {
      commandText: text,
      commandPath: "shared_scaffold_command_path",
    });
    if (this.options.recording?.enabled !== false) {
      this.bridge?.recordCommandResult(result, { sessionId: sessionId ?? this.state.session?.sessionId, source });
    }
    return result;
  }

  private makeResult(status: LucaVoiceCommandResult["status"], textResponse: string, extras: Record<string, unknown> = {}): LucaVoiceCommandResult {
    return {
      status,
      textResponse,
      spokenResponse: textResponse,
      metadata: {
        ...defaultMetadata,
        ...extras,
      },
    };
  }
}
