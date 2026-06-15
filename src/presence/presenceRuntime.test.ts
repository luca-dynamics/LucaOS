import { describe, expect, it, vi } from "vitest";
import {
  chooseDefaultSurfaceForWakeWord,
  createPresenceRuntime,
  createPresenceSnapshot,
  defaultPresenceRuntimeState,
  fromLucaLinkUiStateSync,
  fromWidgetUpdatePayload,
  getPresencePublicModeTerminology,
  presenceReducer,
  serializePresenceSnapshot,
  shouldEscalateToDashboard,
  shouldPreserveFocusForSurface,
  toHologramUpdatePayload,
  toLucaLinkUiStateSync,
  toWidgetUpdatePayload,
} from "./index";

const eventBase = {
  eventId: "presence-event:test:1",
  timestamp: 1_765_756_800_000,
  source: "wake-word" as const,
};

describe("Presence surface policy", () => {
  it("chooses Hologram for wake-word and voice-shortcut summons", () => {
    expect(chooseDefaultSurfaceForWakeWord()).toBe("hologram");
    expect(chooseDefaultSurfaceForWakeWord({ source: "voice-shortcut", requestKind: "voice" })).toBe("hologram");
  });

  it("does not default wake-word summons to the dashboard", () => {
    expect(chooseDefaultSurfaceForWakeWord()).not.toBe("dashboard");
  });

  it("preserves focus for Hologram", () => {
    expect(shouldPreserveFocusForSurface("hologram")).toBe(true);
  });

  it("allows MiniChat to request focus only when text input is explicit", () => {
    expect(shouldPreserveFocusForSurface("miniChat")).toBe(true);
    expect(shouldPreserveFocusForSurface("miniChat", { explicitTextInput: true })).toBe(false);
  });

  it("escalates only for explicit, recovery, approval, debug, or fallback cases", () => {
    expect(shouldEscalateToDashboard("ordinary-request")).toBe(false);
    for (const reason of [
      "explicit-dashboard",
      "explicit-control-center",
      "focus-required-approval",
      "recovery",
      "debug",
      "fallback-failure",
    ] as const) {
      expect(shouldEscalateToDashboard(reason)).toBe(true);
    }
  });
});

describe("Presence state and runtime", () => {
  it("produces JSON-safe snapshots", () => {
    const snapshot = createPresenceSnapshot({
      ...defaultPresenceRuntimeState,
      elevationState: {
        lastScanTimestamp: 123,
        authorizedMissionIds: ["mission-1"],
        activeMissionScope: "FULL",
      },
    });
    expect(JSON.parse(serializePresenceSnapshot(snapshot))).toEqual(snapshot);
    expect(snapshot.elevationState?.authorizedMissionIds).toEqual(["mission-1"]);
  });

  it("keeps the reducer pure and does not mutate its input or access host APIs", () => {
    const frozenState = Object.freeze({
      ...defaultPresenceRuntimeState,
      visibility: Object.freeze({
        ...defaultPresenceRuntimeState.visibility,
        surfaces: Object.freeze({ ...defaultPresenceRuntimeState.visibility.surfaces }),
      }),
    });
    const next = presenceReducer(frozenState, {
      ...eventBase,
      type: "presence/summon",
      targetSurface: "hologram",
    });

    expect(next).not.toBe(frozenState);
    expect(next.visibility.surfaces.hologram).toBe("summoning");
    expect(frozenState.visibility.surfaces.hologram).toBe("hidden");
  });

  it("wraps reducer dispatch, subscriptions, snapshots, and reset", () => {
    const runtime = createPresenceRuntime();
    const listener = vi.fn();
    const unsubscribe = runtime.subscribe(listener);
    runtime.dispatch({ ...eventBase, type: "presence/surface-ready", targetSurface: "hologram" });
    expect(runtime.getState().visibility.surfaces.hologram).toBe("visible");
    expect(runtime.getSnapshot().revision).toBe(1);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    expect(runtime.reset()).toEqual(defaultPresenceRuntimeState);
  });
});

describe("Presence compatibility", () => {
  const legacyPayload = {
    transcript: "Hello Luca",
    isListening: true,
    isSpeaking: true,
    amplitude: 0.42,
    persona: "ASSISTANT",
    themeHex: "#3b82f6",
    intent: "summarize",
    elevationState: {
      lastScanTimestamp: 123,
      authorizedMissionIds: new Set(["mission-1"]),
      activeMissionScope: "FULL",
    },
  };

  it.each([
    ["widget", (snapshot: ReturnType<typeof fromWidgetUpdatePayload>) => toWidgetUpdatePayload(snapshot)],
    ["hologram", (snapshot: ReturnType<typeof fromWidgetUpdatePayload>) => toHologramUpdatePayload(snapshot)],
    ["LucaLink", (snapshot: ReturnType<typeof fromWidgetUpdatePayload>) => toLucaLinkUiStateSync(snapshot)],
  ])("preserves current %s fields", (_name, convert) => {
    const output = convert(fromWidgetUpdatePayload(legacyPayload));
    expect(output).toMatchObject({
      transcript: legacyPayload.transcript,
      isListening: legacyPayload.isListening,
      isSpeaking: legacyPayload.isSpeaking,
      amplitude: legacyPayload.amplitude,
      persona: legacyPayload.persona,
      themeHex: legacyPayload.themeHex,
      intent: legacyPayload.intent,
      elevationState: {
        lastScanTimestamp: 123,
        authorizedMissionIds: ["mission-1"],
        activeMissionScope: "FULL",
      },
    });
  });

  it("maps LucaLink UI state into the same transport-safe snapshot", () => {
    expect(fromLucaLinkUiStateSync(legacyPayload)).toEqual(fromWidgetUpdatePayload(legacyPayload));
  });
});

describe("Presence public terminology", () => {
  it("uses premium language without forbidden hacker terminology", () => {
    const terms = Object.values(getPresencePublicModeTerminology()).join(" ");
    expect(terms).toContain("Luca Presence");
    expect(terms).toContain("Control Center");
    expect(terms).not.toMatch(/god mode|god eye|god ear|hacking terminal|tactical hud/i);
  });
});
