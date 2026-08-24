/**
 * Tests for the renderer's turn-lease client.
 *
 * `fetch` is stubbed rather than a core stood up, because the property under test
 * is not HTTP: it is **when this client is willing to refuse a turn.** Exactly one
 * answer from the core may stop Luca from thinking (`409`), and every other
 * outcome — no core, a hung core, a degraded store, an unexplained 500, a
 * response that makes no sense — must let the turn run. The fail-open table below
 * is the load-bearing part of this file.
 *
 * `../../config/api` is mocked for the same reason as in the transcript test: the
 * real `waitForAuth` waits two seconds outside Electron. `./sessionTranscript` is
 * mocked so the resolved session id can be moved around, including to `null`.
 */

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
  ACQUIRE_TIMEOUT_MS,
  LEASE_TTL_MS,
  RENEW_INTERVAL_MS,
  SessionLease,
  publishedLeaseStatus,
} from "./sessionLease";

const sourceOf = (relative: string): string =>
  readFileSync(
    new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    "utf8",
  );

const SESSION_ID = "session_test_1";

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

const grantedLease = (token = "lease_tok_1") =>
  respond({
    lease: {
      sessionId: SESSION_ID,
      holderId: "whoever-asked",
      token,
      acquiredAt: 1_000,
      renewedAt: 1_000,
      expiresAt: 1_000 + LEASE_TTL_MS,
      ttlMs: LEASE_TTL_MS,
      renewed: false,
    },
    mock: false,
    degraded: false,
    schemaVersion: 1,
  });

const heldByOther = (surface = "desktop") =>
  respond(
    {
      error: `Session "${SESSION_ID}" is being driven by another surface (${surface}).`,
      holder: {
        sessionId: SESSION_ID,
        holderId: "holder-over-there",
        surface,
        acquiredAt: Date.now() - 8_000,
        renewedAt: Date.now() - 3_000,
        expiresAt: Date.now() + 40_000,
      },
    },
    409,
  );

/** Mutated by tests; read through the `./sessionTranscript` mock above. */
let resolvedSessionId: string | null = SESSION_ID;

let lease: SessionLease;
let calls: Call[] = [];
let handler: (call: Call, attempt: number) => Response | Promise<Response>;

const posts = (): Call[] => calls.filter((c) => c.method === "POST");
const deletes = (): Call[] => calls.filter((c) => c.method === "DELETE");

beforeEach(() => {
  resolvedSessionId = SESSION_ID;
  calls = [];
  handler = () => grantedLease();

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

  lease = new SessionLease();
});

afterEach(() => {
  lease.stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sessionLease — admission", () => {
  it("takes the lease on a free session and reports holding it", async () => {
    await expect(lease.acquireForTurn()).resolves.toEqual({ admitted: true });

    expect(posts()).toHaveLength(1);
    expect(posts()[0]?.url).toBe(`http://core.test/api/session/${SESSION_ID}/lease`);
    expect(posts()[0]?.body).toMatchObject({ surface: "web", ttlMs: LEASE_TTL_MS });
    expect(posts()[0]?.body?.holderId).toBeTruthy();
    expect(lease.status()).toMatchObject({ held: true, activeTurns: 1, unenforced: 0 });
  });

  it("arms the acquire with a timeout, so a hung core cannot stall a turn forever", async () => {
    await lease.acquireForTurn();

    const signal = posts()[0]?.signal as AbortSignal | undefined;
    expect(signal).toBeTruthy();
    expect(typeof signal?.aborted).toBe("boolean");
    expect(ACQUIRE_TIMEOUT_MS).toBeLessThan(LEASE_TTL_MS);
  });

  it("refuses the turn when another surface is driving, and says which one", async () => {
    handler = () => heldByOther("desktop");

    const admission = await lease.acquireForTurn();

    expect(admission.admitted).toBe(false);
    if (admission.admitted) throw new Error("unreachable");
    expect(admission.message).toContain("desktop");
    expect(admission.message).toContain("another surface");
    expect(admission.holder).toMatchObject({ surface: "desktop", holderId: "holder-over-there" });
    // A refused turn holds nothing and counts nothing, so nothing it does later
    // can release the lease it was just refused.
    expect(lease.status()).toMatchObject({ held: false, activeTurns: 0 });
  });

  it("refuses cleanly even when the 409 body is unreadable", async () => {
    handler = () =>
      ({
        ok: false,
        status: 409,
        json: async () => {
          throw new Error("not json");
        },
      }) as unknown as Response;

    const admission = await lease.acquireForTurn();

    expect(admission.admitted).toBe(false);
    if (admission.admitted) throw new Error("unreachable");
    expect(admission.holder).toBeNull();
    expect(admission.message).toBeTruthy();
  });
});

describe("sessionLease — 409 is the only refusal", () => {
  // Everything in this table admits the turn. The rule is written in the client
  // as a single positive check on 409 rather than a list of tolerated failures,
  // so a failure mode nobody anticipated lands here rather than silencing Luca.
  const FAIL_OPEN: Array<[string, () => Response]> = [
    [
      "no core at all",
      () => {
        throw new Error("ECONNREFUSED");
      },
    ],
    [
      "a hung core, acquire aborted",
      () => {
        throw Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" });
      },
    ],
    ["a store that cannot persist (503)", () => respond({ error: "not writable", degraded: true }, 503)],
    ["an unexplained 500", () => respond({ error: "boom" }, 500)],
    ["a session the core has forgotten (404)", () => respond({ error: "Unknown session" }, 404)],
    ["a 200 carrying no token", () => respond({ lease: { expiresAt: 1 } })],
    ["a 200 carrying nothing at all", () => respond(null)],
  ];

  for (const [name, response] of FAIL_OPEN) {
    it(`admits the turn: ${name}`, async () => {
      handler = () => response();

      await expect(lease.acquireForTurn()).resolves.toEqual({ admitted: true });
      // Admitted, but not silently: an unenforced turn is counted so a
      // diagnostic can see the lease was never actually protecting anything.
      expect(lease.status()).toMatchObject({ held: false, unenforced: 1 });
      expect(lease.status().lastError).toBeTruthy();
    });
  }

  it("admits with no request at all when no session id has resolved yet", async () => {
    resolvedSessionId = null;

    await expect(lease.acquireForTurn()).resolves.toEqual({ admitted: true });

    // Zero calls is the assertion. Resolving the id here would await
    // `waitForAuth()`, a flat two seconds outside Electron, on the send path —
    // and with no session id there is no transcript being written to protect.
    expect(calls).toHaveLength(0);
    expect(lease.status()).toMatchObject({ unenforced: 1 });
  });

  it("never throws into a turn, whatever fetch does", async () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("no network stack at all");
    });

    await expect(lease.acquireForTurn()).resolves.toEqual({ admitted: true });
    await expect(lease.releaseAfterTurn()).resolves.toBeUndefined();
  });
});

describe("sessionLease — holding and releasing", () => {
  it("renews while the turn is still running", async () => {
    vi.useFakeTimers();
    await lease.acquireForTurn();

    await vi.advanceTimersByTimeAsync(RENEW_INTERVAL_MS);
    expect(posts()).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(RENEW_INTERVAL_MS);
    expect(posts()).toHaveLength(3);

    // Renewals must arrive well inside the TTL, or a live turn loses its lease.
    expect(RENEW_INTERVAL_MS * 2).toBeLessThan(LEASE_TTL_MS);
    expect(posts().every((c) => c.body?.ttlMs === LEASE_TTL_MS)).toBe(true);
  });

  it("releases with the token it was given, and stops renewing", async () => {
    vi.useFakeTimers();
    await lease.acquireForTurn();
    await lease.releaseAfterTurn();

    expect(deletes()).toHaveLength(1);
    expect(deletes()[0]?.url).toBe(`http://core.test/api/session/${SESSION_ID}/lease`);
    expect(deletes()[0]?.body).toMatchObject({ token: "lease_tok_1" });
    expect(deletes()[0]?.body?.holderId).toBe(lease.status().holderId);
    expect(lease.status()).toMatchObject({ held: false, activeTurns: 0 });

    // A timer left running would renew a lease no turn is using, blocking the
    // next surface for as long as this window stays open.
    const before = calls.length;
    await vi.advanceTimersByTimeAsync(RENEW_INTERVAL_MS * 3);
    expect(calls).toHaveLength(before);
  });

  it("keeps the lease until the last overlapping turn is done", async () => {
    await lease.acquireForTurn();
    await lease.acquireForTurn();

    await lease.releaseAfterTurn();
    expect(deletes()).toHaveLength(0);
    expect(lease.status()).toMatchObject({ held: true, activeTurns: 1 });

    await lease.releaseAfterTurn();
    expect(deletes()).toHaveLength(1);
    expect(lease.status()).toMatchObject({ held: false, activeTurns: 0 });
  });

  it("sends nothing when there is no lease to release", async () => {
    handler = () => {
      throw new Error("ECONNREFUSED");
    };
    await lease.acquireForTurn();
    calls = [];

    await lease.releaseAfterTurn();
    expect(calls).toHaveLength(0);
  });

  it("releases against the session it leased, even if a new session started meanwhile", async () => {
    await lease.acquireForTurn();
    resolvedSessionId = "session_started_later";

    await lease.releaseAfterTurn();

    // Releasing against the *current* session would leave the old lease held for
    // a full TTL and aim a delete at a session this surface never leased.
    expect(deletes()[0]?.url).toContain(SESSION_ID);
  });

  it("keeps a running turn alive but loud when its renewal is refused", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    handler = (_call, attempt) => (attempt === 1 ? grantedLease() : heldByOther("desktop"));

    await lease.acquireForTurn();
    await vi.advanceTimersByTimeAsync(RENEW_INTERVAL_MS);

    // The turn is not killed: aborting mid-flight would throw away real work
    // without un-braiding anything, since the other surface is writing either
    // way. Ending an in-flight turn needs the core to own the loop — RFC-0006
    // stages 2 onward.
    expect(lease.status().lost).toBe(true);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("lost the turn lease"));
    await expect(lease.releaseAfterTurn()).resolves.toBeUndefined();
  });

  it("treats a failed renewal as survivable, not as a lost lease", async () => {
    vi.useFakeTimers();
    handler = (_call, attempt) => {
      if (attempt === 1) return grantedLease();
      if (attempt === 2) throw new Error("ETIMEDOUT");
      return grantedLease();
    };

    await lease.acquireForTurn();
    await vi.advanceTimersByTimeAsync(RENEW_INTERVAL_MS);
    expect(lease.status()).toMatchObject({ held: true, lost: false });

    // The TTL leaves room for two more attempts, so the next tick recovers.
    await vi.advanceTimersByTimeAsync(RENEW_INTERVAL_MS);
    expect(lease.status().lastError).toBeNull();
  });

  it("publishes its status where a diagnostic can see it", async () => {
    await lease.acquireForTurn();

    expect(publishedLeaseStatus()).toMatchObject({
      sessionId: SESSION_ID,
      surface: "web",
      held: true,
      activeTurns: 1,
    });
  });
});

describe("session lease — wiring", () => {
  const turnRunnerSource = sourceOf("../turns/TurnRunner.ts");
  const routeSource = sourceOf("../../../cortex/server/api/routes/session.routes.js");

  const indicesOf = (haystack: string, needle: string): number[] => {
    const found: number[] = [];
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
      found.push(at);
    }
    return found;
  };

  it("reads its sources (guards against vacuous assertions)", () => {
    expect(turnRunnerSource).toContain("class TurnRunner");
    expect(routeSource).toContain("sendStoreError");
  });

  it("asks for admission before anything in the turn mutates state", () => {
    const acquires = indicesOf(turnRunnerSource, "sessionLease.acquireForTurn()");

    // Both paths: the streaming turn and the non-streaming one.
    expect(acquires).toHaveLength(2);

    // Compared per method rather than by position, and by count rather than by
    // presence: `appendUserMessage` appears twice in each path — once on the
    // reflex shortcut, once on the main route — and *both* must sit after that
    // method's admission, so a check for merely one of them would pass with the
    // acquire wedged between them.
    const mutations: Array<[string, number]> = [
      ["cognitiveDeliberator.perceive(", 1],
      ["harnessService.beginTurn(historyAtStart)", 1],
      ["lucaService.appendUserMessage(message)", 2],
    ];
    const bodies = acquires.map((at, i) => turnRunnerSource.slice(at, acquires[i + 1]));

    // A refused turn must write no user entry into the shared transcript with no
    // answer after it — that orphan is the corruption the lease exists to stop.
    for (const body of bodies) {
      for (const [mutation, count] of mutations) {
        expect(indicesOf(body, mutation)).toHaveLength(count);
      }
    }
    const beforeFirstAcquire = turnRunnerSource.slice(0, acquires[0]);
    for (const [mutation] of mutations) expect(beforeFirstAcquire).not.toContain(mutation);
  });

  it("releases the lease on every exit, including abort and provider error", () => {
    const finallys = indicesOf(turnRunnerSource, "} finally {");
    const releases = indicesOf(turnRunnerSource, "sessionLease.releaseAfterTurn()");

    expect(releases).toHaveLength(2);
    expect(finallys).toHaveLength(2);
    releases.forEach((at, i) => expect(at).toBeGreaterThan(finallys[i]!));
    // Awaited, not fired and forgotten: a renewing holder keeps its token, so a
    // delete still in flight when the next turn acquires would drop that turn's
    // lease.
    expect(turnRunnerSource).toContain("await sessionLease.releaseAfterTurn()");
  });

  it("declares the lease routes before the general GET /:id", () => {
    const acquire = routeSource.indexOf("router.post('/:id/lease'");
    const release = routeSource.indexOf("router.delete('/:id/lease'");
    const general = routeSource.indexOf("router.get('/:id'");

    expect(acquire).toBeGreaterThan(0);
    expect(release).toBeGreaterThan(0);
    expect(acquire).toBeLessThan(general);
    expect(release).toBeLessThan(general);
  });

  it("maps a held lease to 409 and nothing else to 409", () => {
    expect(routeSource).toContain("LEASE_HELD");
    expect(indicesOf(routeSource, "status(409)")).toHaveLength(1);
  });
});
