import { describe, expect, it } from "vitest";
import {
  deriveIntentFromStatus,
  isAudioReactiveIntent,
  presenceAriaLabel,
  PRESENCE_INTENTS,
} from "./presenceIntent";

describe("deriveIntentFromStatus", () => {
  it("defaults to idle with no status or signals", () => {
    expect(deriveIntentFromStatus(null)).toBe("idle");
    expect(deriveIntentFromStatus("")).toBe("idle");
    expect(deriveIntentFromStatus("ready")).toBe("idle");
  });

  it("treats a dormant body as dormant regardless of status", () => {
    expect(
      deriveIntentFromStatus("working", { isDormant: true, isVadActive: true }),
    ).toBe("dormant");
  });

  it("maps error-like and approval statuses to attention", () => {
    expect(deriveIntentFromStatus("Connection failed")).toBe("attention");
    expect(deriveIntentFromStatus("There was a problem")).toBe("attention");
    expect(deriveIntentFromStatus("Waiting for you to approve")).toBe("attention");
  });

  it("maps execution statuses to working", () => {
    expect(deriveIntentFromStatus("Working on it")).toBe("working");
    expect(deriveIntentFromStatus("Executing tool")).toBe("working");
  });

  it("maps reasoning/connecting statuses to thinking", () => {
    expect(deriveIntentFromStatus("Thinking...")).toBe("thinking");
    expect(deriveIntentFromStatus("Processing request")).toBe("thinking");
    expect(deriveIntentFromStatus("Connecting")).toBe("thinking");
    expect(deriveIntentFromStatus("Routing intent")).toBe("thinking");
  });

  it("status precedence wins over ambient mic activity", () => {
    expect(
      deriveIntentFromStatus("Working", { isVadActive: true, amplitude: 0.9 }),
    ).toBe("working");
  });

  it("falls back to listening when VAD is active and status is neutral", () => {
    expect(deriveIntentFromStatus("ready", { isVadActive: true })).toBe(
      "listening",
    );
  });

  it("detects speaking from model audio above threshold", () => {
    expect(
      deriveIntentFromStatus("", {
        transcriptSource: "model",
        amplitude: 0.4,
      }),
    ).toBe("speaking");
    expect(
      deriveIntentFromStatus("", { transcriptSource: "model", isSpeaking: true }),
    ).toBe("speaking");
  });

  it("does not treat quiet model audio as speaking", () => {
    expect(
      deriveIntentFromStatus("", {
        transcriptSource: "model",
        amplitude: 0.01,
      }),
    ).toBe("idle");
  });
});

describe("presenceAriaLabel", () => {
  it("returns a human label for every intent", () => {
    PRESENCE_INTENTS.forEach((intent) => {
      expect(presenceAriaLabel(intent)).toMatch(/Luca/);
    });
  });
});

describe("isAudioReactiveIntent", () => {
  it("is true only for listening and speaking", () => {
    expect(isAudioReactiveIntent("listening")).toBe(true);
    expect(isAudioReactiveIntent("speaking")).toBe(true);
    expect(isAudioReactiveIntent("idle")).toBe(false);
    expect(isAudioReactiveIntent("working")).toBe(false);
  });
});
