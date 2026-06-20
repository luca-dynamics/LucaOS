// Presence intent model.
//
// One canonical set of intents for Luca's embodied presence, shared by the
// Presence orb, the edge-light, and any surface that needs to express "what is
// Luca doing right now" without a debug-console label. This mirrors the states
// already derived in VoiceStatusOrb, but as a typed, testable contract so every
// surface speaks the same language.

export type PresenceIntent =
  | "idle" // present, at rest
  | "listening" // capturing the operator's voice
  | "thinking" // routing / reasoning about an intent
  | "working" // acting on the operator's behalf
  | "speaking" // synthesizing a response
  | "attention" // needs the operator (approval / error)
  | "dormant"; // handed off to another body; not the active host

export const PRESENCE_INTENTS: PresenceIntent[] = [
  "idle",
  "listening",
  "thinking",
  "working",
  "speaking",
  "attention",
  "dormant",
];

const INTENT_ARIA_LABEL: Record<PresenceIntent, string> = {
  idle: "Luca is present and idle",
  listening: "Luca is listening",
  thinking: "Luca is thinking",
  working: "Luca is working on your behalf",
  speaking: "Luca is speaking",
  attention: "Luca needs your attention",
  dormant: "Luca is dormant on this device",
};

export const presenceAriaLabel = (intent: PresenceIntent): string =>
  INTENT_ARIA_LABEL[intent] ?? INTENT_ARIA_LABEL.idle;

export interface PresenceSignals {
  /** Voice activity detector reports the operator is speaking. */
  isVadActive?: boolean;
  /** TTS is currently producing audio. */
  isSpeaking?: boolean;
  /** Whose audio the current transcript belongs to. */
  transcriptSource?: "user" | "model";
  /** Smoothed amplitude, normalized to 0..1. */
  amplitude?: number;
  /** True when this device is not the active host body (LucaLink handoff). */
  isDormant?: boolean;
}

const SPEAKING_AMPLITUDE_THRESHOLD = 0.05;

const includesAny = (haystack: string, needles: string[]): boolean =>
  needles.some((needle) => haystack.includes(needle));

/**
 * Map a free-form runtime status string plus live voice signals onto a single
 * canonical PresenceIntent. Status text wins over signals so an explicit
 * "working"/"thinking"/error status is never masked by ambient mic noise.
 *
 * This intentionally mirrors the precedence in VoiceStatusOrb so the new
 * Presence can be a drop-in replacement without behavior drift.
 */
export const deriveIntentFromStatus = (
  statusMessage: string | null | undefined,
  signals: PresenceSignals = {},
): PresenceIntent => {
  if (signals.isDormant) return "dormant";

  const status = (statusMessage ?? "").toLowerCase();

  if (includesAny(status, ["error", "problem", "failed", "denied", "approve"])) {
    return "attention";
  }
  if (includesAny(status, ["working", "executing", "running"])) return "working";
  if (
    includesAny(status, ["thinking", "processing", "connecting", "starting", "routing"])
  ) {
    return "thinking";
  }
  if (signals.isVadActive) return "listening";

  const amplitude = signals.amplitude ?? 0;
  if (
    signals.transcriptSource === "model" &&
    (signals.isSpeaking || amplitude > SPEAKING_AMPLITUDE_THRESHOLD)
  ) {
    return "speaking";
  }

  return "idle";
};

/** Intents whose expression is amplitude-reactive (orb breathes with audio). */
export const isAudioReactiveIntent = (intent: PresenceIntent): boolean =>
  intent === "listening" || intent === "speaking";
