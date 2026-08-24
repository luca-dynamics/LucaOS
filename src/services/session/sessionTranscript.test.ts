/**
 * Tests for the renderer's session transcript client.
 *
 * `fetch` is stubbed rather than a server stood up, because what needs pinning
 * here is not HTTP but the two promises this file makes to the turn loop: entries
 * reach the store **in order**, and a failure is **never** mistaken for a success.
 *
 * The api config module is mocked because the real `waitForAuth` waits two
 * seconds outside Electron, and the real `apiUrl` resolves an ephemeral port
 * through `window.luca`.
 */

const { readFileSync } = process.getBuiltinModule("node:fs");

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/api", () => ({
  apiUrl: (path: string) => `http://core.test${path}`,
  getAuthHeaders: () => ({ "Content-Type": "application/json" }),
  waitForAuth: () => Promise.resolve(),
}));

import { SUMMARY_MARKER } from "../turns/contextCompactor";
import {
  HYDRATION_TOKEN_BUDGET,
  SessionTranscript,
  buildHistory,
  publishedTranscriptStatus,
  toTranscriptEntry,
  type TranscriptEntryRow,
  type TranscriptRole,
} from "./sessionTranscript";

const sourceOf = (relative: string): string =>
  readFileSync(
    new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    "utf8",
  );

const SESSION = {
  id: "session_test_1",
  title: null,
  status: "active",
  schemaVersion: 1,
  createdAt: 1,
  updatedAt: 1,
};

interface SentEntry {
  role: string;
  content?: string;
  clientId: string;
  surface: string;
  toolCalls?: unknown;
}

interface Call {
  url: string;
  method: string;
  entries: SentEntry[];
}

const respond = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

let transcript: SessionTranscript;
let calls: Call[] = [];
let attempts = 0;
let inFlight = 0;
let maxInFlight = 0;
let storedRows: TranscriptEntryRow[] = [];
let currentSessionResponse: () => Response;
let entryHandler: (call: Call, attempt: number) => Promise<Response> | Response;

const posts = (): Call[] =>
  calls.filter((c) => c.method === "POST" && c.url.includes("/entries"));

const sentRoles = (): string[] =>
  posts().flatMap((c) => c.entries.map((e) => e.content ?? e.role));

beforeEach(() => {
  calls = [];
  attempts = 0;
  inFlight = 0;
  maxInFlight = 0;
  storedRows = [];
  currentSessionResponse = () =>
    respond({ session: SESSION, mock: false, degraded: false, schemaVersion: 1 });
  entryHandler = () => respond({ sessionId: SESSION.id, entries: [] });

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const parsed = init?.body
      ? (JSON.parse(String(init.body)) as { entries?: SentEntry[] })
      : null;
    const call: Call = { url, method, entries: parsed?.entries ?? [] };
    calls.push(call);

    if (method === "POST" && url.includes("/entries")) {
      attempts += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        return await entryHandler(call, attempts);
      } finally {
        inFlight -= 1;
      }
    }
    if (url.includes("/api/session/current")) return currentSessionResponse();
    if (url.includes("/api/session/new")) {
      return respond({ session: { ...SESSION, id: "session_test_2" } });
    }
    if (url.includes("/entries")) {
      return respond({ sessionId: SESSION.id, entries: storedRows });
    }
    return respond({ error: "unrouted" }, 404);
  });

  transcript = new SessionTranscript();
});

afterEach(() => {
  transcript.stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sessionTranscript — appending", () => {
  it("sends entries in append order, one request at a time", async () => {
    transcript.append({ role: "user", content: "a" });
    transcript.append({ role: "model", content: "b" });
    transcript.append({ role: "tool", content: "c", toolCallId: "call_1" });
    await transcript.flush();

    expect(sentRoles()).toEqual(["a", "b", "c"]);
    expect(maxInFlight).toBe(1);
    expect(transcript.status().pending).toBe(0);
  });

  it("does not let entries appended mid-flight overtake the batch in flight", async () => {
    // The gate is built up front so `release` is assigned synchronously; the
    // handler only awaits it. Assigning it inside the handler instead would make
    // TypeScript keep the `null` narrowing at the call site below.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let handlerReached = false;
    entryHandler = async (_call, attempt) => {
      if (attempt === 1) {
        handlerReached = true;
        await gate;
      }
      return respond({ sessionId: SESSION.id, entries: [] });
    };

    transcript.append({ role: "user", content: "first" });
    const flushing = transcript.flush();
    // Let the first request reach the handler and block there.
    await vi.waitFor(() => expect(handlerReached).toBe(true));

    transcript.append({ role: "user", content: "second" });
    release();
    await flushing;
    await transcript.flush();

    expect(sentRoles()).toEqual(["first", "second"]);
    expect(maxInFlight).toBe(1);
  });

  it("stamps each entry with an id and the writing surface", async () => {
    transcript.append({ role: "user", content: "a" });
    transcript.append({ role: "user", content: "b" });
    await transcript.flush();

    const [sent] = posts();
    const ids = sent.entries.map((e) => e.clientId);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every(Boolean)).toBe(true);
    expect(sent.entries.every((e) => Boolean(e.surface))).toBe(true);
  });

  it("resolves the session id once and reuses it", async () => {
    transcript.append({ role: "user", content: "a" });
    await transcript.flush();
    transcript.append({ role: "user", content: "b" });
    await transcript.flush();

    expect(calls.filter((c) => c.url.includes("/current"))).toHaveLength(1);
    expect(posts()).toHaveLength(2);
  });

  it("carries tool structure through to the request body", async () => {
    const toolCalls = [{ id: "call_1", name: "write_file", args: { path: "a" } }];
    transcript.appendMessage({
      role: "model",
      content: "working",
      thought: "planning",
      toolCalls,
    });
    await transcript.flush();

    expect(posts()[0]?.entries[0]).toMatchObject({
      role: "model",
      content: "working",
      thought: "planning",
      toolCalls,
    });
  });
});

describe("sessionTranscript — failure is never silence", () => {
  it("retries a failed batch with the same client ids, so the retry cannot double-write", async () => {
    vi.useFakeTimers();
    entryHandler = (_call, attempt) => {
      if (attempt === 1) throw new Error("ECONNREFUSED");
      return respond({ sessionId: SESSION.id, entries: [] });
    };

    transcript.append({ role: "user", content: "a" });
    transcript.append({ role: "model", content: "b" });
    await transcript.flush();

    expect(transcript.status().pending).toBe(2);
    expect(transcript.status().consecutiveFailures).toBe(1);

    await vi.advanceTimersByTimeAsync(2_000);
    await transcript.flush();

    expect(posts()).toHaveLength(2);
    expect(posts()[1]?.entries.map((e) => e.clientId)).toEqual(
      posts()[0]?.entries.map((e) => e.clientId),
    );
    expect(transcript.status().pending).toBe(0);
    expect(transcript.status().consecutiveFailures).toBe(0);
  });

  it("gets loud once failures persist and entries are backing up", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    entryHandler = () => {
      throw new Error("core is down");
    };

    transcript.append({ role: "user", content: "a" });
    await transcript.flush();
    await transcript.flush();
    await transcript.flush();

    expect(transcript.status().unpersisted).toBe(true);
    expect(transcript.status().pending).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("NOT persisted"),
    );
  });

  it("keeps quiet about a single miss while the core is still warming up", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    currentSessionResponse = () => respond({ warming: true }, 503);

    transcript.append({ role: "user", content: "a" });
    await transcript.flush();

    expect(transcript.status().pending).toBe(1);
    expect(transcript.status().unpersisted).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });

  it("re-resolves the session when the one it holds is unknown", async () => {
    vi.useFakeTimers();
    entryHandler = (_call, attempt) =>
      attempt === 1
        ? respond({ error: "Unknown session" }, 404)
        : respond({ sessionId: SESSION.id, entries: [] });

    transcript.append({ role: "user", content: "a" });
    await transcript.flush();
    await vi.advanceTimersByTimeAsync(2_000);
    await transcript.flush();

    expect(calls.filter((c) => c.url.includes("/current"))).toHaveLength(2);
    expect(transcript.status().pending).toBe(0);
  });

  it("drops a batch the store rejects outright, loudly and counted, rather than blocking every later entry", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    entryHandler = (_call, attempt) =>
      attempt === 1
        ? respond({ error: 'Unknown entry role "assistant"' }, 400)
        : respond({ sessionId: SESSION.id, entries: [] });

    transcript.append({ role: "user", content: "bad" });
    await transcript.flush();

    expect(transcript.status().rejected).toBe(1);
    expect(transcript.status().pending).toBe(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("NOT saved"));

    transcript.append({ role: "user", content: "good" });
    await transcript.flush();
    expect(posts()[1]?.entries.map((e) => e.content)).toEqual(["good"]);
  });

  it("never throws into a turn, even when fetch explodes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", () => {
      throw new Error("no network at all");
    });

    expect(() => transcript.append({ role: "user", content: "a" })).not.toThrow();
    await expect(transcript.flush()).resolves.toBeUndefined();
    expect(transcript.status().pending).toBe(1);
  });

  it("publishes its status where a diagnostic can see it", async () => {
    transcript.append({ role: "user", content: "a" });
    await transcript.flush();

    expect(publishedTranscriptStatus()).toMatchObject({
      sessionId: SESSION.id,
      pending: 0,
      unpersisted: false,
    });
  });

  it("reports a degraded server store instead of assuming the write landed", async () => {
    currentSessionResponse = () =>
      respond({ session: SESSION, mock: true, degraded: true, schemaVersion: 1 });

    transcript.append({ role: "user", content: "a" });
    await transcript.flush();

    expect(transcript.status().degraded).toBe(true);
  });
});

describe("sessionTranscript — hydration", () => {
  let seq = 0;
  const row = (
    role: TranscriptRole,
    content: string,
    extra: Partial<TranscriptEntryRow> = {},
  ): TranscriptEntryRow => ({
    seq: ++seq,
    parentSeq: null,
    role,
    content,
    thought: null,
    toolName: null,
    toolCallId: null,
    toolCalls: null,
    surface: "desktop",
    schemaVersion: 1,
    clientId: null,
    createdAt: 0,
    ...extra,
  });

  beforeEach(() => {
    seq = 0;
  });

  it("reads the tail and maps it back to provider-shaped messages", async () => {
    const toolCalls = [{ id: "call_1", name: "read_file", args: { path: "a" } }];
    storedRows = [
      row("user", "read a"),
      row("model", "on it", { toolCalls, thought: "planning" }),
      row("tool", "contents", { toolCallId: "call_1", toolName: "read_file" }),
      row("model", "done"),
    ];

    const history = await transcript.loadHistory();

    expect(calls.some((c) => c.url.includes("tail="))).toBe(true);
    expect(history).toEqual([
      { role: "user", content: "read a" },
      { role: "model", content: "on it", thought: "planning", toolCalls },
      {
        role: "tool",
        content: "contents",
        toolCallId: "call_1",
        name: "read_file",
      },
      { role: "model", content: "done" },
    ]);
  });

  it("returns an empty history rather than throwing when the read fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    storedRows = [];
    currentSessionResponse = () => respond({ session: SESSION });
    vi.stubGlobal("fetch", async (url: string) =>
      url.includes("/current")
        ? respond({ session: SESSION })
        : respond({ error: "boom" }, 500),
    );

    await expect(transcript.loadHistory()).resolves.toEqual([]);
  });

  it("starts at the newest summary and drops what it already covers", () => {
    const history = buildHistory([
      row("user", "ancient"),
      row("model", "ancient reply"),
      row("summary", "the user asked about X"),
      row("user", "recent"),
    ]);

    expect(history).toEqual([
      { role: "user", content: `${SUMMARY_MARKER}\nthe user asked about X` },
      { role: "user", content: "recent" },
    ]);
  });

  it("wraps a stored summary so a later compaction can still fold it in", () => {
    const [summary] = buildHistory([row("summary", "earlier work")]);
    // compactHistory's extractPriorSummary matches on exactly this prefix.
    expect(summary?.role).toBe("user");
    expect(summary?.content?.startsWith(SUMMARY_MARKER)).toBe(true);
  });

  it("never opens a history on a tool result", () => {
    const toolCalls = [{ id: "call_1", name: "big", args: {} }];
    const rows = [
      row("user", "go"),
      // ~11k tokens: too big to fit, so the budget alone would start at the
      // tool result below it.
      row("model", "c".repeat(44_000), { toolCalls }),
      row("tool", "x".repeat(40_000), { toolCallId: "call_1" }), // ~10k tokens
      row("model", "finished"),
    ];

    const history = buildHistory(rows, 20_000);

    // An orphaned tool result is a hard provider error, so the start moves
    // forward past it rather than back to the model message it belongs to.
    expect(history[0]?.role).not.toBe("tool");
    expect(history.map((m) => m.role)).toEqual(["model"]);
    expect(history[0]?.content).toBe("finished");
  });

  it("honours maxTokens, keeping the newest entries", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row("user", `${i}:${"y".repeat(4_000)}`),
    );

    const history = buildHistory(rows, 3_000);

    expect(history).toHaveLength(2);
    expect(history[history.length - 1]?.content?.startsWith("9:")).toBe(true);
  });

  it("keeps a single oversized entry rather than returning nothing", () => {
    const history = buildHistory([row("user", "z".repeat(100_000))], 10);
    expect(history).toHaveLength(1);
  });

  it("handles an empty transcript", () => {
    expect(buildHistory([])).toEqual([]);
  });

  it("budgets to what compaction would keep, so the first turn back never has to compact", () => {
    expect(HYDRATION_TOKEN_BUDGET).toBeGreaterThan(0);
    const rows = Array.from({ length: 200 }, () => row("user", "x".repeat(4_000)));
    const history = buildHistory(rows);
    const tokens = history.reduce(
      (sum, m) => sum + Math.ceil((m.content?.length ?? 0) / 4) + 4,
      0,
    );

    expect(history.length).toBeLessThan(rows.length);
    expect(tokens).toBeLessThanOrEqual(HYDRATION_TOKEN_BUDGET);
  });
});

describe("sessionTranscript — message conversion", () => {
  it("keeps the fields the Chroma path used to destroy", () => {
    expect(
      toTranscriptEntry({
        role: "tool",
        content: "result",
        toolCallId: "call_9",
        name: "run_command",
      }),
    ).toEqual({
      role: "tool",
      content: "result",
      thought: undefined,
      toolName: "run_command",
      toolCallId: "call_9",
      toolCalls: undefined,
    });
  });
});

describe("session transcript — wiring", () => {
  const serverSource = sourceOf("../../../server.js");
  const lucaSource = sourceOf("../lucaService.ts");
  const turnRunnerSource = sourceOf("../turns/TurnRunner.ts");

  it("reads its sources (guards against vacuous assertions)", () => {
    expect(serverSource).toContain("ROUTE_GROUPS");
    expect(lucaSource).toContain("private async initChat");
    expect(turnRunnerSource).toContain("maybeCompact");
  });

  it("registers the session routes eagerly, since boot hydration needs them", () => {
    const line =
      serverSource
        .split(/\r?\n/)
        .find((l) => l.includes("id: 'session'")) ?? "";

    expect(line).toContain("'/api/session'");
    expect(line).toContain("tier: 1");
  });

  it("registers them before the groups mounted at the /api root", () => {
    const session = serverSource.indexOf("id: 'session'");
    const root = serverSource.indexOf("id: 'root'");
    const automation = serverSource.indexOf("id: 'automation'");

    expect(session).toBeGreaterThan(0);
    // The /api-root groups are last on purpose so specific prefixes match first.
    expect(root).toBeGreaterThan(session);
    expect(automation).toBeGreaterThan(session);
  });

  it("hydrates history from the transcript, not from the vector index", () => {
    expect(lucaSource).toContain("sessionTranscript.loadHistory()");
    // The flattening reconstruction is gone, not merely bypassed.
    expect(lucaSource).not.toContain("getFormattedHistory");
    expect(lucaSource).not.toContain("getRecentConversations(20)");
  });

  it("records every appended message durably", () => {
    const durableWrites =
      lucaSource.split("sessionTranscript.appendMessage(entry)").length - 1;
    // appendUserMessage, appendModelMessage, appendToolMessage — all three, or a
    // turn is only partly recorded.
    expect(durableWrites).toBe(3);
  });

  it("carries live history across a device change instead of re-reading the old store", () => {
    expect(lucaSource).toContain("await this.initChat(this.localHistory);");
  });

  it("records a compaction as a new summary entry", () => {
    expect(turnRunnerSource).toContain("sessionTranscript.appendSummary(");
  });
});
