import type { PresenceMarkState } from "./presenceMark";
import { PRESENCE_MARK_EVENT } from "./usePresenceMarkLiveState";

/**
 * Priority bus for the shell presence mark. Each runtime surface owns one
 * channel and reports only its own truth; the bus merges channels in the
 * mark's priority order and broadcasts a single state. This is what keeps
 * the light honest when several things are happening at once — speaking
 * while a task runs still reads as acting; listening always wins over
 * thinking. (needs-you is not a channel: it is derived from approvals by
 * usePresenceMarkLiveState and outranks everything broadcast here.)
 */

export type PresenceMarkChannel = "agent" | "mic" | "tts" | "chat";

const CHANNEL_PRIORITY: Array<{
  channel: PresenceMarkChannel;
  state: PresenceMarkState;
}> = [
  { channel: "agent", state: "acting" },
  { channel: "mic", state: "listening" },
  { channel: "tts", state: "speaking" },
  { channel: "chat", state: "thinking" },
];

const channels: Partial<Record<PresenceMarkChannel, boolean>> = {};
let lastBroadcast: PresenceMarkState | null = null;

function mergedState(): PresenceMarkState {
  for (const entry of CHANNEL_PRIORITY) {
    if (channels[entry.channel]) return entry.state;
  }
  return "idle";
}

/**
 * Report a channel's activity. `active: true` means that surface is live
 * (mic open, TTS playing, LLM call in flight, agent task running).
 */
export function setPresenceMarkChannel(
  channel: PresenceMarkChannel,
  active: boolean,
): void {
  channels[channel] = active;
  const state = mergedState();
  if (state === lastBroadcast) return;
  lastBroadcast = state;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PRESENCE_MARK_EVENT, { detail: { state } }),
  );
}

/** Test-only: clear all channels and broadcast memory. */
export function resetPresenceMarkBusForTests(): void {
  for (const key of Object.keys(channels) as PresenceMarkChannel[]) {
    delete channels[key];
  }
  lastBroadcast = null;
}
