import { describe, expect, it } from "vitest";
import { createPresenceSnapshot, defaultPresenceRuntimeState } from "./presenceState";
import type { PresenceSnapshot } from "./presenceTypes";
import { derivePresenceMarkState, getPresenceMarkCaption } from "./presenceMark";

function snapshotWith(overrides: {
  voice?: Partial<PresenceSnapshot["voice"]>;
  approval?: Partial<PresenceSnapshot["approval"]>;
}): PresenceSnapshot {
  const base = createPresenceSnapshot(defaultPresenceRuntimeState);
  return {
    ...base,
    voice: { ...base.voice, ...overrides.voice },
    approval: { ...base.approval, ...overrides.approval },
  };
}

describe("derivePresenceMarkState", () => {
  it("is idle by default", () => {
    expect(derivePresenceMarkState(snapshotWith({}))).toBe("idle");
  });

  it("maps voice activity to listening", () => {
    expect(
      derivePresenceMarkState(snapshotWith({ voice: { status: "listening" } })),
    ).toBe("listening");
    expect(
      derivePresenceMarkState(snapshotWith({ voice: { isVadActive: true } })),
    ).toBe("listening");
  });

  it("maps model speech to speaking", () => {
    expect(
      derivePresenceMarkState(snapshotWith({ voice: { isSpeaking: true } })),
    ).toBe("speaking");
  });

  it("maps reasoning to thinking", () => {
    expect(
      derivePresenceMarkState(snapshotWith({ voice: { status: "thinking" } })),
    ).toBe("thinking");
  });

  it("reports acting when the surface says Luca is operating the host", () => {
    expect(derivePresenceMarkState(snapshotWith({}), { acting: true })).toBe(
      "acting",
    );
  });

  it("pending approval outranks everything", () => {
    const snapshot = snapshotWith({
      voice: { status: "listening", isVadActive: true },
      approval: { status: "pending", prompt: { title: "Send email" } },
    });
    expect(derivePresenceMarkState(snapshot, { acting: true })).toBe("needs-you");
  });

  it("voice errors surface as needs-you", () => {
    expect(
      derivePresenceMarkState(snapshotWith({ voice: { status: "error" } })),
    ).toBe("needs-you");
  });

  it("acting outranks listening", () => {
    const snapshot = snapshotWith({ voice: { status: "listening" } });
    expect(derivePresenceMarkState(snapshot, { acting: true })).toBe("acting");
  });
});

describe("getPresenceMarkCaption", () => {
  it("is silent at idle", () => {
    expect(getPresenceMarkCaption("idle", snapshotWith({}))).toBe("");
  });

  it("shows the live transcript while listening", () => {
    const snapshot = snapshotWith({
      voice: { status: "listening", transcript: "open my notes" },
    });
    expect(getPresenceMarkCaption("listening", snapshot)).toBe("open my notes");
  });

  it("falls back to a quiet state word without a transcript", () => {
    expect(getPresenceMarkCaption("listening", snapshotWith({}))).toBe(
      "Listening",
    );
    expect(getPresenceMarkCaption("thinking", snapshotWith({}))).toBe(
      "Thinking…",
    );
    expect(getPresenceMarkCaption("acting", snapshotWith({}))).toBe("Working");
  });

  it("names the approval when Luca needs the user", () => {
    const snapshot = snapshotWith({
      approval: { status: "pending", prompt: { title: "Send email" } },
    });
    expect(getPresenceMarkCaption("needs-you", snapshot)).toBe("Send email");
  });

  it("keeps error copy calm and human", () => {
    const snapshot = snapshotWith({ voice: { status: "error" } });
    expect(getPresenceMarkCaption("needs-you", snapshot)).toBe(
      "Something needs a look",
    );
  });
});
