/**
 * Tests for the renderer's scratchpad client — `luca.state`'s durable half.
 *
 * `fetch` is stubbed rather than a core stood up, because the property under test
 * is not HTTP: it is **whether this client will ever claim a write that did not
 * land.** `sessionLease.ts` is allowed to shrug off a missing core and carry on;
 * this file must not. Every failure path below has to come back
 * `persisted: false` with something a human can read, and none of them may throw,
 * because the caller is a tool handler mid-turn.
 *
 * The second load-bearing group is `replace`. A flush deletes keys by absence, so
 * a flush without a successful load behind it must merge instead — otherwise one
 * unreachable moment turns into a wiped session.
 *
 * `../../config/api` is mocked for the same reason as in the lease test: the real
 * `waitForAuth` waits two seconds outside Electron. `./sessionTranscript` is
 * mocked so the resolved session id can be moved around, including to `null`.
 */

// The real fs, past the `node:fs` alias in vite.config.ts — a plain import
// resolves to a browser polyfill whose readFileSync returns '', which would make
// the route assertions at the bottom pass against an empty string.
const { readFileSync } = process.getBuiltinModule("node:fs");

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/api", () => ({
  apiUrl: (path: string) => `http://core.test${path}`,
  getAuthHeaders: () => ({ "Content-Type": "application/json" }),
  waitForAuth: () => Promise.resolve(),
}));

vi.mock("./sessionTranscript", () => ({
  detectSurface: () => "web",
  sessionTranscript: { status: () => ({ sessionId: resolvedSessionId }) },
}));

import {
  SCRATCHPAD_TIMEOUT_MS,
  SessionScratchpad,
  publishedScratchpadStatus,
} from "./sessionScratchpad";

const sourceOf = (relative: string): string =>
  readFileSync(
    new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    "utf8",
  );

const SESSION_ID = "session_test_1";
const URL_FOR = `http://core.test/api/session/${SESSION_ID}/scratchpad`;

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
  signal: unknown;
}

const respond = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const LIMITS = { maxKeyBytes: 262_144, maxSessionBytes: 1_048_576, maxKeys: 64 };

const stored = (state: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  respond({
    sessionId: SESSION_ID,
    state,
    corruptKeys: [],
    bytesUsed: JSON.stringify(state).length,
    keyCount: Object.keys(state).length,
    limits: LIMITS,
    mock: false,
    degraded: false,
    schemaVersion: 1,
    ...extra,
  });

const written = (keyCount: number, bytesUsed: number) =>
  respond({
    sessionId: SESSION_ID,
    written: [],
    deleted: [],
    bytesUsed,
    keyCount,
    mock: false,
    degraded: false,
    schemaVersion: 1,
  });

/** What the store answers when a batch would exceed the session budget. */
const overBudget = () =>
  respond(
    {
      error:
        "Scratchpad for session would use 1200000 bytes, over the 1048576-byte limit. " +
        "Nothing was written; clear a key first.",
      scope: "session",
      limit: 1_048_576,
      bytesUsed: 1_200_000,
      keyCount: 4,
    },
    413,
  );

/** Mutated by tests; read through the `./sessionTranscript` mock above. */
let resolvedSessionId: string | null = SESSION_ID;

let pad: SessionScratchpad;
let calls: Call[] = [];
let handler: (call: Call, attempt: number) => Response | Promise<Response>;

const gets = (): Call[] => calls.filter((c) => c.method === "GET");
const puts = (): Call[] => calls.filter((c) => c.method === "PUT");

beforeEach(() => {
  resolvedSessionId = SESSION_ID;
  calls = [];
  handler = (call) => (call.method === "GET" ? stored({}) : written(0, 0));

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
      signal: init?.signal,
    };
    calls.push(call);
    return handler(call, calls.length);
  });

  delete (globalThis as typeof globalThis & { __LUCA_SCRATCHPAD?: unknown }).__LUCA_SCRATCHPAD;
  pad = new SessionScratchpad();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sessionScratchpad — load", () => {
  it("returns the durable state and marks it authoritative", async () => {
    handler = () => stored({ rows: [1, 2, 3], label: "batch-7" });

    const load = await pad.load();

    expect(load).toMatchObject({
      state: { rows: [1, 2, 3], label: "batch-7" },
      persisted: true,
      reason: null,
      keyCount: 2,
    });
    expect(gets()).toHaveLength(1);
    expect(gets()[0]?.url).toBe(URL_FOR);
  });

  it("arms the read with a timeout, so a hung core cannot stall the tool call", async () => {
    await pad.load();

    const signal = gets()[0]?.signal as AbortSignal | undefined;
    expect(signal).toBeTruthy();
    expect(typeof signal?.aborted).toBe("boolean");
    // The script race in programmaticToolExecutor.ts is 30s; two round trips plus
    // the body have to fit inside it.
    expect(SCRATCHPAD_TIMEOUT_MS * 2).toBeLessThan(30_000);
  });

  it("publishes the limits so a caller can say how full it is", async () => {
    const load = await pad.load();

    expect(load.limits).toEqual(LIMITS);
    expect(publishedScratchpadStatus()).toMatchObject({ loaded: true, limits: LIMITS });
  });

  it("reads as empty-and-unknown when the core is not there", async () => {
    handler = () => {
      throw new TypeError("fetch failed");
    };

    const load = await pad.load();

    // Empty *and* unpersisted: the caller must be able to tell this from a
    // scratchpad that is genuinely empty, which is why `persisted` exists on a read.
    expect(load.state).toEqual({});
    expect(load.persisted).toBe(false);
    expect(load.reason).toContain("fetch failed");
    expect(pad.status().loaded).toBe(false);
  });

  it("reads as unknown on an HTTP failure, quoting the core's own message", async () => {
    handler = () => respond({ error: "Session store is not writable", degraded: true }, 503);

    const load = await pad.load();

    expect(load.persisted).toBe(false);
    expect(load.reason).toBe("Session store is not writable");
  });

  it("refuses a degraded store as a baseline even when it answers 200", async () => {
    // A mock store reads fine and refuses every write. Treating that read as a
    // baseline would let a later merge behave like a replace.
    handler = () => stored({ rows: [1] }, { degraded: true });

    const load = await pad.load();

    expect(load.persisted).toBe(false);
    expect(load.reason).toContain("not writable");
  });

  it("does not throw or trust a response that is not JSON", async () => {
    handler = () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("not json");
        },
      }) as unknown as Response;

    await expect(pad.load()).resolves.toMatchObject({ persisted: false, state: {} });
  });

  it("loads as unknown before a session id exists, without calling the core", async () => {
    resolvedSessionId = null;

    const load = await pad.load();

    expect(load).toMatchObject({ persisted: false, state: {} });
    expect(load.reason).toContain("no session id");
    expect(calls).toHaveLength(0);
  });

  it("names unreadable keys, because the next save deletes them by absence", async () => {
    handler = () => stored({ good: 1 }, { corruptKeys: ["broken"], keyCount: 2 });

    const load = await pad.load();

    expect(load.persisted).toBe(true);
    expect(load.state).toEqual({ good: 1 });
    expect(load.reason).toContain("broken");
    expect(load.reason).toContain("dropped by the next save");
  });
});

describe("sessionScratchpad — save", () => {
  it("sends the whole object once, authoritatively, after a successful load", async () => {
    await pad.load();
    handler = () => written(1, 42);

    const save = await pad.save({ rows: [1, 2] });

    expect(save).toMatchObject({ persisted: true, reason: null, bytesUsed: 42, keyCount: 1 });
    expect(puts()).toHaveLength(1);
    expect(puts()[0]?.url).toBe(URL_FOR);
    expect(puts()[0]?.body).toEqual({
      state: { rows: [1, 2] },
      surface: "web",
      // The whole point of PUT here: a key the script deleted is absent, and
      // absence has to mean deletion.
      replace: true,
    });
  });

  it("merges instead of replacing when the load failed, and says so", async () => {
    handler = () => {
      throw new TypeError("fetch failed");
    };
    await pad.load();

    handler = () => written(3, 99);
    const save = await pad.save({ fresh: true });

    expect(save.persisted).toBe(true);
    expect(puts()[0]?.body).toMatchObject({ replace: false });
    // The caveat is stated rather than silently applied: this write could add and
    // overwrite, but a deletion in it did not happen.
    expect(save.reason).toContain("removed none");
  });

  it("does not make itself a baseline by merging", async () => {
    handler = (call) => (call.method === "GET" ? respond({}, 503) : written(1, 10));

    await pad.load();
    await pad.save({ a: 1 });
    await pad.save({ a: 1 });

    // Both writes merge. A second flush that suddenly claimed authority would
    // delete the keys the failed load never showed us.
    expect(puts().map((c) => c.body?.replace)).toEqual([false, false]);
    expect(pad.status().loaded).toBe(false);
  });

  it("reports an over-budget refusal as a failure, never as a success", async () => {
    await pad.load();
    handler = () => overBudget();

    const save = await pad.save({ rows: new Array(1000).fill("x") });

    expect(save.persisted).toBe(false);
    expect(save.reason).toContain("1048576-byte limit");
    expect(save.reason).toContain("Nothing was written");
    expect(pad.status().failedSaves).toBe(1);
  });

  it("reports an unreachable core as a failure and counts it", async () => {
    await pad.load();
    handler = () => {
      throw new TypeError("fetch failed");
    };

    const save = await pad.save({ rows: [1] });

    expect(save).toMatchObject({ persisted: false });
    expect(save.reason).toContain("fetch failed");
    expect(pad.status()).toMatchObject({ failedSaves: 1, lastError: "fetch failed" });
  });

  it("refuses a state that cannot be serialised without sending anything", async () => {
    await pad.load();
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;

    const save = await pad.save(circular);

    expect(save.persisted).toBe(false);
    expect(save.reason).toContain("cannot be stored as JSON");
    // Half a state on disk is worse than none: on the next read it is
    // indistinguishable from a whole one.
    expect(puts()).toHaveLength(0);
  });

  it("names keys JSON drops, while still storing the rest", async () => {
    await pad.load();
    handler = () => written(1, 12);

    const save = await pad.save({ rows: [1], parse: () => 1 });

    expect(save.persisted).toBe(true);
    expect(save.reason).toContain("parse");
    expect(save.reason).toContain("functions cannot be stored");
    expect(puts()[0]?.body?.state).toEqual({ rows: [1] });
  });

  it("fails without a session id, without calling the core", async () => {
    resolvedSessionId = null;

    const save = await pad.save({ rows: [1] });

    expect(save.persisted).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("keeps nothing in memory after a failed save", async () => {
    // The property that rules out an in-memory fallback: a value whose write was
    // refused must not reappear on the next read, because reappearing here and
    // vanishing after a restart is the silent lie 10-data-and-storage.md forbids.
    await pad.load();
    handler = () => overBudget();
    await pad.save({ rows: [1, 2, 3] });

    handler = () => stored({});
    const reloaded = await pad.load();

    expect(reloaded.state).toEqual({});
    expect(reloaded.persisted).toBe(true);
  });

  it("publishes its status where a diagnostic can see it", async () => {
    await pad.load();
    handler = () => written(2, 64);
    await pad.save({ a: 1, b: 2 });

    expect(publishedScratchpadStatus()).toMatchObject({
      sessionId: SESSION_ID,
      surface: "web",
      loaded: true,
      keyCount: 2,
      bytesUsed: 64,
      failedSaves: 0,
      lastError: null,
    });
    expect(publishedScratchpadStatus()?.lastSavedAt).toBeGreaterThan(0);
  });
});

describe("sessionScratchpad — wiring", () => {
  const routeSource = sourceOf("../../../cortex/server/api/routes/session.routes.js");
  const clientSource = sourceOf("./sessionScratchpad.ts");

  it("reads its sources (guards against vacuous assertions)", () => {
    expect(routeSource).toContain("sendStoreError");
    expect(clientSource).toContain("class SessionScratchpad");
  });

  it("declares the scratchpad routes above the general GET /:id", () => {
    // The file's specific-before-general order, which the entries and lease routes
    // already follow. `'/:id'` matches one segment, so today it cannot swallow
    // `/:id/scratchpad` — but declaration order is the only thing that protects
    // these three the moment that route grows a wildcard or a prefix match, and
    // Express gives no warning when a later route becomes unreachable.
    const general = routeSource.indexOf("router.get('/:id',");
    expect(general).toBeGreaterThan(-1);

    for (const needle of [
      "router.get('/:id/scratchpad'",
      "router.put('/:id/scratchpad'",
      "router.delete('/:id/scratchpad'",
    ]) {
      const at = routeSource.indexOf(needle);
      expect(at, needle).toBeGreaterThan(-1);
      expect(at, needle).toBeLessThan(general);
    }
  });

  it("maps a full scratchpad to 413 rather than a generic 500", () => {
    expect(routeSource).toContain("SESSION_ERRORS.SCRATCHPAD_FULL");
    expect(routeSource).toContain("res.status(413)");
  });

  it("reads the session id rather than resolving it", () => {
    // `sessionTranscript.getCurrentSessionId()` awaits `waitForAuth()`, a flat two
    // seconds outside Electron, and this client runs on the tool path.
    //
    // Matched on the call form: the bare name appears in this client's own header
    // explaining why it avoids the call, and an assertion that a file must not
    // mention a hazard would fail on the note describing it.
    expect(clientSource).toContain("sessionTranscript.status().sessionId");
    expect(clientSource).not.toContain("sessionTranscript.getCurrentSessionId");
    expect(clientSource).not.toContain("await sessionTranscript");
  });
});
