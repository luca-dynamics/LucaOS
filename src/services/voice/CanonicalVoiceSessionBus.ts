import type { RealtimeVoiceSessionController } from "./RealtimeVoiceSessionController";
import { realtimeVoiceUiBridge } from "./realtimeVoiceUiBridge";

export type CanonicalVoiceRoute = "cloud_bidi" | "hybrid" | "local_realtime";
export type CanonicalVoiceSessionEvent =
  | { type: "session.connected"; route: CanonicalVoiceRoute; sessionId?: string }
  | { type: "session.disconnected"; route: CanonicalVoiceRoute; reason?: string }
  | { type: "speech.started" | "speech.stopped"; route: CanonicalVoiceRoute }
  | { type: "transcript.partial" | "transcript.final" | "response.text.delta"; route: CanonicalVoiceRoute; text: string }
  | { type: "response.audio.started" | "response.audio.completed"; route: CanonicalVoiceRoute }
  | { type: "response.cancelled"; route: CanonicalVoiceRoute; reason?: string }
  | { type: "tool.requested" | "tool.completed"; route: CanonicalVoiceRoute; name: string; callId?: string }
  | { type: "session.error"; route: CanonicalVoiceRoute; error: string };

export type CanonicalVoiceSessionListener = (
  event: CanonicalVoiceSessionEvent,
  state: ReturnType<RealtimeVoiceSessionController["getSnapshot"]>,
) => void;

export class CanonicalVoiceSessionBus {
  private listeners = new Set<CanonicalVoiceSessionListener>();
  private responseText = "";

  constructor(readonly controller: RealtimeVoiceSessionController = realtimeVoiceUiBridge.controller) {}

  publish(event: CanonicalVoiceSessionEvent): void {
    const metadata = { route: event.route, canonicalEvent: event.type };
    switch (event.type) {
      case "session.connected": this.responseText = ""; this.controller.startSession({ sessionId: event.sessionId, metadata }); break;
      case "session.disconnected": this.controller.stopSession(event.reason); break;
      case "speech.started":
        if (this.controller.getState().isSpeaking) this.controller.detectBargeIn(metadata);
        this.controller.startListening();
        break;
      case "speech.stopped": this.controller.stopListening(); break;
      case "transcript.partial": this.controller.receivePartialTranscript(event.text, metadata); break;
      case "transcript.final": this.controller.receiveFinalTranscript(event.text, metadata); break;
      case "response.text.delta":
        this.responseText += event.text;
        this.controller.startSpeaking(this.responseText, metadata);
        break;
      case "response.audio.started":
        if (!this.controller.getState().isSpeaking) this.controller.startSpeaking(this.responseText, metadata);
        break;
      case "response.audio.completed": this.controller.completeSpeaking(metadata); this.responseText = ""; break;
      case "response.cancelled": this.controller.interrupt(event.reason); this.responseText = ""; break;
      case "tool.requested": this.controller.startThinking({ ...metadata, toolName: event.name, callId: event.callId }); break;
      case "tool.completed": this.controller.startThinking({ ...metadata, toolName: event.name, callId: event.callId, toolCompleted: true }); break;
      case "session.error": this.controller.failSession(event.error); break;
    }
    const state = this.controller.getSnapshot();
    this.listeners.forEach((listener) => listener(event, state));
  }

  subscribe(listener: CanonicalVoiceSessionListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getSnapshot() { return this.controller.getSnapshot(); }
}

export const canonicalVoiceSessionBus = new CanonicalVoiceSessionBus();
