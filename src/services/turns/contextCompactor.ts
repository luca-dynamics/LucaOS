import type { ChatMessage } from "../llm/LLMProvider";

/**
 * Context compaction for the Luca turn loop.
 *
 * `lucaService.localHistory` only grows — every turn appends and nothing ever
 * removes. Past a few long tool-heavy exchanges the provider rejects the request
 * on context length, and because the history is never repaired EVERY later turn
 * in that session fails the same way. This module is the repair: when history
 * approaches the model's window, the oldest turns are replaced by a model-written
 * summary and the recent tail is kept verbatim.
 *
 * Everything here is pure and effect-free — no I/O, no provider handle, no
 * `lucaService` import. The summarizing call is injected as `summarize`, which is
 * what makes the cut-point rules testable without standing up the service graph.
 */

/**
 * Headroom left for the model's own reply plus the system instruction and tool
 * schemas, neither of which is counted in the history estimate. Scaled down for
 * small windows by `reserveTokensFor` — a flat 16k would swallow half of a 32k
 * local model.
 */
export const RESERVE_TOKENS = 16_384;

/** How much of the recent tail to keep verbatim. See `keepRecentTokensFor`. */
export const KEEP_RECENT_TOKENS = 20_000;

/**
 * Tool results are the bulk of a long history and the least useful part to a
 * summarizer, so they are clipped when serialized for summary. This clip applies
 * ONLY to the summary prompt — live results in `localHistory` are never altered,
 * because the turn in progress may genuinely need the full output.
 */
export const TOOL_RESULT_SUMMARY_CAP = 2_000;

/** Tool-call arguments get a tighter clip; a summarizer needs the shape, not the payload. */
export const TOOL_ARGS_SUMMARY_CAP = 500;

/**
 * Used when the model id matches nothing in `MODEL_CONTEXT_WINDOWS`. Deliberately
 * conservative: under-estimating the window compacts earlier than strictly
 * necessary, which costs one extra summarizing call, while over-estimating it
 * reproduces the exact bug this module exists to fix.
 */
export const DEFAULT_CONTEXT_WINDOW_TOKENS = 128_000;

/**
 * Prefix on the summary message. Two jobs: it tells the model it is reading
 * recovered context rather than something the user said (the summary rides in a
 * `user`-role message, because that is the one role every adapter maps cleanly —
 * neither GeminiAdapter nor AnthropicAdapter has a mid-history `system` branch),
 * and it is how `extractPriorSummary` finds the previous summary on a second pass.
 */
export const SUMMARY_MARKER =
  "[Conversation summary — earlier turns were compacted to fit the context window]";

/**
 * Rough per-message cost of role framing and delimiters, which the character
 * heuristic below cannot see. Small, but across a few hundred messages it is the
 * difference between compacting just in time and just too late.
 */
const PER_MESSAGE_OVERHEAD_TOKENS = 4;

/**
 * Context windows by model-id prefix, longest prefix first. Only families the app
 * actually routes to; anything else falls back to the conservative default.
 * Local runtimes carry a real `contextWindow` in their own catalog
 * (`src/services/local-models/LocalModelTypes.ts`) — pass it explicitly to
 * `contextWindowFor` rather than widening this table.
 */
const MODEL_CONTEXT_WINDOWS: ReadonlyArray<readonly [string, number]> = [
  ["gemini-", 1_000_000],
  ["claude-", 200_000],
  ["gpt-4.1", 1_000_000],
  ["gpt-4o", 128_000],
  ["gpt-5", 400_000],
  ["gpt-", 128_000],
  ["o1", 200_000],
  ["o3", 200_000],
  ["o4", 200_000],
  ["deepseek", 65_536],
  ["qwen", 32_768],
  ["llama", 32_768],
  ["mistral", 32_768],
  ["phi", 16_384],
  ["gemma", 8_192],
];

/**
 * Same 4-characters-per-token heuristic as
 * `MissionTapeCompressor.estimateTokens`. Duplicated rather than imported so the
 * turn loop pulls in no MissionTape types on a hot path; if you change one,
 * change the other.
 */
export function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Token cost of one message, counting reasoning and tool-call payloads. */
export function estimateMessageTokens(message: ChatMessage): number {
  if (!message) return 0;
  let tokens = PER_MESSAGE_OVERHEAD_TOKENS;
  tokens += estimateTokens(message.content);
  tokens += estimateTokens(message.thought);
  tokens += estimateTokens(message.name);
  if (message.toolCalls?.length) {
    for (const call of message.toolCalls) {
      tokens += estimateTokens(call?.name);
      try {
        tokens += estimateTokens(JSON.stringify(call?.args ?? {}));
      } catch {
        // Circular or otherwise unserializable args: charge a nominal cost rather
        // than throwing out of a pure estimator.
        tokens += PER_MESSAGE_OVERHEAD_TOKENS;
      }
    }
  }
  return tokens;
}

export function estimateHistoryTokens(history: readonly ChatMessage[]): number {
  let total = 0;
  for (const message of history) total += estimateMessageTokens(message);
  return total;
}

/**
 * Resolve the usable window for a model id. `explicitWindow` wins when the caller
 * knows better (e.g. a local runtime's catalog entry).
 */
export function contextWindowFor(
  model?: string | null,
  explicitWindow?: number | null,
): number {
  if (typeof explicitWindow === "number" && explicitWindow > 0) {
    return Math.floor(explicitWindow);
  }
  if (!model) return DEFAULT_CONTEXT_WINDOW_TOKENS;
  const id = model.toLowerCase();
  for (const [prefix, window] of MODEL_CONTEXT_WINDOWS) {
    if (id.startsWith(prefix) || id.includes(`/${prefix}`)) return window;
  }
  return DEFAULT_CONTEXT_WINDOW_TOKENS;
}

/**
 * Reserve scaled to the window. A flat `RESERVE_TOKENS` on a 32k model reserves
 * half the context, so cap it at a quarter of the window.
 */
export function reserveTokensFor(contextWindowTokens: number): number {
  return Math.max(
    1,
    Math.min(RESERVE_TOKENS, Math.floor(contextWindowTokens * 0.25)),
  );
}

/**
 * Keep-recent budget scaled to the window.
 *
 * This scaling is not cosmetic. With a flat 20k keep-recent, a 32k model has a
 * post-reserve budget of ~16k — smaller than the tail we refuse to cut — so
 * `findCutIndex` would never find a cut point and compaction would silently
 * never fire on exactly the models that need it most.
 */
export function keepRecentTokensFor(contextWindowTokens: number): number {
  const budget = contextWindowTokens - reserveTokensFor(contextWindowTokens);
  return Math.max(1, Math.min(KEEP_RECENT_TOKENS, Math.floor(budget * 0.5)));
}

/** True when history no longer fits the window with reply headroom left over. */
export function needsCompaction(
  history: readonly ChatMessage[],
  contextWindowTokens: number,
): boolean {
  const budget = contextWindowTokens - reserveTokensFor(contextWindowTokens);
  return estimateHistoryTokens(history) > budget;
}

/**
 * May a provider-bound history *begin* at `index`?
 *
 * This predicate is the whole safety story, and it is a provider requirement
 * rather than a matter of taste. `AnthropicAdapter` maps `role: "tool"` to a
 * `user` message carrying a `tool_result` block, and a `tool_result` with no
 * preceding `tool_use` is a hard API 400; `GeminiAdapter` maps it to a
 * `functionResponse` part under the same constraint. So a history may never open
 * on a tool result, which would orphan it from the model message that requested
 * it.
 *
 * Model messages that carry `toolCalls` are excluded too. Keeping the whole
 * call-plus-results block would in fact be legal, but starting a conversation
 * mid-action reads badly and buys little — the extra candidates are the handful
 * of messages between one action and the next.
 *
 * Compaction and boot hydration both need this rule, and they must not each
 * carry their own copy of it: `isValidCutPoint` (below) and
 * `sessionTranscript.loadHistory` are the two callers.
 */
export function canStartHistoryAt(
  history: readonly ChatMessage[],
  index: number,
): boolean {
  const message = history[index];
  if (!message) return false;
  if (message.role === "user") return true;
  if (message.role === "model") return !message.toolCalls?.length;
  return false;
}

/**
 * May the kept tail begin at `index`?
 *
 * The same rule as `canStartHistoryAt`, plus the requirement that a *cut* drop
 * something: index 0 keeps the whole history, which is not a cut, and an index
 * past the end keeps nothing.
 */
export function isValidCutPoint(
  history: readonly ChatMessage[],
  index: number,
): boolean {
  if (index <= 0 || index >= history.length) return false;
  return canStartHistoryAt(history, index);
}

/**
 * Index the kept tail should start at, or `null` when no safe cut exists.
 *
 * Walks backwards accumulating tokens and returns the first valid cut point found
 * once the keep-recent budget is spent, so the tail is at least
 * `keepRecentTokens` and the cut is always safe. `null` means the caller must
 * send uncompacted history and say so — guessing here is how you produce a 400.
 */
export function findCutIndex(
  history: readonly ChatMessage[],
  keepRecentTokens: number = KEEP_RECENT_TOKENS,
): number | null {
  let kept = 0;
  for (let i = history.length - 1; i > 0; i--) {
    kept += estimateMessageTokens(history[i]);
    if (kept >= keepRecentTokens && isValidCutPoint(history, i)) return i;
  }
  return null;
}

/** Clip `text` to `cap`, saying how much was dropped. */
export function truncateForSummary(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return `${text.slice(0, cap)}\n[... truncated ${text.length - cap} chars]`;
}

/**
 * Render messages as a labelled transcript for the summarizer.
 *
 * The `[User]:` / `[Assistant]:` / `[Tool result]:` prefixes are load-bearing:
 * handed an unlabelled transcript, a model tends to continue the conversation
 * instead of summarizing it.
 */
export function serializeForSummary(messages: readonly ChatMessage[]): string {
  const lines: string[] = [];
  for (const message of messages) {
    if (!message) continue;
    if (message.role === "user") {
      lines.push(`[User]: ${message.content ?? ""}`);
      continue;
    }
    if (message.role === "model") {
      const parts: string[] = [];
      if (message.content) parts.push(message.content);
      for (const call of message.toolCalls ?? []) {
        let args = "{}";
        try {
          args = JSON.stringify(call?.args ?? {});
        } catch {
          args = "[unserializable args]";
        }
        parts.push(
          `→ called ${call?.name ?? "unknown"}(${truncateForSummary(args, TOOL_ARGS_SUMMARY_CAP)})`,
        );
      }
      lines.push(`[Assistant]: ${parts.join("\n") || "(no content)"}`);
      continue;
    }
    if (message.role === "tool") {
      lines.push(
        `[Tool result] ${message.name ?? "unknown"}: ${truncateForSummary(message.content ?? "", TOOL_RESULT_SUMMARY_CAP)}`,
      );
      continue;
    }
    lines.push(`[System]: ${message.content ?? ""}`);
  }
  return lines.join("\n");
}

/**
 * Pull the summary text out of a previous compaction, if the dropped range
 * contains one. Without this a second compaction would summarize a range whose
 * only record of the early conversation is a summary it then discards, and the
 * beginning of the session would be lost outright.
 */
export function extractPriorSummary(
  messages: readonly ChatMessage[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i]?.content;
    if (content?.startsWith(SUMMARY_MARKER)) {
      return content.slice(SUMMARY_MARKER.length).trim() || null;
    }
  }
  return null;
}

/** True for the summary message produced by a previous compaction. */
export function isSummaryMessage(message: ChatMessage): boolean {
  return Boolean(message?.content?.startsWith(SUMMARY_MARKER));
}

/**
 * Build the summarizing prompt. The requested shape is deliberate: an agent
 * resuming from a summary needs the standing goal and the state of the world it
 * has already changed, not prose about the conversation.
 */
export function buildCompactionPrompt(
  serialized: string,
  priorSummary?: string | null,
): string {
  const carried = priorSummary
    ? `A summary of even earlier turns already exists. Fold it into your answer so nothing from the start of the session is lost:\n\n${priorSummary}\n\n---\n\n`
    : "";

  return `You are compacting the earlier part of a conversation so it can be dropped from the context window while remaining usable.

${carried}Transcript to summarize:

${serialized}

---

Write a summary under these headings, omitting any that do not apply. Be specific — name files, commands, values, and identifiers rather than describing them. Do not continue the conversation, do not address the user, and do not add commentary about the summary itself.

**Goal:** what the user is trying to achieve, in their own terms.
**Done:** actions actually completed, with their outcomes.
**Files read:** paths consulted.
**Files modified:** paths changed, and what changed in each.
**Facts:** decisions, constraints, credentials-free settings, and values that later turns depend on.
**Open:** what remains unfinished, and anything that failed and why.`;
}

export interface CompactionRequest {
  history: readonly ChatMessage[];
  contextWindowTokens: number;
  /** Injected summarizer — typically `provider.generateContent`. */
  summarize: (prompt: string) => Promise<string>;
}

export interface CompactionOutcome {
  history: ChatMessage[];
  cutIndex: number;
  messagesBefore: number;
  messagesAfter: number;
  tokensBefore: number;
  tokensAfter: number;
}

/**
 * Compact `history` if it needs it and a safe cut exists.
 *
 * Returns `null` for both no-op cases — under budget, or over budget with no
 * valid cut point — so the caller can log the second one and send uncompacted
 * rather than corrupting the tool-call structure. Throws only when the injected
 * summarizer fails or returns nothing; the caller is expected to catch that and
 * proceed uncompacted, since a failed summary is no reason to lose the turn.
 */
export async function compactHistory({
  history,
  contextWindowTokens,
  summarize,
}: CompactionRequest): Promise<CompactionOutcome | null> {
  const tokensBefore = estimateHistoryTokens(history);
  if (!needsCompaction(history, contextWindowTokens)) return null;

  const cutIndex = findCutIndex(history, keepRecentTokensFor(contextWindowTokens));
  if (cutIndex === null) return null;

  const dropped = history.slice(0, cutIndex);
  const priorSummary = extractPriorSummary(dropped);
  const serialized = serializeForSummary(
    dropped.filter((message) => !isSummaryMessage(message)),
  );

  const summary = (
    await summarize(buildCompactionPrompt(serialized, priorSummary))
  )?.trim();
  if (!summary) {
    throw new Error("Compaction summarizer returned an empty summary");
  }

  const next: ChatMessage[] = [
    { role: "user", content: `${SUMMARY_MARKER}\n${summary}` },
    ...history.slice(cutIndex),
  ];

  return {
    history: next,
    cutIndex,
    messagesBefore: history.length,
    messagesAfter: next.length,
    tokensBefore,
    tokensAfter: estimateHistoryTokens(next),
  };
}
