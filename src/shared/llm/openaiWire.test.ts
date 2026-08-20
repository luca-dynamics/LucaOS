/**
 * Tests for the shared OpenAI-compatible wire format.
 *
 * This module is the single description of that format for both processes —
 * the renderer's `OpenAIAdapter` and the core's `openaiCompatibleAdapter` — so
 * the cases below are the contract, not incidental coverage. Before RFC-0006
 * Stage 2 the same mapping existed in four places (twice inside
 * `OpenAIAdapter` alone), and two of its subtleties are easy to lose in a
 * refactor: images attach only to the *last* message, and streamed tool-call
 * arguments arrive as JSON fragments that must be concatenated before parsing.
 * Both are pinned here.
 */

import { describe, expect, it, vi } from "vitest";

import {
  createOpenAIStreamAccumulator,
  fromOpenAIChoice,
  toOpenAIMessages,
  toOpenAITools,
} from "./openaiWire.js";

const textDelta = (content: string) => ({ choices: [{ delta: { content } }] });

const toolDelta = (
  index: number,
  fields: { id?: string; name?: string; args?: string },
) => ({
  choices: [
    {
      delta: {
        tool_calls: [
          {
            index,
            id: fields.id,
            function: { name: fields.name, arguments: fields.args },
          },
        ],
      },
    },
  ],
});

describe("toOpenAIMessages", () => {
  it("maps a tool result to a tool message keyed by its call id", () => {
    const [mapped] = toOpenAIMessages([
      { role: "tool", toolCallId: "call_7", content: "42" },
    ]);

    expect(mapped).toEqual({
      role: "tool",
      tool_call_id: "call_7",
      content: "42",
    });
  });

  it("maps a model turn with tool calls to an assistant message with JSON arguments", () => {
    const [mapped] = toOpenAIMessages([
      {
        role: "model",
        content: "Checking that.",
        toolCalls: [
          { id: "call_1", name: "read_file", args: { path: "a.txt" } },
        ],
      },
    ]) as Array<Record<string, any>>;

    expect(mapped.role).toBe("assistant");
    expect(mapped.content).toBe("Checking that.");
    expect(mapped.tool_calls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "read_file",
          arguments: '{"path":"a.txt"}',
        },
      },
    ]);
  });

  it("omits content from an assistant message that carried none", () => {
    const [mapped] = toOpenAIMessages([
      { role: "model", toolCalls: [{ id: "c", name: "n", args: {} }] },
    ]) as Array<Record<string, any>>;

    expect("content" in mapped).toBe(false);
  });

  it("attaches images to the last message only", () => {
    const mapped = toOpenAIMessages(
      [
        { role: "user", content: "first" },
        { role: "user", content: "second" },
      ],
      { images: ["BASE64"] },
    ) as Array<Record<string, any>>;

    expect(mapped[0].content).toEqual([{ type: "text", text: "first" }]);
    expect(mapped[1].content).toEqual([
      { type: "text", text: "second" },
      {
        type: "image_url",
        image_url: { url: "data:image/jpeg;base64,BASE64" },
      },
    ]);
  });

  it("unshifts the system instruction ahead of the history", () => {
    const mapped = toOpenAIMessages([{ role: "user", content: "hi" }], {
      systemInstruction: "You are Luca.",
    }) as Array<Record<string, any>>;

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toEqual({ role: "system", content: "You are Luca." });
  });

  it("tolerates no messages at all", () => {
    expect(toOpenAIMessages()).toEqual([]);
    expect(toOpenAIMessages(undefined, { systemInstruction: "s" })).toEqual([
      { role: "system", content: "s" },
    ]);
  });
});

describe("toOpenAITools", () => {
  it("maps a tool spec to the function-calling shape", () => {
    expect(
      toOpenAITools([
        {
          name: "read_file",
          description: "Read a file",
          parameters: { type: "object" },
        },
      ]),
    ).toEqual([
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read a file",
          parameters: { type: "object" },
        },
      },
    ]);
  });

  it("returns undefined rather than an empty array, so the field can be omitted", () => {
    expect(toOpenAITools([])).toBeUndefined();
    expect(toOpenAITools()).toBeUndefined();
  });
});

describe("fromOpenAIChoice", () => {
  it("reads text and leaves toolCalls undefined when there are none", () => {
    expect(fromOpenAIChoice({ message: { content: "hello" } })).toEqual({
      text: "hello",
      toolCalls: undefined,
    });
  });

  it("parses tool-call arguments into the internal representation", () => {
    expect(
      fromOpenAIChoice({
        message: {
          content: null,
          tool_calls: [
            {
              id: "call_9",
              function: { name: "write", arguments: '{"path":"b.txt"}' },
            },
          ],
        },
      }),
    ).toEqual({
      text: "",
      toolCalls: [{ id: "call_9", name: "write", args: { path: "b.txt" } }],
    });
  });

  it("treats a missing choice as empty rather than throwing", () => {
    expect(fromOpenAIChoice()).toEqual({ text: "", toolCalls: undefined });
  });
});

describe("createOpenAIStreamAccumulator", () => {
  it("accumulates text and forwards each chunk as it arrives", () => {
    const onChunk = vi.fn();
    const accumulator = createOpenAIStreamAccumulator(onChunk);

    accumulator.ingest(textDelta("Hel"));
    accumulator.ingest(textDelta("lo"));

    expect(onChunk.mock.calls).toEqual([["Hel"], ["lo"]]);
    expect(accumulator.finish()).toEqual({ text: "Hello", toolCalls: undefined });
  });

  it("assembles a tool call whose arguments arrive split across chunks", () => {
    const accumulator = createOpenAIStreamAccumulator();

    accumulator.ingest(toolDelta(0, { id: "call_3", name: "search", args: '{"q":' }));
    accumulator.ingest(toolDelta(0, { args: '"lucaos' }));
    accumulator.ingest(toolDelta(0, { args: '"}' }));

    expect(accumulator.finish()).toEqual({
      text: "",
      toolCalls: [{ id: "call_3", name: "search", args: { q: "lucaos" } }],
    });
  });

  it("keeps concurrent tool calls apart by their stream index", () => {
    const accumulator = createOpenAIStreamAccumulator();

    accumulator.ingest(toolDelta(0, { id: "a", name: "first", args: "{}" }));
    accumulator.ingest(toolDelta(1, { id: "b", name: "second", args: '{"x":1}' }));

    expect(accumulator.finish().toolCalls).toEqual([
      { id: "a", name: "first", args: {} },
      { id: "b", name: "second", args: { x: 1 } },
    ]);
  });

  it("keeps a zero-argument tool call instead of dropping it", () => {
    const accumulator = createOpenAIStreamAccumulator();

    accumulator.ingest(toolDelta(0, { id: "z", name: "get_state" }));

    expect(accumulator.finish().toolCalls).toEqual([
      { id: "z", name: "get_state", args: {} },
    ]);
  });

  it("drops a tool call whose arguments never became valid JSON, and keeps the rest", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const accumulator = createOpenAIStreamAccumulator();

    accumulator.ingest(toolDelta(0, { id: "bad", name: "broken", args: "{oops" }));
    accumulator.ingest(toolDelta(1, { id: "ok", name: "fine", args: "{}" }));

    expect(accumulator.finish().toolCalls).toEqual([
      { id: "ok", name: "fine", args: {} },
    ]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("ignores a chunk with no delta", () => {
    const accumulator = createOpenAIStreamAccumulator();

    accumulator.ingest({ choices: [{}] });
    accumulator.ingest({});

    expect(accumulator.finish()).toEqual({ text: "", toolCalls: undefined });
  });
});
