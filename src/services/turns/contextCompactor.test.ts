const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../llm/LLMProvider";
import {
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  SUMMARY_MARKER,
  TOOL_RESULT_SUMMARY_CAP,
  compactHistory,
  contextWindowFor,
  estimateHistoryTokens,
  estimateTokens,
  extractPriorSummary,
  findCutIndex,
  isValidCutPoint,
  keepRecentTokensFor,
  needsCompaction,
  reserveTokensFor,
  serializeForSummary,
} from "./contextCompactor";

// --- fixtures ---------------------------------------------------------------

const chars = (n: number) => "x".repeat(n);

const user = (content: string): ChatMessage => ({ role: "user", content });
const model = (content: string): ChatMessage => ({ role: "model", content });

const modelCalling = (content: string, ...names: string[]): ChatMessage => ({
  role: "model",
  content,
  toolCalls: names.map((name, i) => ({ name, args: { i }, id: `call-${i}` })),
});

const toolResult = (name: string, content: string): ChatMessage => ({
  role: "tool",
  name,
  content,
  toolCallId: "call-0",
});

/** Alternating user/model turns of a known size, so token budgets are predictable. */
const alternatingTurns = (count: number, sizeChars = 1000): ChatMessage[] =>
  Array.from({ length: count }, (_, i) =>
    i % 2 === 0 ? user(`u${i} ${chars(sizeChars)}`) : model(`m${i} ${chars(sizeChars)}`),
  );

/** A completed tool exchange: the model's call followed by its three results. */
const toolBlock = (sizeChars = 8000): ChatMessage[] => [
  user("do the thing"),
  modelCalling("working on it", "read_file"),
  toolResult("read_file", chars(sizeChars)),
  toolResult("read_file", chars(sizeChars)),
  toolResult("read_file", chars(sizeChars)),
];

// A 4k window keeps the arithmetic legible: reserve 1000, budget 3000, keep-recent 1500.
const SMALL_WINDOW = 4000;

// --- token estimation -------------------------------------------------------

describe("contextCompactor token estimation", () => {
  it("treats absent text as free and grows with length", () => {
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(chars(4))).toBe(1);
    expect(estimateTokens(chars(400))).toBe(100);
  });

  it("charges for tool-call payloads, not just message text", () => {
    const plain = estimateHistoryTokens([model("same text")]);
    const calling = estimateHistoryTokens([
      modelCalling("same text", "a_tool_with_a_long_name"),
    ]);
    expect(calling).toBeGreaterThan(plain);
  });

  it("does not throw on unserializable tool arguments", () => {
    const circular: any = { name: "loop" };
    circular.self = circular;
    const message: ChatMessage = {
      role: "model",
      content: "hm",
      toolCalls: [{ name: "loop", args: circular }],
    };
    expect(() => estimateHistoryTokens([message])).not.toThrow();
  });
});

// --- window resolution ------------------------------------------------------

describe("contextCompactor window resolution", () => {
  it("falls back to the conservative default for unknown or missing models", () => {
    expect(contextWindowFor(undefined)).toBe(DEFAULT_CONTEXT_WINDOW_TOKENS);
    expect(contextWindowFor(null)).toBe(DEFAULT_CONTEXT_WINDOW_TOKENS);
    expect(contextWindowFor("some-model-nobody-mapped")).toBe(
      DEFAULT_CONTEXT_WINDOW_TOKENS,
    );
  });

  it("matches known families case-insensitively", () => {
    expect(contextWindowFor("claude-opus-5")).toBe(200_000);
    expect(contextWindowFor("Claude-Sonnet-5")).toBe(200_000);
    expect(contextWindowFor("gemini-2.5-pro")).toBe(1_000_000);
  });

  it("prefers an explicit window supplied by the caller", () => {
    expect(contextWindowFor("claude-opus-5", 8_192)).toBe(8_192);
    expect(contextWindowFor("unknown", 65_536)).toBe(65_536);
  });

  // Regression: a flat 20k keep-recent against a 32k window leaves a post-reserve
  // budget smaller than the tail we refuse to cut, so findCutIndex could never
  // return anything and compaction silently never fired on small models.
  it("keeps the recent-tail budget strictly inside the post-reserve budget", () => {
    for (const window of [8_192, 16_384, 32_768, 128_000, 200_000, 1_000_000]) {
      const budget = window - reserveTokensFor(window);
      expect(keepRecentTokensFor(window)).toBeLessThan(budget);
      expect(keepRecentTokensFor(window)).toBeGreaterThan(0);
    }
  });
});

// --- cut-point safety -------------------------------------------------------

describe("contextCompactor cut points", () => {
  const history = [...alternatingTurns(4), ...toolBlock()];
  // indices 0-3 alternating turns, 4 user, 5 model+calls, 6/7/8 tool results

  it("refuses tool results, because an orphaned tool_result is a hard API error", () => {
    expect(isValidCutPoint(history, 6)).toBe(false);
    expect(isValidCutPoint(history, 7)).toBe(false);
    expect(isValidCutPoint(history, 8)).toBe(false);
  });

  it("refuses a model message that carries tool calls", () => {
    expect(isValidCutPoint(history, 5)).toBe(false);
  });

  it("accepts user messages and plain model replies", () => {
    expect(isValidCutPoint(history, 4)).toBe(true);
    expect(isValidCutPoint(history, 1)).toBe(true);
    expect(isValidCutPoint(history, 2)).toBe(true);
  });

  it("refuses index 0 and out-of-range indices", () => {
    expect(isValidCutPoint(history, 0)).toBe(false);
    expect(isValidCutPoint(history, -1)).toBe(false);
    expect(isValidCutPoint(history, history.length)).toBe(false);
  });

  it("skips back past a tool block rather than cutting into it", () => {
    // keep-recent lands inside the tool results; the cut must fall to the user
    // message that opened the exchange.
    expect(findCutIndex(history, 3000)).toBe(4);
  });

  it("never returns an unsafe index at any keep-recent budget", () => {
    for (let keepRecent = 100; keepRecent <= 12_000; keepRecent += 100) {
      const index = findCutIndex(history, keepRecent);
      if (index === null) continue;
      expect(isValidCutPoint(history, index)).toBe(true);
    }
  });

  it("returns null when the whole history is one unsplittable exchange", () => {
    expect(findCutIndex(toolBlock(), 100)).toBeNull();
  });
});

// --- serialization ----------------------------------------------------------

describe("contextCompactor summary serialization", () => {
  it("labels every speaker so the model summarizes instead of continuing", () => {
    expect(serializeForSummary([user("hi"), model("hello")])).toBe(
      "[User]: hi\n[Assistant]: hello",
    );
  });

  it("records tool calls made by the assistant", () => {
    const out = serializeForSummary([modelCalling("on it", "write_file")]);
    expect(out).toContain("[Assistant]: on it");
    expect(out).toContain("→ called write_file(");
  });

  it("clips oversized tool results without mutating the source message", () => {
    const big = chars(10_000);
    const message = toolResult("read_file", big);

    const out = serializeForSummary([message]);

    expect(out).toContain("[Tool result] read_file:");
    expect(out).toContain(
      `[... truncated ${10_000 - TOOL_RESULT_SUMMARY_CAP} chars]`,
    );
    expect(out.length).toBeLessThan(big.length);
    // The live history keeps the full result — the turn in progress may need it.
    expect(message.content).toHaveLength(10_000);
  });

  it("finds a prior summary and returns null when there is none", () => {
    const summary = user(`${SUMMARY_MARKER}\nEARLIER FACTS`);
    expect(extractPriorSummary([user("a"), summary, model("b")])).toBe(
      "EARLIER FACTS",
    );
    expect(extractPriorSummary([user("a"), model("b")])).toBeNull();
  });
});

// --- compaction -------------------------------------------------------------

describe("compactHistory", () => {
  it("does nothing while history still fits the window", async () => {
    const history = alternatingTurns(4);
    const summarize = vi.fn();

    expect(needsCompaction(history, DEFAULT_CONTEXT_WINDOW_TOKENS)).toBe(false);
    await expect(
      compactHistory({
        history,
        contextWindowTokens: DEFAULT_CONTEXT_WINDOW_TOKENS,
        summarize,
      }),
    ).resolves.toBeNull();
    expect(summarize).not.toHaveBeenCalled();
  });

  it("does nothing — and spends nothing — when no safe cut exists", async () => {
    const history = toolBlock();
    const summarize = vi.fn();

    expect(needsCompaction(history, SMALL_WINDOW)).toBe(true);
    await expect(
      compactHistory({ history, contextWindowTokens: SMALL_WINDOW, summarize }),
    ).resolves.toBeNull();
    // Critically: no summarizing call was paid for on a history we cannot fix.
    expect(summarize).not.toHaveBeenCalled();
  });

  it("replaces the dropped range with a labelled summary and keeps the tail intact", async () => {
    const history = alternatingTurns(20);
    const summarize = vi.fn().mockResolvedValue("GOAL: ship it. DONE: nothing yet.");

    const outcome = await compactHistory({
      history,
      contextWindowTokens: SMALL_WINDOW,
      summarize,
    });

    expect(outcome).not.toBeNull();
    expect(summarize).toHaveBeenCalledTimes(1);

    const head = outcome!.history[0];
    expect(head.role).toBe("user");
    expect(head.content).toContain(SUMMARY_MARKER);
    expect(head.content).toContain("GOAL: ship it.");

    // The kept tail is the original objects, untouched.
    const tail = outcome!.history.slice(1);
    expect(tail).toHaveLength(history.length - outcome!.cutIndex);
    tail.forEach((message, i) => {
      expect(message).toBe(history[outcome!.cutIndex + i]);
    });

    expect(outcome!.messagesAfter).toBeLessThan(outcome!.messagesBefore);
    expect(outcome!.tokensAfter).toBeLessThan(outcome!.tokensBefore);
    // Pure: the caller's array is not touched.
    expect(history).toHaveLength(20);
  });

  it("never produces a history that opens on a tool result", async () => {
    const history = [...alternatingTurns(16), ...toolBlock(2000)];
    const summarize = vi.fn().mockResolvedValue("summary");

    const outcome = await compactHistory({
      history,
      contextWindowTokens: SMALL_WINDOW,
      summarize,
    });

    expect(outcome).not.toBeNull();
    expect(outcome!.history[1]?.role).not.toBe("tool");
  });

  it("folds a previous summary forward instead of discarding the early session", async () => {
    const history = [
      user(`${SUMMARY_MARKER}\nEARLIER FACTS: the target repo is luca-core.`),
      ...alternatingTurns(20),
    ];
    const summarize = vi.fn().mockResolvedValue("second summary");

    const outcome = await compactHistory({
      history,
      contextWindowTokens: SMALL_WINDOW,
      summarize,
    });

    expect(outcome).not.toBeNull();
    const prompt = summarize.mock.calls[0][0] as string;

    expect(prompt).toContain("EARLIER FACTS: the target repo is luca-core.");
    expect(prompt).toContain("A summary of even earlier turns already exists");
    // The old summary is carried as prior context, not replayed as a user turn.
    expect(prompt).not.toContain(`[User]: ${SUMMARY_MARKER}`);
  });

  it("surfaces an empty summary as an error rather than dropping history silently", async () => {
    const history = alternatingTurns(20);

    await expect(
      compactHistory({
        history,
        contextWindowTokens: SMALL_WINDOW,
        summarize: vi.fn().mockResolvedValue("   "),
      }),
    ).rejects.toThrow(/empty summary/i);
  });

  it("converges when run repeatedly", async () => {
    let history: ChatMessage[] = alternatingTurns(40);
    const summarize = vi.fn().mockResolvedValue("summary");

    for (let pass = 0; pass < 3; pass++) {
      const outcome = await compactHistory({
        history,
        contextWindowTokens: SMALL_WINDOW,
        summarize,
      });
      if (!outcome) break;
      expect(outcome.history.length).toBeLessThanOrEqual(history.length);
      expect(outcome.history[0].content).toContain(SUMMARY_MARKER);
      history = outcome.history;
    }

    // Exactly one summary envelope survives — they do not stack up.
    const envelopes = history.filter((m) => m.content?.includes(SUMMARY_MARKER));
    expect(envelopes).toHaveLength(1);
  });
});

// --- wiring -----------------------------------------------------------------
//
// Read through process.getBuiltinModule('node:fs'): vite.config.ts aliases
// `fs`/`node:fs` to a browser polyfill, so a plain import returns '' under vitest
// and every assertion below would pass vacuously.

const turnRunnerSource = readFileSync("src/services/turns/TurnRunner.ts", "utf8");
const lucaServiceSource = readFileSync("src/services/lucaService.ts", "utf8");

describe("TurnRunner compaction wiring", () => {
  it("imports the compactor", () => {
    expect(turnRunnerSource).toContain('from "./contextCompactor"');
    expect(turnRunnerSource).toContain("compactHistory");
    expect(turnRunnerSource).toContain("needsCompaction");
  });

  it("compacts before the provider call in both turn loops", () => {
    const streamStart = turnRunnerSource.indexOf("async runStreamTurn(");
    const plainStart = turnRunnerSource.indexOf("async runTurn(");

    expect(streamStart).toBeGreaterThan(-1);
    expect(plainStart).toBeGreaterThan(streamStart);

    const streamCall = turnRunnerSource.indexOf(
      "await this.maybeCompact(",
      streamStart,
    );
    expect(streamCall).toBeGreaterThan(streamStart);
    expect(streamCall).toBeLessThan(plainStart);
    // ...and the history snapshot the provider gets is read AFTER compaction.
    expect(
      turnRunnerSource.indexOf("lucaService.getTurnState()", streamCall),
    ).toBeGreaterThan(streamCall);

    const plainCall = turnRunnerSource.indexOf(
      "await this.maybeCompact(",
      plainStart,
    );
    expect(plainCall).toBeGreaterThan(plainStart);
    expect(
      turnRunnerSource.indexOf("lucaService.getTurnState()", plainCall),
    ).toBeGreaterThan(plainCall);
  });

  it("writes compacted history back through the narrow setter", () => {
    expect(turnRunnerSource).toContain(
      "lucaService.replaceHistoryAfterCompaction(outcome.history)",
    );
    expect(lucaServiceSource).toContain(
      "public replaceHistoryAfterCompaction(next: ChatMessage[])",
    );
  });

  it("keeps compaction bookkeeping on the turn, not on the singleton runner", () => {
    // Two turns running against one runner instance must not share the
    // already-attempted guard, or one turn's no-op suppresses the next's.
    const declarations = turnRunnerSource.match(
      /const compactionState: CompactionState = \{ lastAttemptedLength: -1 \};/g,
    );
    expect(declarations).toHaveLength(2);
  });

  it("never lets a failed summary take down the turn", () => {
    const helperStart = turnRunnerSource.indexOf("private async maybeCompact(");
    expect(helperStart).toBeGreaterThan(-1);
    const helperEnd = turnRunnerSource.indexOf("async runStreamTurn(", helperStart);
    const helper = turnRunnerSource.slice(helperStart, helperEnd);

    expect(helper).toContain("try {");
    expect(helper).toContain("catch");
    expect(helper).toContain("Compaction failed");
  });
});
