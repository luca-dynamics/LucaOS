// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetPresenceMarkBusForTests,
  setPresenceMarkChannel,
} from "./presenceMarkBus";
import { PRESENCE_MARK_EVENT } from "./usePresenceMarkLiveState";

const listen = () => {
  const states: string[] = [];
  const handler = (event: Event) =>
    states.push((event as CustomEvent).detail.state);
  window.addEventListener(PRESENCE_MARK_EVENT, handler);
  return { states, dispose: () => window.removeEventListener(PRESENCE_MARK_EVENT, handler) };
};

afterEach(() => {
  resetPresenceMarkBusForTests();
  vi.restoreAllMocks();
});

describe("presenceMarkBus", () => {
  it("merges channels in priority order: acting > listening > speaking > thinking", () => {
    const { states, dispose } = listen();
    setPresenceMarkChannel("chat", true);
    setPresenceMarkChannel("tts", true);
    setPresenceMarkChannel("mic", true);
    setPresenceMarkChannel("agent", true);
    expect(states).toEqual(["thinking", "speaking", "listening", "acting"]);
    dispose();
  });

  it("falls back through remaining channels as higher ones go quiet, ending idle", () => {
    setPresenceMarkChannel("chat", true);
    setPresenceMarkChannel("mic", true);
    const { states, dispose } = listen();
    setPresenceMarkChannel("mic", false);
    setPresenceMarkChannel("chat", false);
    expect(states).toEqual(["thinking", "idle"]);
    dispose();
  });

  it("does not rebroadcast unchanged states", () => {
    const { states, dispose } = listen();
    setPresenceMarkChannel("agent", true);
    setPresenceMarkChannel("chat", true);
    setPresenceMarkChannel("chat", false);
    expect(states).toEqual(["acting"]);
    dispose();
  });
});
