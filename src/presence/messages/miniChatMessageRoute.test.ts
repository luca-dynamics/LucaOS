import { describe, expect, it } from "vitest";
import {
  createMiniChatMessageRequest,
  createMiniChatReply,
  createMiniChatStreamChunk,
  getMiniChatMessageText,
  isMiniChatMessageRequest,
  toLegacyChatWidgetMessage,
} from "./index";

describe("MiniChat Presence message routing", () => {
  it("normalizes a raw MiniChat payload into a typed request", () => {
    const request = createMiniChatMessageRequest({ text: "hello", requestId: "req-1" });

    expect(request).toMatchObject({ text: "hello", requestId: "req-1", source: "miniChat" });
    expect(isMiniChatMessageRequest(request)).toBe(true);
    expect(getMiniChatMessageText(request)).toBe("hello");
  });

  it("preserves unknown legacy fields, text, attachments, and screen context", () => {
    const payload = {
      text: "keep exact text  ",
      attachments: [{ name: "trace.txt" }],
      attachment: "data:text/plain;base64,abc",
      image: "data:image/png;base64,abc",
      screenContext: { app: "Terminal" },
      displayId: 7,
      persona: "ASSISTANT",
      model: "model-1",
      activeBrainId: "brain-1",
      legacyOnlyField: { preserve: true },
    };

    const request = createMiniChatMessageRequest(payload);

    expect(request).toMatchObject(payload);
    expect(request.text).toBe("keep exact text  ");
    expect(JSON.parse(JSON.stringify(request))).toEqual(request);
  });

  it("tolerates missing optional fields", () => {
    const request = createMiniChatMessageRequest();

    expect(request).toEqual({ source: "miniChat" });
    expect(getMiniChatMessageText(undefined)).toBe("");
    expect(isMiniChatMessageRequest({ legacyOnlyField: true })).toBe(true);
  });

  it("emits a legacy chat-widget-message compatible payload without mutating input", () => {
    const legacyPayload = { text: "old", legacyOnlyField: "keep", nested: { a: 1 } };
    const request = createMiniChatMessageRequest({ text: "new", image: "img" });
    const beforeLegacy = { ...legacyPayload };
    const beforeRequest = { ...request };

    const output = toLegacyChatWidgetMessage(request, legacyPayload);

    expect(output).toEqual({
      text: "new",
      legacyOnlyField: "keep",
      nested: { a: 1 },
      source: "miniChat",
      image: "img",
    });
    expect(legacyPayload).toEqual(beforeLegacy);
    expect(request).toEqual(beforeRequest);
  });

  it("preserves legacy reply shape", () => {
    const reply = { text: "done", generatedImage: "img", tacticalData: { ok: true }, legacy: 1 };

    expect(createMiniChatReply(reply)).toEqual(reply);
    expect(createMiniChatReply("plain reply")).toEqual({ text: "plain reply" });
  });

  it("preserves legacy stream chunk shape", () => {
    const chunk = {
      id: "stream-1",
      text: "part",
      isComplete: false,
      generatedVideo: "video",
      tacticalData: { step: 1 },
      legacy: 1,
    };

    expect(createMiniChatStreamChunk(chunk)).toEqual(chunk);
  });
});
