/**
 * Tests for the durable session transcript store.
 *
 * These run against a REAL SQLite database, not a mock: `process.getBuiltinModule`
 * reaches the runtime's built-in `node:sqlite` directly, bypassing the
 * `vite.config.ts` alias that would otherwise hand back the throwing browser
 * stub. Same reason the repo's source-assertion tests use
 * `process.getBuiltinModule('node:fs')`.
 *
 * The shared `db.js` handle is mocked out entirely — the store takes an
 * injectable handle precisely so these tests never touch the user's luca.db, and
 * the mock is marked `__isMockStore` so any accidental use of the default handle
 * fails loudly instead of silently passing.
 */

const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
const { readFileSync } = process.getBuiltinModule("node:fs");

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/services/db.js", () => ({
  default: { __isMockStore: true, __degraded: true },
}));

import {
  DEFAULT_LEASE_TTL_MS,
  ENTRY_ROLES,
  MAX_SCRATCHPAD_KEYS,
  MAX_SCRATCHPAD_KEY_BYTES,
  MAX_SCRATCHPAD_SESSION_BYTES,
  SESSION_ERRORS,
  SESSION_SCHEMA_VERSION,
  SessionEntryStore,
} from "./sessionEntryStore.js";

let store: any;
let handle: any;

const entry = (role: string, content: string, extra: Record<string, unknown> = {}) => ({
  role,
  content,
  clientId: `${role}-${content}`,
  ...extra,
});

beforeEach(() => {
  handle = new DatabaseSync(":memory:");
  store = new SessionEntryStore(handle);
});

describe("SessionEntryStore — sessions", () => {
  it("creates a session on first ask and returns the same one after", () => {
    const first = store.getOrCreateCurrentSession();
    const second = store.getOrCreateCurrentSession();

    expect(first.id).toBeTruthy();
    expect(first.status).toBe("active");
    expect(first.schemaVersion).toBe(SESSION_SCHEMA_VERSION);
    expect(second.id).toBe(first.id);
  });

  it("archives the previous session when a new one starts", () => {
    const first = store.getOrCreateCurrentSession();
    const second = store.createSession({ title: "second" });

    expect(second.id).not.toBe(first.id);
    expect(store.getSession(first.id).status).toBe("archived");
    expect(store.getSession(second.id).status).toBe("active");
    expect(store.getOrCreateCurrentSession().id).toBe(second.id);
  });
});

describe("SessionEntryStore — append", () => {
  it("assigns contiguous seqs from 1 with a linear parent chain", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(id, [entry("user", "a"), entry("model", "b")]);
    store.appendEntries(id, [entry("user", "c")]);

    const { entries } = store.getEntries(id);
    expect(entries.map((e: any) => e.seq)).toEqual([1, 2, 3]);
    expect(entries.map((e: any) => e.parentSeq)).toEqual([null, 1, 2]);
    expect(entries.map((e: any) => e.content)).toEqual(["a", "b", "c"]);
  });

  it("is idempotent: replaying a batch writes nothing and reports the original seqs", () => {
    const { id } = store.getOrCreateCurrentSession();
    const batch = [entry("user", "hello"), entry("model", "hi")];

    const first = store.appendEntries(id, batch);
    const replay = store.appendEntries(id, batch);

    expect(first.entries.map((e: any) => e.seq)).toEqual([1, 2]);
    expect(first.entries.every((e: any) => e.stored)).toBe(true);
    expect(replay.entries.map((e: any) => e.seq)).toEqual([1, 2]);
    expect(replay.entries.every((e: any) => e.duplicate)).toBe(true);
    expect(store.getEntries(id).entries).toHaveLength(2);
  });

  it("keeps seqs contiguous when a retried batch is only partly new", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(id, [entry("user", "one")]);

    // The renderer retries with the already-stored entry plus the next one.
    const mixed = store.appendEntries(id, [entry("user", "one"), entry("model", "two")]);

    expect(mixed.entries[0]).toMatchObject({ seq: 1, duplicate: true });
    expect(mixed.entries[1]).toMatchObject({ seq: 2, stored: true });
    expect(store.getEntries(id).entries.map((e: any) => e.seq)).toEqual([1, 2]);
  });

  it("round-trips tool structure — the thing the Chroma path destroyed", () => {
    const { id } = store.getOrCreateCurrentSession();
    const toolCalls = [{ id: "call_1", name: "write_file", args: { path: "a.txt" } }];

    store.appendEntries(id, [
      entry("model", "working on it", { toolCalls, thought: "need to write" }),
      entry("tool", "ok", { toolCallId: "call_1", toolName: "write_file" }),
    ]);

    const { entries } = store.getEntries(id);
    expect(entries[0].toolCalls).toEqual(toolCalls);
    expect(entries[0].thought).toBe("need to write");
    expect(entries[1].role).toBe("tool");
    expect(entries[1].toolCallId).toBe("call_1");
    expect(entries[1].toolName).toBe("write_file");
    expect(entries[1].toolCalls).toBeNull();
  });

  it("records the writing surface as provenance", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(id, [entry("user", "hi", { surface: "desktop" })]);
    expect(store.getEntries(id).entries[0].surface).toBe("desktop");
  });

  it("accepts a summary entry, which is how compaction is recorded", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(id, [entry("user", "a"), entry("summary", "earlier: a")]);

    const { entries } = store.getEntries(id);
    expect(entries.map((e: any) => e.role)).toEqual(["user", "summary"]);
    // The summarized entry is still on disk; nothing was rewritten.
    expect(entries[0].content).toBe("a");
  });

  it("rejects an unknown role without writing anything", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(id, [entry("user", "kept")]);

    expect(() => store.appendEntries(id, [entry("user", "a"), entry("assistant", "b")])).toThrow(
      /Unknown entry role/,
    );
    expect(store.getEntries(id).entries.map((e: any) => e.content)).toEqual(["kept"]);
  });

  it("rejects an unknown session", () => {
    expect(() => store.appendEntries("session_nope", [entry("user", "a")])).toThrow(
      /Unknown session/,
    );
  });

  it("accepts an empty batch as a no-op", () => {
    const { id } = store.getOrCreateCurrentSession();
    expect(store.appendEntries(id, []).entries).toEqual([]);
  });
});

describe("SessionEntryStore — read", () => {
  it("pages with an exclusive sinceSeq and stays ordered", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(
      id,
      ["a", "b", "c", "d"].map((c) => entry("user", c)),
    );

    expect(store.getEntries(id, { sinceSeq: 2 }).entries.map((e: any) => e.seq)).toEqual([3, 4]);
    expect(store.getEntries(id, { sinceSeq: 0, limit: 2 }).entries.map((e: any) => e.seq)).toEqual([
      1, 2,
    ]);
    expect(store.getEntries(id, { sinceSeq: 4 }).entries).toEqual([]);
  });

  it("returns the most recent entries in chronological order", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(
      id,
      ["a", "b", "c", "d"].map((c) => entry("user", c)),
    );

    const { entries } = store.getRecentEntries(id, { limit: 2 });
    expect(entries.map((e: any) => e.content)).toEqual(["c", "d"]);
  });

  it("survives a nonsense limit rather than throwing at the caller", () => {
    const { id } = store.getOrCreateCurrentSession();
    store.appendEntries(id, [entry("user", "a")]);

    expect(store.getEntries(id, { limit: 0 }).entries).toHaveLength(1);
    expect(store.getEntries(id, { limit: Number.NaN }).entries).toHaveLength(1);
    expect(store.getEntries(id, { sinceSeq: -5 }).entries).toHaveLength(1);
  });

  it("never interleaves two sessions", () => {
    const first = store.getOrCreateCurrentSession();
    store.appendEntries(first.id, [entry("user", "first-a")]);
    const second = store.createSession();
    store.appendEntries(second.id, [entry("user", "second-a")]);
    store.appendEntries(first.id, [entry("user", "first-b")]);

    expect(store.getEntries(first.id).entries.map((e: any) => e.content)).toEqual([
      "first-a",
      "first-b",
    ]);
    expect(store.getEntries(second.id).entries.map((e: any) => e.content)).toEqual(["second-a"]);
    // seq is per session, so both threads start at 1.
    expect(store.getEntries(second.id).entries[0].seq).toBe(1);
  });
});

describe("SessionEntryStore — leases", () => {
  // The clock is injected rather than slept through: the lease is the only part
  // of this store whose correctness depends on *elapsed* time, so expiry and
  // takeover are tested by moving time, not by waiting for it.
  let now: number;
  let leaseStore: any;
  let sessionId: string;

  const acquire = (holderId: string, extra: Record<string, unknown> = {}) =>
    leaseStore.acquireLease(sessionId, { holderId, surface: "desktop", ...extra });

  beforeEach(() => {
    now = 1_700_000_000_000;
    leaseStore = new SessionEntryStore(handle, () => now);
    sessionId = leaseStore.getOrCreateCurrentSession().id;
  });

  it("grants a free session to the first caller, with a token and an expiry", () => {
    const { lease } = acquire("surface-a");

    expect(lease.holderId).toBe("surface-a");
    expect(lease.token).toBeTruthy();
    expect(lease.expiresAt).toBe(now + DEFAULT_LEASE_TTL_MS);
    expect(lease.renewed).toBe(false);
    expect(leaseStore.getLease(sessionId)).toMatchObject({
      holderId: "surface-a",
      surface: "desktop",
    });
  });

  it("renews for the same holder: same token, original acquiredAt, later expiry", () => {
    const first = acquire("surface-a").lease;
    now += 20_000;
    const second = acquire("surface-a").lease;

    // The token must survive a renewal or the holder's own release would fail.
    expect(second.token).toBe(first.token);
    expect(second.acquiredAt).toBe(first.acquiredAt);
    expect(second.renewedAt).toBe(now);
    expect(second.expiresAt).toBe(now + DEFAULT_LEASE_TTL_MS);
    expect(second.renewed).toBe(true);
  });

  it("refuses a rival while the lease is live, and names the holder", () => {
    acquire("surface-a");
    now += 1_000;

    let thrown: any;
    try {
      acquire("surface-b");
    } catch (error) {
      thrown = error;
    }

    expect(thrown?.code).toBe(SESSION_ERRORS.LEASE_HELD);
    expect(thrown?.holder).toMatchObject({ holderId: "surface-a", surface: "desktop" });
    // The token is the capability that authorizes a release. Handing it to the
    // surface we just refused would let it evict the holder that refused it.
    expect(thrown?.holder?.token).toBeUndefined();
    expect(leaseStore.getLease(sessionId).holderId).toBe("surface-a");
  });

  it("leaves nothing behind when it refuses", () => {
    const held = acquire("surface-a").lease;
    now += 1_000;
    expect(() => acquire("surface-b")).toThrow();

    // A refusal that bumped renewedAt would let a dead holder's lease be kept
    // alive forever by the rivals it keeps refusing.
    const after = leaseStore.getLease(sessionId);
    expect(after.renewedAt).toBe(held.renewedAt);
    expect(after.expiresAt).toBe(held.expiresAt);
  });

  it("hands an expired lease to the next caller — a killed holder blocks nobody", () => {
    acquire("surface-a");
    now += DEFAULT_LEASE_TTL_MS + 1;

    expect(leaseStore.getLease(sessionId)).toBeNull();
    const { lease } = acquire("surface-b");
    expect(lease.holderId).toBe("surface-b");
    expect(lease.renewed).toBe(false);
  });

  it("releases only on a matching holder and token", () => {
    const { lease } = acquire("surface-a");

    expect(leaseStore.releaseLease(sessionId, { holderId: "surface-b", token: lease.token }))
      .toMatchObject({ released: false });
    expect(leaseStore.releaseLease(sessionId, { holderId: "surface-a", token: "guessed" }))
      .toMatchObject({ released: false });
    expect(leaseStore.getLease(sessionId).holderId).toBe("surface-a");

    expect(leaseStore.releaseLease(sessionId, { holderId: "surface-a", token: lease.token }))
      .toMatchObject({ released: true });
    expect(leaseStore.getLease(sessionId)).toBeNull();
  });

  it("admits the next surface as soon as the previous turn releases", () => {
    const { lease } = acquire("surface-a");
    leaseStore.releaseLease(sessionId, { holderId: "surface-a", token: lease.token });

    // No clock movement: the whole point of a turn-scoped lease is that the next
    // surface waits for the turn, not for the TTL.
    expect(acquire("surface-b").lease.holderId).toBe("surface-b");
  });

  it("releasing a lease nobody holds is a no-op, not an error", () => {
    expect(leaseStore.releaseLease(sessionId, { holderId: "surface-a", token: "x" })).toMatchObject({
      released: false,
    });
  });

  it("clamps a hostile or absent ttl into a sane range", () => {
    expect(acquire("surface-a", { ttlMs: 1 }).lease.ttlMs).toBe(5_000);
    expect(acquire("surface-a", { ttlMs: 60 * 60 * 1000 }).lease.ttlMs).toBe(300_000);
    expect(acquire("surface-a", { ttlMs: Number.NaN }).lease.ttlMs).toBe(DEFAULT_LEASE_TTL_MS);
    expect(acquire("surface-a", { ttlMs: undefined }).lease.ttlMs).toBe(DEFAULT_LEASE_TTL_MS);
  });

  it("rejects a lease without a holder, and on a session that does not exist", () => {
    expect(() => leaseStore.acquireLease(sessionId, {})).toThrow(/holderId/);
    expect(() => leaseStore.acquireLease("session_nope", { holderId: "a" })).toThrow(
      /Unknown session/,
    );
  });

  it("refuses to record a lease it cannot persist, rather than pretending to hold one", () => {
    const mockStore = new SessionEntryStore({
      __isMockStore: true,
      __degraded: true,
      exec: () => {},
      prepare: () => ({ run: () => ({ changes: 0 }), get: () => null, all: () => [] }),
    });

    // 503, not a silent grant. An unenforceable lease is worse than none: it
    // would make the client believe it had exclusivity it never had.
    expect(() => mockStore.acquireLease("session_x", { holderId: "a" })).toThrow(/not writable/i);
  });
});

describe("SessionEntryStore — honesty about storage", () => {
  it("reports a real handle as neither mock nor degraded", () => {
    expect(store.storageStatus()).toEqual({
      mock: false,
      degraded: false,
      schemaVersion: SESSION_SCHEMA_VERSION,
    });
  });

  it("refuses to write against the non-persistent fallback instead of losing entries", () => {
    const mockStore = new SessionEntryStore({
      __isMockStore: true,
      __degraded: true,
      exec: () => {},
      prepare: () => ({ run: () => ({ changes: 0 }), get: () => null, all: () => [] }),
    });

    expect(() => mockStore.appendEntries("session_x", [entry("user", "a")])).toThrow(
      /not writable/i,
    );
    expect(() => mockStore.createSession()).toThrow(/not writable/i);
    expect(mockStore.storageStatus()).toMatchObject({ mock: true, degraded: true });
  });
});

describe("SessionEntryStore — append-only by construction", () => {
  const source = readFileSync(
    new URL("./sessionEntryStore.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    "utf8",
  );

  it("reads its own source (guards against a vacuous assertion)", () => {
    expect(source).toContain("class SessionEntryStore");
  });

  it("never deletes or rewrites an entry", () => {
    expect(source).not.toContain("DELETE FROM session_entries");
    expect(source).not.toContain("UPDATE session_entries");
  });

  it("exposes summary as a first-class role", () => {
    expect(ENTRY_ROLES).toContain("summary");
    expect(ENTRY_ROLES).toEqual(["user", "model", "tool", "system", "summary"]);
  });
});

describe("SessionEntryStore — scratchpad", () => {
  /** A value whose serialized size is predictable, for the budget cases. */
  const filler = (bytes: number) => "x".repeat(bytes - 2); // +2 for the JSON quotes

  const mockHandleStore = () =>
    new SessionEntryStore({
      __isMockStore: true,
      __degraded: true,
      exec: () => {},
      prepare: () => ({ run: () => ({ changes: 0 }), get: () => null, all: () => [] }),
    });

  it("round-trips JSON values of every shape", () => {
    const { id } = store.getOrCreateCurrentSession();

    store.writeScratchpad(
      id,
      {
        rows: [{ n: 1 }, { n: 2 }],
        total: 42,
        label: "quarterly",
        ready: true,
        missing: null,
        nested: { deep: { deeper: [1, "two", false] } },
      },
      { surface: "test" },
    );

    const read = store.readScratchpad(id);
    expect(read.state).toEqual({
      rows: [{ n: 1 }, { n: 2 }],
      total: 42,
      label: "quarterly",
      ready: true,
      missing: null,
      nested: { deep: { deeper: [1, "two", false] } },
    });
    expect(read.keyCount).toBe(6);
    expect(read.corruptKeys).toEqual([]);
    expect(read.bytesUsed).toBeGreaterThan(0);
  });

  it("overwrites a key instead of accumulating versions", () => {
    // The one place in this file that is deliberately not append-only: a script
    // rewriting `rows` on every run must not grow the table without bound.
    const { id } = store.getOrCreateCurrentSession();

    store.writeScratchpad(id, { rows: filler(10_000) });
    const first = store.readScratchpad(id);
    store.writeScratchpad(id, { rows: filler(10_000) });
    const second = store.readScratchpad(id);

    expect(second.keyCount).toBe(1);
    expect(second.bytesUsed).toBe(first.bytesUsed);
  });

  it("keeps two sessions' scratchpads apart", () => {
    const first = store.getOrCreateCurrentSession();
    store.writeScratchpad(first.id, { secret: "first only" });

    const second = store.createSession({ title: "second" });
    store.writeScratchpad(second.id, { secret: "second only" });

    expect(store.readScratchpad(first.id).state.secret).toBe("first only");
    expect(store.readScratchpad(second.id).state.secret).toBe("second only");
  });

  it("reads an unknown session as empty rather than throwing", () => {
    // A surface that has stored nothing yet is in the same position as one whose
    // session was archived. Neither is a fault.
    const read = store.readScratchpad("session_that_never_existed");

    expect(read.state).toEqual({});
    expect(read.keyCount).toBe(0);
  });

  it("refuses a write to an unknown session", () => {
    expect(() => store.writeScratchpad("session_nope", { a: 1 })).toThrow(/Unknown session/);
  });

  describe("bounded at the write", () => {
    it("refuses a single value over the per-key limit and writes nothing", () => {
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { keep: "intact" });

      let thrown: any;
      try {
        store.writeScratchpad(id, { huge: filler(MAX_SCRATCHPAD_KEY_BYTES + 100) });
      } catch (error) {
        thrown = error;
      }

      expect(thrown?.code).toBe(SESSION_ERRORS.SCRATCHPAD_FULL);
      expect(thrown?.scope).toBe("key");
      // Nothing written, and the batch did not disturb what was already there.
      const read = store.readScratchpad(id);
      expect(read.state).toEqual({ keep: "intact" });
    });

    it("refuses a batch that would exceed the per-session limit and writes nothing", () => {
      const { id } = store.getOrCreateCurrentSession();
      const chunk = filler(250_000);

      for (const key of ["a", "b", "c", "d"]) {
        store.writeScratchpad(id, { [key]: chunk });
      }
      const before = store.readScratchpad(id);
      expect(before.bytesUsed).toBeLessThanOrEqual(MAX_SCRATCHPAD_SESSION_BYTES);

      let thrown: any;
      try {
        store.writeScratchpad(id, { e: chunk });
      } catch (error) {
        thrown = error;
      }

      expect(thrown?.code).toBe(SESSION_ERRORS.SCRATCHPAD_FULL);
      expect(thrown?.scope).toBe("session");
      // The refused key is absent and the four that fit are untouched.
      const after = store.readScratchpad(id);
      expect(Object.keys(after.state).sort()).toEqual(["a", "b", "c", "d"]);
      expect(after.bytesUsed).toBe(before.bytesUsed);
    });

    it("refuses a batch that would exceed the key count and writes nothing", () => {
      const { id } = store.getOrCreateCurrentSession();
      const full: Record<string, number> = {};
      for (let i = 0; i < MAX_SCRATCHPAD_KEYS; i += 1) full[`k${i}`] = i;
      store.writeScratchpad(id, full);

      let thrown: any;
      try {
        store.writeScratchpad(id, { oneTooMany: 1 });
      } catch (error) {
        thrown = error;
      }

      expect(thrown?.code).toBe(SESSION_ERRORS.SCRATCHPAD_FULL);
      expect(thrown?.scope).toBe("keys");
      expect(store.readScratchpad(id).keyCount).toBe(MAX_SCRATCHPAD_KEYS);
      expect(store.readScratchpad(id).state.oneTooMany).toBeUndefined();
    });

    it("allows replacing a large value with another large value", () => {
      // Budgeting against the post-write total, not a running sum: overwriting a
      // key releases its old bytes, so a rewrite at the limit must be allowed or
      // a script could fill the scratchpad once and never update it again.
      const { id } = store.getOrCreateCurrentSession();
      const big = filler(MAX_SCRATCHPAD_KEY_BYTES);

      store.writeScratchpad(id, { rows: big });
      expect(() => store.writeScratchpad(id, { rows: big })).not.toThrow();
      expect(store.readScratchpad(id).keyCount).toBe(1);
    });
  });

  describe("deleting and replacing", () => {
    it("treats an undefined value as a deletion", () => {
      // What `delete luca.state.rows` looks like by the time it arrives here.
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { rows: [1, 2, 3], keep: "yes" });

      store.writeScratchpad(id, { rows: undefined });

      const read = store.readScratchpad(id);
      expect(read.state).toEqual({ keep: "yes" });
    });

    it("leaves untouched keys alone by default", () => {
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { a: 1, b: 2 });
      store.writeScratchpad(id, { b: 3 });

      expect(store.readScratchpad(id).state).toEqual({ a: 1, b: 3 });
    });

    it("drops absent keys when the batch is authoritative", () => {
      // A flush of a whole `luca.state` object: a key the script deleted must not
      // survive on disk just because it was absent from the payload.
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { a: 1, b: 2 });

      store.writeScratchpad(id, { b: 3 }, { replace: true });

      expect(store.readScratchpad(id).state).toEqual({ b: 3 });
    });

    it("empties the scratchpad when an authoritative batch is empty", () => {
      // `DELETE ... WHERE key NOT IN ()` is a syntax error, so this path is
      // separate code and needs its own case.
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { a: 1, b: 2 });

      store.writeScratchpad(id, {}, { replace: true });

      expect(store.readScratchpad(id).state).toEqual({});
      expect(store.readScratchpad(id).keyCount).toBe(0);
    });

    it("clears named keys and, with no argument, all of them", () => {
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { a: 1, b: 2, c: 3 });

      expect(store.clearScratchpad(id, ["a"]).cleared).toBe(1);
      expect(store.readScratchpad(id).state).toEqual({ b: 2, c: 3 });

      expect(store.clearScratchpad(id).cleared).toBe(2);
      expect(store.readScratchpad(id).state).toEqual({});
    });

    it("clearing what is not there is not an error", () => {
      const { id } = store.getOrCreateCurrentSession();

      expect(() => store.clearScratchpad(id, ["never_stored"])).not.toThrow();
      expect(store.clearScratchpad(id, ["never_stored"]).cleared).toBe(0);
    });
  });

  describe("honesty", () => {
    it("refuses a value that cannot be represented as JSON", () => {
      const { id } = store.getOrCreateCurrentSession();
      const circular: any = { name: "loop" };
      circular.self = circular;

      let thrown: any;
      try {
        store.writeScratchpad(id, { circular });
      } catch (error) {
        thrown = error;
      }

      // Refused, not stored as "[object Object]" or silently dropped: a script
      // told its state was saved must be able to read the same value back.
      expect(thrown?.code).toBe(SESSION_ERRORS.INVALID);
      expect(thrown?.message).toMatch(/cannot be stored as JSON/);
      expect(store.readScratchpad(id).state).toEqual({});
    });

    it("reports a corrupt row instead of failing the whole read", () => {
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { good: "readable" });

      handle
        .prepare(`INSERT INTO session_scratchpad
                    (session_id, key, value, bytes, surface, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, "broken", "{not json", 9, "test", 1);

      const read = store.readScratchpad(id);
      expect(read.state).toEqual({ good: "readable" });
      expect(read.corruptKeys).toEqual(["broken"]);
      // Counted in the total, because it does occupy the budget.
      expect(read.keyCount).toBe(2);
    });

    it("records which surface wrote a key", () => {
      // Provenance: a side effect must be attributable (Invariant 8).
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { a: 1 }, { surface: "electron" });

      const row = handle
        .prepare("SELECT surface FROM session_scratchpad WHERE session_id = ? AND key = ?")
        .get(id, "a");
      expect(row.surface).toBe("electron");
    });

    it("defaults unknown provenance to 'unknown' rather than null", () => {
      const { id } = store.getOrCreateCurrentSession();
      store.writeScratchpad(id, { a: 1 });

      const row = handle
        .prepare("SELECT surface FROM session_scratchpad WHERE session_id = ? AND key = ?")
        .get(id, "a");
      expect(row.surface).toBe("unknown");
    });

    it("refuses every write path on a non-persistent handle", () => {
      // 503, not a fake success. A scratchpad that accepts writes it cannot keep
      // is the in-memory fallback the data spec forbids.
      const mockStore = mockHandleStore();

      expect(() => mockStore.writeScratchpad("session_x", { a: 1 })).toThrow(/not writable/i);
      expect(() => mockStore.clearScratchpad("session_x")).toThrow(/not writable/i);
      expect(mockStore.storageStatus()).toMatchObject({ mock: true, degraded: true });
    });

    it("publishes its limits so a caller can budget before writing", () => {
      const { id } = store.getOrCreateCurrentSession();

      expect(store.readScratchpad(id).limits).toEqual({
        maxKeyBytes: MAX_SCRATCHPAD_KEY_BYTES,
        maxSessionBytes: MAX_SCRATCHPAD_SESSION_BYTES,
        maxKeys: MAX_SCRATCHPAD_KEYS,
      });
    });
  });
});
