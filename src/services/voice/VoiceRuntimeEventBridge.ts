import {
  LucaVoiceCommandResult,
  LucaVoiceInputEvent,
  LucaVoiceOutputEvent,
  LucaVoiceRuntimeEventBridgeResult,
  LucaVoiceSafetyConfirmation,
  LucaVoiceSession,
  LucaVoiceTapeRecord,
  LucaVoiceTapeSink,
  LucaVoiceTranscriptEvent,
} from "./types";

const redactedValue = "[REDACTED]";

export class VoiceRuntimeEventBridge {
  constructor(private readonly sink: LucaVoiceTapeSink) {}

  recordSessionStarted(session: LucaVoiceSession): LucaVoiceRuntimeEventBridgeResult {
    return this.record("voice_session_started", session.sessionId, session);
  }

  recordSessionStopped(session: LucaVoiceSession): LucaVoiceRuntimeEventBridgeResult {
    return this.record("voice_session_stopped", session.sessionId, session);
  }

  recordTextInput(input: LucaVoiceInputEvent): LucaVoiceRuntimeEventBridgeResult {
    return this.record("voice_text_input_received", input.sessionId, input);
  }

  recordTranscript(input: LucaVoiceTranscriptEvent & { sessionId?: string; metadata?: Record<string, unknown> }): LucaVoiceRuntimeEventBridgeResult {
    return this.record("voice_transcript_received", input.sessionId, input);
  }

  recordCommandResult(result: LucaVoiceCommandResult, context?: { sessionId?: string; source?: string }): LucaVoiceRuntimeEventBridgeResult {
    const eventTypeByStatus = {
      handled: "voice_command_handled",
      needs_confirmation: "voice_command_needs_confirmation",
      rejected: "voice_command_rejected",
      failed: "voice_command_failed",
    } as const;

    return this.record(eventTypeByStatus[result.status], context?.sessionId, {
      source: context?.source,
      result,
    });
  }

  recordConfirmationRequested(confirmation: LucaVoiceSafetyConfirmation, context?: { sessionId?: string }): LucaVoiceRuntimeEventBridgeResult {
    return this.record("voice_confirmation_requested", context?.sessionId, { confirmation });
  }

  recordConfirmationCompleted(result: LucaVoiceCommandResult, context?: { sessionId?: string; confirmationId?: string }): LucaVoiceRuntimeEventBridgeResult {
    return this.record("voice_confirmation_completed", context?.sessionId, {
      confirmationId: context?.confirmationId,
      result,
    });
  }

  recordOutputEvent(output: LucaVoiceOutputEvent, context?: { sessionId?: string }): LucaVoiceRuntimeEventBridgeResult {
    const eventTypeByOutput = {
      tts_started: "voice_output_started",
      tts_chunk: "voice_output_started",
      tts_completed: "voice_output_completed",
      tts_interrupted: "voice_output_interrupted",
    } as const;

    return this.record(eventTypeByOutput[output.kind], context?.sessionId, output);
  }

  private record(eventType: LucaVoiceTapeRecord["eventType"], sessionId: string | undefined, payload: Record<string, unknown>): LucaVoiceRuntimeEventBridgeResult {
    try {
      this.sink.record({
        eventType,
        sessionId: sessionId ?? "unknown",
        timestamp: new Date().toISOString(),
        payload: this.redactSensitiveFields(payload),
      });

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "unknown_recording_error",
      };
    }
  }

  private redactSensitiveFields(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactSensitiveFields(item));
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
        if (/password|secret|token|apiKey/i.test(key)) {
          return [key, redactedValue];
        }

        return [key, this.redactSensitiveFields(nestedValue)];
      });

      return Object.fromEntries(entries);
    }

    return value;
  }
}
