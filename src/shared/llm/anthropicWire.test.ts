import { describe, expect, it, vi } from "vitest";

import {
  createAnthropicStreamAccumulator,
  fromAnthropicMessage,
  toAnthropicMessages,
  toAnthropicTools,
} from "./anthropicWire.js";

describe("toAnthropicMessages", () => {
  it("turns a tool result into a user message, because Anthropic has no tool role", () => {
    const [message] = toAnthropicMessages([
      { role: "tool", content: "42", toolCallId: "call_1", name: "add" },
    ]);

    expect(message).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "call_1", content: "42" },
      ],
    });
  });

  it("falls back to 'unknown' when a tool result has no call id", () => {
    const [message] = toAnthropicMessages([{ role: "tool", content: "42" }]);

    expect((message as any).content[0].tool_use_id).toBe("unknown");
  });

  it("orders an assistant turn as thinking, then text, then tool use", () => {
    const [message] = toAnthropicMessages([
      {
        role: "model",
        content: "Checking.",
        thought: "I should look it up.",
        thought_signature: "sig-1",
        toolCalls: [{ id: "call_1", name: "search", args: { q: "luca" } }],
      },
    ]);

    expect(message).toEqual({
      role: "assistant",
      content: [
        {
          type: "thinking",
          thinking: "I should look it up.",
          signature: "sig-1",
        },
        { type: "text", text: "Checking." },
        {
          type: "tool_use",
          id: "call_1",
          name: "search",
          input: { q: "luca" },
        },
      ],
    });
  });

  it("omits absent blocks rather than sending empty ones", () => {
    const [message] = toAnthropicMessages([{ role: "model", content: "Hi." }]);

    expect((message as any).content).toEqual([{ type: "text", text: "Hi." }]);
  });

  it("attaches images to the last message only, ahead of its text", () => {
    const messages = toAnthropicMessages(
      [
        { role: "user", content: "first" },
        { role: "user", content: "second" },
      ],
      { images: ["BASE64"] },
    );

    expect((messages[0] as any).content).toEqual([
      { type: "text", text: "first" },
    ]);
    expect((messages[1] as any).content).toEqual([
      {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "BASE64" },
      },
      { type: "text", text: "second" },
    ]);
  });

  it("labels a PNG data URL as PNG, not as the jpeg default", () => {
    // Vision sends screenshots as PNG. This wire hardcoded image/jpeg until
    // RFC-0006 Stage 2 Change 3, so every screenshot went out mislabelled.
    const messages = toAnthropicMessages([{ role: "user", content: "look" }], {
      images: ["data:image/png;base64,AAAB"],
    });

    expect((messages[0] as any).content).toEqual([
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "AAAB" },
      },
      { type: "text", text: "look" },
    ]);
  });

  it("does not fold a system instruction into the messages array", () => {
    // Anthropic takes the system prompt as a separate request parameter.
    const messages = toAnthropicMessages([{ role: "user", content: "hi" }]);

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
  });

  it("tolerates no messages at all", () => {
    expect(toAnthropicMessages()).toEqual([]);
  });
});

describe("toAnthropicTools", () => {
  it("maps Luca's parameters onto input_schema", () => {
    expect(
      toAnthropicTools([
        {
          name: "search",
          description: "Search the web",
          parameters: { type: "object", properties: {} },
        },
      ]),
    ).toEqual([
      {
        name: "search",
        description: "Search the web",
        input_schema: { type: "object", properties: {} },
      },
    ]);
  });

  it("returns undefined for no tools, so the field is omitted from the request", () => {
    expect(toAnthropicTools()).toBeUndefined();
    expect(toAnthropicTools([])).toBeUndefined();
  });
});

describe("fromAnthropicMessage", () => {
  it("pulls text, tool calls, and the thinking block with its signature", () => {
    const response = {
      content: [
        { type: "thinking", thinking: "Consider.", signature: "sig-1" },
        { type: "text", text: "Here you go." },
        {
          type: "tool_use",
          id: "call_1",
          name: "search",
          input: { q: "luca" },
        },
      ],
    };

    expect(fromAnthropicMessage(response)).toEqual({
      text: "Here you go.",
      thought: "Consider.",
      thought_signature: "sig-1",
      toolCalls: [{ id: "call_1", name: "search", args: { q: "luca" } }],
    });
  });

  it("reports no tool calls as undefined rather than an empty array", () => {
    const result = fromAnthropicMessage({
      content: [{ type: "text", text: "Just prose." }],
    });

    expect(result.toolCalls).toBeUndefined();
    expect(result.thought).toBeUndefined();
    expect(result.thought_signature).toBeUndefined();
  });

  it("returns empty text when the response carries no text block", () => {
    expect(fromAnthropicMessage({ content: [] }).text).toBe("");
    expect(fromAnthropicMessage().text).toBe("");
  });
});

describe("createAnthropicStreamAccumulator", () => {
  it("forwards text deltas as they arrive", () => {
    const onChunk = vi.fn();
    const accumulator = createAnthropicStreamAccumulator(onChunk);

    accumulator.ingest({
      type: "content_block_delta",
      delta: { type: "text_delta", text: "Hel" },
    });
    accumulator.ingest({
      type: "content_block_delta",
      delta: { type: "text_delta", text: "lo" },
    });

    expect(onChunk.mock.calls).toEqual([["Hel"], ["lo"]]);
    expect(accumulator.finish().text).toBe("Hello");
  });

  it("accrues thinking deltas without forwarding them to the caller", () => {
    const onChunk = vi.fn();
    const accumulator = createAnthropicStreamAccumulator(onChunk);

    accumulator.ingest({
      type: "content_block_delta",
      delta: { type: "thinking_delta", thinking: "Let me " },
    });
    accumulator.ingest({
      type: "content_block_delta",
      delta: { type: "thinking_delta", thinking: "think." },
    });

    expect(onChunk).not.toHaveBeenCalled();
    expect(accumulator.finish().thought).toBe("Let me think.");
  });

  it("collects a completed tool_use block at content_block_stop", () => {
    const accumulator = createAnthropicStreamAccumulator();
    const currentMessage = {
      content: [
        { type: "text", text: "one moment" },
        {
          type: "tool_use",
          id: "call_1",
          name: "search",
          input: { q: "luca" },
        },
      ],
    };

    accumulator.ingest({ type: "content_block_stop", index: 0 }, currentMessage);
    accumulator.ingest({ type: "content_block_stop", index: 1 }, currentMessage);

    expect(accumulator.finish().toolCalls).toEqual([
      { id: "call_1", name: "search", args: { q: "luca" } },
    ]);
  });

  it("ignores a stop event with no in-flight message to read from", () => {
    const accumulator = createAnthropicStreamAccumulator();

    accumulator.ingest({ type: "content_block_stop", index: 3 });
    accumulator.ingest({ type: "message_stop" });

    expect(accumulator.finish()).toEqual({
      text: "",
      thought: undefined,
      thought_signature: undefined,
      toolCalls: undefined,
    });
  });

  it("never reports a thought signature, which Anthropic does not send", () => {
    const accumulator = createAnthropicStreamAccumulator();

    accumulator.ingest({
      type: "content_block_delta",
      delta: { type: "thinking_delta", thinking: "hm" },
    });

    expect(accumulator.finish().thought_signature).toBeUndefined();
  });
});
