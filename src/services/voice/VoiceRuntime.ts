import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import {
  LucaVoiceCommandResult,
  LucaVoiceMode,
  LucaVoiceRuntimeMetadata,
  LucaVoiceRuntimeStatus,
  LucaVoiceSafetyConfirmation,
  LucaVoiceSession,
  LucaVoiceTranscriptEvent,
} from "./types";

export interface VoiceRuntimeState {
  status: LucaVoiceRuntimeStatus;
  session?: LucaVoiceSession;
  pendingConfirmation?: LucaVoiceSafetyConfirmation;
  metadata: LucaVoiceRuntimeMetadata;
}

export interface VoiceRuntimeOptions {
  defaultLanguage?: string;
  defaultMode?: LucaVoiceMode;
}

const defaultMetadata: LucaVoiceRuntimeMetadata = {
  runtimeKind: "voice_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
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

    return session;
  }

  stopSession(): void {
    this.state = {
      ...this.state,
      status: "idle",
      session: undefined,
      pendingConfirmation: undefined,
    };
  }

  handleTextInput(input: { text: string; sessionId?: string; metadata?: Record<string, unknown> }): LucaVoiceCommandResult {
    return this.processCommandText(input.text, input.sessionId, input.metadata);
  }

  handleTranscript(input: LucaVoiceTranscriptEvent & { sessionId?: string; metadata?: Record<string, unknown> }): LucaVoiceCommandResult {
    return this.processCommandText(input.transcript, input.sessionId, input.metadata);
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
    return confirmation;
  }

  confirmAction(input: { confirmationId: string; phrase?: string; confirmed: boolean }): LucaVoiceCommandResult {
    const pending = this.state.pendingConfirmation;
    if (!pending || pending.confirmationId !== input.confirmationId) {
      return this.makeResult("failed", "No matching pending confirmation.");
    }

    if (!input.confirmed) {
      this.state = { ...this.state, status: "idle", pendingConfirmation: undefined };
      return this.makeResult("rejected", "Action was not confirmed.");
    }

    if (pending.requiredPhrase && pending.requiredPhrase !== input.phrase) {
      return this.makeResult("failed", "Required confirmation phrase mismatch.");
    }

    this.state = { ...this.state, status: "acting", pendingConfirmation: undefined };
    return this.makeResult("handled", "Confirmation accepted. Scaffold action marked handled.");
  }

  reset(): void {
    this.registry.reset();
    this.state = { status: "idle", metadata: defaultMetadata };
  }

  private processCommandText(text: string, sessionId?: string, metadata?: Record<string, unknown>): LucaVoiceCommandResult {
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

      return this.makeResult("needs_confirmation", "Confirmation required before executing action.", {
        confirmationId: confirmation.confirmationId,
      });
    }

    this.state = { ...this.state, status: "acting" };
    return this.makeResult("handled", "Scaffold command accepted.", {
      commandText: text,
      commandPath: "shared_scaffold_command_path",
    });
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
