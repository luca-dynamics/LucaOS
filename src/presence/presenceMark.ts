import type { PresenceSnapshot } from "./presenceTypes";

/**
 * The presence mark is Luca's body at rest: one small light that tells the
 * user what Luca is doing without a word of text. These are the only states
 * it can express; everything the runtime knows must collapse into one of
 * them, in this priority order.
 */
export type PresenceMarkState =
  | "needs-you"
  | "acting"
  | "listening"
  | "speaking"
  | "thinking"
  | "idle";

export interface PresenceMarkContext {
  /**
   * True while Luca is operating the host (screen session, mission
   * execution, computer use). The snapshot has no single acting signal yet,
   * so the hosting surface supplies it.
   */
  acting?: boolean;
}

export function derivePresenceMarkState(
  snapshot: PresenceSnapshot,
  context: PresenceMarkContext = {},
): PresenceMarkState {
  const { voice, approval } = snapshot;
  if (approval.status === "pending" || voice.status === "error") {
    return "needs-you";
  }
  if (context.acting) return "acting";
  if (voice.status === "listening" || voice.isVadActive || voice.isListening) {
    return "listening";
  }
  if (voice.status === "speaking" || voice.isSpeaking) return "speaking";
  if (voice.status === "thinking") return "thinking";
  return "idle";
}

/**
 * The ephemeral caption under the mark. Empty string means show nothing —
 * idle is silent by design, and the mark itself carries the other states;
 * words appear only when they add something light cannot say.
 */
export function getPresenceMarkCaption(
  state: PresenceMarkState,
  snapshot: PresenceSnapshot,
): string {
  if (state === "needs-you") {
    if (snapshot.voice.status === "error") return "Something needs a look";
    return snapshot.approval.prompt?.title || "Waiting for your approval";
  }
  const transcript = snapshot.voice.transcript?.trim();
  if ((state === "listening" || state === "speaking") && transcript) {
    return transcript;
  }
  if (state === "listening") return "Listening";
  if (state === "thinking") return "Thinking…";
  if (state === "acting") return "Working";
  return "";
}
