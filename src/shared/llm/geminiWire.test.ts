import { describe, expect, it } from "vitest";

import {
  extractGeminiThought,
  normalizeGeminiToolCalls,
  toGeminiContents,
  toGeminiSystemInstruction,
  toGeminiTools,
} from "./geminiWire.js";

describe("toGeminiContents — role grouping", () => {
  it("collapses consecutive tool results into ONE function message", () => {
    // Gemini requires strictly alternating roles and rejects a run of separate
    // function messages. This is the rule the whole builder exists to protect.
    const contents = toGeminiContents([
      { role: "user", content: "check three things" },
      { role: "model", toolCalls: [{ name: "a", args: {} }] },
      { role: "tool", name: "a", content: "1" },
      { role: "tool", name: "b", content: "2" },
      { role: "tool", name: "c", content: "3" },
    ]);

    expect(contents.map((entry) => entry.role)).toEqual([
      "user",
      "model",
      "function",
    ]);
    expect((contents[2] as any).parts).toEqual([
      { functionResponse: { name: "a", response: { result: "1" } } },
      { functionResponse: { name: "b", response: { result: "2" } } },
      { functionResponse: { name: "c", response: { result: "3" } } },
    ]);
  });

  it("starts a fresh function group after a model turn interrupts", () => {
    const contents = toGeminiContents([
      { role: "tool", name: "a", content: "1" },
      { role: "model", content: "thinking" },
      { role: "tool", name: "b", content: "2" },
    ]);

    expect(contents.map((entry) => entry.role)).toEqual([
      "function",
      "model",
      "function",
    ]);
    expect((contents[0] as any).parts).toHaveLength(1);
    expect((contents[2] as any).parts).toHaveLength(1);
  });

  it("names an unnamed tool result 'unknown'", () => {
    const contents = toGeminiContents([{ role: "tool", content: "1" }]);

    expect((contents[0] as any).parts[0].functionResponse.name).toBe("unknown");
  });
});

describe("toGeminiContents — parts", () => {
  it("emits a model turn as thought, signature, text, then function calls", () => {
    const contents = toGeminiContents([
      {
        role: "model",
        content: "Looking.",
        thought: "Consider.",
        thought_signature: "sig-1",
        toolCalls: [{ name: "search", args: { q: "luca" } }],
      },
    ]);

    expect(contents[0]).toEqual({
      role: "model",
      parts: [
        { thought: "Consider." },
        { thought_signature: "sig-1" },
        { text: "Looking." },
        { functionCall: { name: "search", args: { q: "luca" } } },
      ],
    });
  });

  it("backfills an empty model turn, since empty parts is an API error", () => {
    const contents = toGeminiContents([{ role: "model" }]);

    expect((contents[0] as any).parts).toEqual([{ text: "" }]);
  });

  it("appends images to the last message only, after its text", () => {
    const contents = toGeminiContents(
      [
        { role: "user", content: "first" },
        { role: "user", content: "second" },
      ],
      { images: ["BASE64"] },
    );

    expect((contents[0] as any).parts).toEqual([{ text: "first" }]);
    expect((contents[1] as any).parts).toEqual([
      { text: "second" },
      { inlineData: { data: "BASE64", mimeType: "image/jpeg" } },
    ]);
  });

  it("labels a PNG data URL as PNG, not as the jpeg default", () => {
    // Vision sends screenshots as PNG. This wire hardcoded image/jpeg until
    // RFC-0006 Stage 2 Change 3, so every screenshot went out mislabelled.
    const contents = toGeminiContents([{ role: "user", content: "look" }], {
      images: ["data:image/png;base64,AAAB"],
    });

    expect((contents[0] as any).parts).toEqual([
      { text: "look" },
      { inlineData: { data: "AAAB", mimeType: "image/png" } },
    ]);
  });

  it("maps a system message to the user role, as the SDK requires", () => {
    // A system *instruction* is a separate request field; a system message in
    // the history has nowhere else to go.
    const contents = toGeminiContents([{ role: "system", content: "be brief" }]);

    expect(contents[0]).toEqual({ role: "user", parts: [{ text: "be brief" }] });
  });

  it("sends empty text rather than omitting the part for a blank user turn", () => {
    const contents = toGeminiContents([{ role: "user" }]);

    expect((contents[0] as any).parts).toEqual([{ text: "" }]);
  });

  it("tolerates no messages at all", () => {
    expect(toGeminiContents()).toEqual([]);
  });
});

describe("toGeminiTools", () => {
  it("passes Luca's tool specs through unmapped, in Google's wrapper", () => {
    const tools = [{ name: "search", description: "Search", parameters: {} }];

    expect(toGeminiTools(tools)).toEqual([{ functionDeclarations: tools }]);
  });

  it("returns undefined for no tools, so the field is omitted", () => {
    expect(toGeminiTools()).toBeUndefined();
    expect(toGeminiTools([])).toBeUndefined();
  });
});

describe("toGeminiSystemInstruction", () => {
  it("wraps an instruction in a system-role content block", () => {
    expect(toGeminiSystemInstruction("be brief")).toEqual({
      role: "system",
      parts: [{ text: "be brief" }],
    });
  });

  it("returns undefined for a missing or empty instruction", () => {
    expect(toGeminiSystemInstruction()).toBeUndefined();
    expect(toGeminiSystemInstruction("")).toBeUndefined();
  });
});

describe("extractGeminiThought", () => {
  const holder = (parts: unknown[]) => ({
    candidates: [{ content: { parts } }],
  }) as any;

  it("reads the snake_case signature the older SDK sends", () => {
    expect(
      extractGeminiThought(
        holder([{ thought: "Consider." }, { thought_signature: "sig-1" }]),
      ),
    ).toEqual({ thought: "Consider.", thought_signature: "sig-1" });
  });

  it("reads the camelCase signature the newer SDK sends", () => {
    expect(
      extractGeminiThought(holder([{ thoughtSignature: "sig-2" }])),
    ).toEqual({ thought: undefined, thought_signature: "sig-2" });
  });

  it("concatenates multiple thought parts instead of keeping only the last", () => {
    expect(
      extractGeminiThought(
        holder([{ thought: "First. " }, { thought: "Second." }]),
      ).thought,
    ).toBe("First. Second.");
  });

  it("reports nothing when there are no thought parts", () => {
    expect(extractGeminiThought(holder([{ text: "hello" }]))).toEqual({
      thought: undefined,
      thought_signature: undefined,
    });
  });

  it("survives a response with no candidates at all", () => {
    expect(extractGeminiThought({})).toEqual({
      thought: undefined,
      thought_signature: undefined,
    });
    expect(extractGeminiThought()).toEqual({
      thought: undefined,
      thought_signature: undefined,
    });
  });
});

describe("normalizeGeminiToolCalls", () => {
  it("keeps name and args, and carries no id — Gemini does not send one", () => {
    expect(
      normalizeGeminiToolCalls([{ name: "search", args: { q: "luca" } }]),
    ).toEqual([{ name: "search", args: { q: "luca" } }]);
  });

  it("returns undefined for no calls rather than an empty array", () => {
    expect(normalizeGeminiToolCalls()).toBeUndefined();
    expect(normalizeGeminiToolCalls([])).toBeUndefined();
    expect(normalizeGeminiToolCalls(null)).toBeUndefined();
  });
});
