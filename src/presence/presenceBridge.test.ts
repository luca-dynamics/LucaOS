import { describe, expect, it } from "vitest";
import {
  createHologramPresenceSnapshot,
  createMiniChatPresenceSnapshot,
  createWidgetPresenceSnapshot,
  getHologramDisclosureState,
  getHologramVoiceDisplayState,
  getMiniChatApprovalPrompt,
  getWidgetDisclosureState,
  getWidgetDictationState,
  toHologramUpdate,
  toMiniChatWidgetUpdate,
  toWidgetUpdate,
  toWidgetUpdatePayload,
} from "./index";

const createLegacyPayload = () => ({
  transcript: "Presence ready",
  transcriptSource: "model" as const,
  isListening: true,
  isVadActive: true,
  isSpeaking: true,
  amplitude: 0.64,
  persona: "ASSISTANT",
  themeHex: "#3b82f6",
  status: "speaking",
  activeBrainId: "brain-1",
  brainModel: "model-1",
  embeddingModel: "embedding-1",
  approvalRequest: { id: "approval-legacy", toolName: "calendar" },
  intent: "schedule",
  elevationState: {
    lastScanTimestamp: 123,
    authorizedMissionIds: new Set(["mission-1"]),
    activeMissionScope: "FULL",
  },
  presenceSource: "wake-word",
  legacyOnlyField: { preserve: true },
});

function expectCommonPayload(output: Record<string, unknown>) {
  expect(output).toMatchObject({
    transcript: "Presence ready",
    transcriptSource: "model",
    isListening: true,
    isVadActive: true,
    isSpeaking: true,
    amplitude: 0.64,
    persona: "ASSISTANT",
    themeHex: "#3b82f6",
    status: "speaking",
    intent: "schedule",
    legacyOnlyField: { preserve: true },
    elevationState: {
      lastScanTimestamp: 123,
      authorizedMissionIds: ["mission-1"],
      activeMissionScope: "FULL",
    },
  });
  expect((output.elevationState as { authorizedMissionIds: unknown }).authorizedMissionIds).not.toBeInstanceOf(Set);
  expect(output).not.toHaveProperty("dashboard");
  expect(output).not.toHaveProperty("focus");
  expect(output).not.toHaveProperty("visibility");
  expect(JSON.parse(JSON.stringify(output))).toEqual(output);
}

describe("Presence surface bridges", () => {
  it("preserves modeled and unmodeled MiniChat fields without mutating inputs", () => {
    const payload = createLegacyPayload();
    const originalIds = payload.elevationState.authorizedMissionIds;
    const snapshot = createMiniChatPresenceSnapshot(payload);
    const output = toMiniChatWidgetUpdate(snapshot, payload);

    expectCommonPayload(output);
    expect(output).toMatchObject({
      activeBrainId: "brain-1",
      brainModel: "model-1",
      embeddingModel: "embedding-1",
      approvalRequest: payload.approvalRequest,
    });
    expect(payload.elevationState.authorizedMissionIds).toBe(originalIds);
    expect(payload.elevationState.authorizedMissionIds).toBeInstanceOf(Set);
  });

  it("preserves modeled, unmodeled, and presence-source Hologram fields", () => {
    const payload = createLegacyPayload();
    const output = toHologramUpdate(createHologramPresenceSnapshot(payload), payload);

    expectCommonPayload(output);
    expect(output.presenceSource).toBe("wake-word");
    expect(payload.elevationState.authorizedMissionIds).toBeInstanceOf(Set);
  });

  it("preserves modeled and unmodeled Widget fields", () => {
    const payload = createLegacyPayload();
    const output = toWidgetUpdate(createWidgetPresenceSnapshot(payload), payload);

    expectCommonPayload(output);
    expect(payload.elevationState.authorizedMissionIds).toBeInstanceOf(Set);
  });

  it("maps Hologram listening, speaking, transcript, and amplitude display state", () => {
    const snapshot = createHologramPresenceSnapshot(createLegacyPayload());

    expect(getHologramVoiceDisplayState(snapshot)).toEqual({
      status: "speaking",
      transcript: "Presence ready",
      transcriptSource: "model",
      isListening: true,
      isSpeaking: true,
      amplitude: 0.64,
    });
  });

  it("maps Widget voice state to the existing dictation display shape", () => {
    const payload = createLegacyPayload();
    const snapshot = createWidgetPresenceSnapshot(payload);

    expect(getWidgetDictationState(snapshot)).toEqual({
      status: "speaking",
      transcript: "Presence ready",
      transcriptSource: "model",
      isListening: true,
      isSpeaking: true,
      amplitude: 0.64,
    });
    expect(payload.elevationState.authorizedMissionIds).toBeInstanceOf(Set);
  });

  it("narrows future transcript sources at the legacy widget payload boundary", () => {
    const snapshot = createWidgetPresenceSnapshot({
      transcript: "Custom source",
      transcriptSource: "model",
    });

    expect(toWidgetUpdatePayload(snapshot).transcriptSource).toBe("model");
    expect(toWidgetUpdatePayload({
      ...snapshot,
      voice: {
        ...snapshot.voice,
        transcriptSource: "assistant-preview" as unknown as typeof snapshot.voice.transcriptSource,
      },
    }).transcriptSource).toBe("user");
  });

  it("extracts a typed MiniChat approval prompt from the snapshot", () => {
    const approvalRequest = {
      requestId: "approval-1",
      summary: "Allow calendar update",
      requiresFocus: false,
      riskLevel: "low" as const,
    };
    const snapshot = createMiniChatPresenceSnapshot({ approvalRequest });

    expect(getMiniChatApprovalPrompt(snapshot)).toEqual(approvalRequest);
  });

  it("keeps Hologram and Widget disclosure selectors compatible", () => {
    const snapshot = createWidgetPresenceSnapshot({
      sensors: {
        microphone: { status: "active", legacyOnlyField: true },
        screen: { status: "requesting" },
      },
      approvalRequest: { id: "approval-1" },
    });

    expect(getHologramDisclosureState(snapshot)).toEqual({
      microphone: { label: "Voice Presence", level: "active" },
      screen: { label: "Screen Context", level: "ambient" },
      approval: { label: "Protected Action", level: "protected" },
    });
    expect(getWidgetDisclosureState(snapshot)).toEqual({
      microphone: { label: "Voice Presence", level: "active" },
      screen: { label: "Screen Context", level: "ambient" },
      approval: { label: "Protected Action", level: "protected" },
    });
  });

  it("falls back to the preserved legacy MiniChat approval payload", () => {
    const payload = createLegacyPayload();
    const snapshot = createMiniChatPresenceSnapshot({});

    expect(getMiniChatApprovalPrompt(snapshot, payload)).toEqual(payload.approvalRequest);
  });
});
