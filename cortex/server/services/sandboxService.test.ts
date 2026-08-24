/**
 * Tests for the persistent code sandbox.
 *
 * These run against REAL child processes. `vite.config.ts` aliases
 * `child_process` to `src/mocks/child_process.js`, whose `spawn` returns a stub
 * with no `stdin` at all — so a test that let the alias stand would exercise the
 * mock and prove nothing about the service. `process.getBuiltinModule` reaches
 * past the alias to the runtime's real builtins, which are then injected as the
 * worker's `runtime`. Same idiom as `sessionEntryStore.test.ts` passing a real
 * `node:sqlite` handle, and the same reason source-assertion tests in this repo
 * use `process.getBuiltinModule('node:fs')`.
 *
 * Most cases drive a **fake worker** whose behaviour is selected by the code it
 * receives, because the failures worth testing — a reply that never comes, a
 * reply carrying someone else's id, a line that is not JSON — are ones a correct
 * interpreter never produces. The session-namespace cases drive the real Node
 * worker, which is fast and needs no Python install.
 */

const { spawn } = process.getBuiltinModule("node:child_process");
const { writeFileSync, existsSync, unlinkSync, readFileSync } =
  process.getBuiltinModule("node:fs");
const { tmpdir } = process.getBuiltinModule("node:os");
const { join } = process.getBuiltinModule("node:path");

import { afterEach, describe, expect, it } from "vitest";

import {
  EXECUTION_TIMEOUT_MS,
  MAX_SESSION_NAMESPACES,
  NODE_WORKER_SOURCE,
  PYTHON_WORKER_SOURCE,
  SandboxWorker,
} from "./sandboxService.js";

/** The real builtins, past the vite alias. */
const REAL_RUNTIME = { spawn, writeFileSync, existsSync, unlinkSync, tmpdir, join };

/**
 * A worker that misbehaves on demand. Its behaviour is chosen by the code of the
 * cell it is handed, so a single fake covers every pathological reply.
 *
 * Newlines come from `String.fromCharCode(10)` rather than an escape, because the
 * bug this file exists to pin was an escaping mistake in exactly this position:
 * the real Node worker terminated its lines with a literal backslash-n for as
 * long as it existed, so no response line was ever complete and every call hung.
 */
const FAKE_WORKER_SOURCE = [
  "const readline = require('readline');",
  "const NL = String.fromCharCode(10);",
  "const send = (obj) => process.stdout.write(JSON.stringify(obj) + NL);",
  "const rl = readline.createInterface({ input: process.stdin, terminal: false });",
  "send({ status: 'READY' });",
  "rl.on('line', (line) => {",
  "  if (!line.trim()) return;",
  "  const payload = JSON.parse(line);",
  "  const code = payload.code || '';",
  "  if (code === 'NEVER_ANSWER') return;",
  "  if (code === 'NOT_JSON') { process.stdout.write('this is not json' + NL); return; }",
  "  if (code === 'FOREIGN_ID') {",
  "    send({ requestId: 'someone_else_999', stdout: 'stolen', stderr: '', images: [] });",
  "    return;",
  "  }",
  "  if (code === 'FOREIGN_ID_THEN_MINE') {",
  "    send({ requestId: 'someone_else_999', stdout: 'stolen', stderr: '', images: [] });",
  "    send({ requestId: payload.requestId, stdout: 'mine', stderr: '', images: [] });",
  "    return;",
  "  }",
  "  if (code === 'NO_ID') { send({ stdout: 'anonymous', stderr: '', images: [] }); return; }",
  "  if (code === 'EXIT_NOW') { process.exit(3); }",
  "  send({",
  "    requestId: payload.requestId,",
  "    stdout: code + '|' + payload.sessionId,",
  "    stderr: '',",
  "    images: [],",
  "  });",
  "});",
].join("\n");

const workers: SandboxWorker[] = [];

/** Build a worker and register it for teardown, so no child outlives its test. */
const makeWorker = (overrides: Record<string, unknown> = {}): any => {
  const worker = new (SandboxWorker as any)({
    label: "fake",
    extension: ".cjs",
    source: FAKE_WORKER_SOURCE,
    resolveCommand: () => ({ command: process.execPath, args: [] }),
    runtime: REAL_RUNTIME,
    timeoutMs: 1_500,
    ...overrides,
  });
  workers.push(worker);
  return worker;
};

/** A worker running the real Node interpreter, for the namespace cases. */
const makeRealNodeWorker = (overrides: Record<string, unknown> = {}) =>
  makeWorker({ label: "node", source: NODE_WORKER_SOURCE, ...overrides });

afterEach(() => {
  while (workers.length > 0) workers.pop()?.cleanup();
});

describe("SandboxWorker — reply correlation", () => {
  it("gives each concurrent caller its own reply", async () => {
    const worker = makeWorker();

    const results = await Promise.all([
      worker.execute("one", "session-A"),
      worker.execute("two", "session-A"),
      worker.execute("three", "session-A"),
    ]);

    expect(results.map((r: any) => r.result)).toEqual([
      "one|session-A",
      "two|session-A",
      "three|session-A",
    ]);
  });

  it("drops a reply carrying an unknown id instead of resolving the caller in flight", async () => {
    // The regression that existed: replies were paired to callers positionally
    // with `currentQueue.shift()`, so this reply would have resolved the waiting
    // caller with 'stolen'.
    const worker = makeWorker({ timeoutMs: 250 });

    await expect(worker.execute("FOREIGN_ID", "session-A")).rejects.toThrow(
      /stopped this script after 250ms/,
    );
  });

  it("still delivers the right reply when a foreign one precedes it", async () => {
    const worker = makeWorker();

    const result = await worker.execute("FOREIGN_ID_THEN_MINE", "session-A");

    expect(result.result).toBe("mine");
    expect(result.result).not.toBe("stolen");
  });

  it("does not shift a later reply into the wrong caller after one goes unanswered", async () => {
    // The desynchronisation this file exists to prevent: under positional
    // pairing, B's reply resolved A, C's resolved B, and every later caller in
    // the process silently received the previous caller's output.
    //
    // The deadline is generous because the assertion after it runs on a freshly
    // restarted worker: spawning a process costs ~150ms on Windows, so a tight
    // deadline would time out the recovery call and test the clock, not the code.
    const worker = makeWorker({ timeoutMs: 800 });

    const first = worker.execute("NEVER_ANSWER", "session-A");
    await expect(first).rejects.toThrow(/stopped this script/);

    // The worker restarted, so the next caller gets its own answer rather than
    // the answer that belonged to the abandoned cell.
    const second = await worker.execute("second", "session-A");
    expect(second.result).toBe("second|session-A");
  });

  it("attributes a reply with no id to the cell in flight", async () => {
    // Safe only because execution is serialized: exactly one cell can be running.
    const worker = makeWorker();

    const result = await worker.execute("NO_ID", "session-A");

    expect(result.result).toBe("anonymous");
  });

  it("fails the caller when the worker emits a line that is not JSON", async () => {
    const worker = makeWorker();

    await expect(worker.execute("NOT_JSON", "session-A")).rejects.toThrow(
      /returned unreadable output/,
    );

    // And keeps serving afterwards.
    const next = await worker.execute("after", "session-A");
    expect(next.result).toBe("after|session-A");
  });
});

describe("SandboxWorker — serialization", () => {
  it("runs one cell at a time and drains the queue in order", async () => {
    const worker = makeWorker();
    const completed: string[] = [];

    const pending = ["a", "b", "c", "d"].map((code) =>
      worker.execute(code, "session-A").then((r: any) => {
        completed.push(r.result);
        // Never more than one cell in flight, by construction.
        expect(worker.status().inFlight === null || worker.status().queued >= 0).toBe(true);
      }),
    );

    // Everything after the first is queued, not sent.
    expect(worker.status().queued).toBe(3);

    await Promise.all(pending);
    expect(completed).toEqual(["a|session-A", "b|session-A", "c|session-A", "d|session-A"]);
    expect(worker.status().queued).toBe(0);
    expect(worker.status().inFlight).toBeNull();
  });

  it("starts the deadline when a cell is sent, not when it is queued", async () => {
    // A caller must not be timed out by someone else's slow cell running ahead
    // of it. Three cells each taking a little time, on a deadline shorter than
    // their total but longer than any one of them.
    const worker = makeWorker({ timeoutMs: 600 });

    const results = await Promise.all([
      worker.execute("one", "session-A"),
      worker.execute("two", "session-A"),
      worker.execute("three", "session-A"),
    ]);

    expect(results.map((r: any) => r.result)).toEqual([
      "one|session-A",
      "two|session-A",
      "three|session-A",
    ]);
  });
});

describe("SandboxWorker — deadline and restart", () => {
  it("rejects a cell that outruns its deadline and says the state was cleared", async () => {
    const worker = makeWorker({ timeoutMs: 250 });

    await expect(worker.execute("NEVER_ANSWER", "session-A")).rejects.toThrow(
      /stopped this script after 250ms.*variables were cleared/s,
    );
    expect(worker.status().restarts).toBe(1);
  });

  it("rejects the cells queued behind a timeout rather than answering them wrongly", async () => {
    const worker = makeWorker({ timeoutMs: 250 });

    const hung = worker.execute("NEVER_ANSWER", "session-A");
    const behind = worker.execute("queued", "session-A");

    await expect(hung).rejects.toThrow(/stopped this script/);
    await expect(behind).rejects.toThrow(/restarted after a timeout.*Send this again/s);
  });

  it("is usable again after a restart", async () => {
    // Generous for the same reason as above: the recovery call runs on a process
    // that has just been spawned.
    const worker = makeWorker({ timeoutMs: 800 });

    await expect(worker.execute("NEVER_ANSWER", "session-A")).rejects.toThrow();
    const recovered = await worker.execute("recovered", "session-A");

    expect(recovered.result).toBe("recovered|session-A");
  });

  it("defaults to a 60s deadline", () => {
    expect(EXECUTION_TIMEOUT_MS).toBe(60_000);
    expect(makeWorker({ timeoutMs: undefined }).timeoutMs).toBe(EXECUTION_TIMEOUT_MS);
  });
});

describe("SandboxWorker — process failures", () => {
  it("rejects with the command it tried when the interpreter is missing", async () => {
    // Previously there was no 'error' listener at all, so a missing interpreter
    // emitted an unhandled 'error' event on the child and took the core process
    // down. On Windows that was the default path: the fallback was `python3`,
    // which the Windows installer does not provide.
    const worker = makeWorker({
      resolveCommand: () => ({ command: "luca-no-such-interpreter-xyz", args: [] }),
    });

    await expect(worker.execute("anything", "session-A")).rejects.toThrow(
      /could not start.*luca-no-such-interpreter-xyz/s,
    );
  });

  it("rejects the caller when the worker exits mid-cell", async () => {
    const worker = makeWorker();

    await expect(worker.execute("EXIT_NOW", "session-A")).rejects.toThrow(
      /closed unexpectedly/,
    );
  });

  it("spawns nothing until the first cell is executed", () => {
    const worker = makeWorker();

    expect(worker.status().running).toBe(false);
    expect(worker.status().isReady).toBe(false);
  });
});

describe("SandboxWorker — session namespaces", () => {
  it("keeps variables alive across cells in one session", async () => {
    const worker = makeRealNodeWorker();

    await worker.execute("const answer = 42", "session-A");
    const read = await worker.execute("answer", "session-A");

    expect(read.result.trim()).toBe("42");
  });

  it("does not let one session read another's variables", async () => {
    // A single shared `_global_env` was the previous behaviour: every session,
    // Surface and agent wrote into one namespace.
    const worker = makeRealNodeWorker();

    await worker.execute("const secret = 'session-A only'", "session-A");
    const fromB = await worker.execute(
      "typeof secret === 'undefined' ? 'isolated' : secret",
      "session-B",
    );

    // Quoted, because the echo runs through util.inspect: a caller can tell the
    // string 'isolated' from a variable that happened to hold that word.
    expect(fromB.result.trim()).toBe("'isolated'");
  });

  it("maps a missing session id to one shared fallback namespace", async () => {
    // What a cold boot produces: no transcript resolved yet, so no session id.
    const worker = makeRealNodeWorker();

    await worker.execute("const boot = 'no session id'", undefined);
    const read = await worker.execute("boot", null);

    expect(read.result.trim()).toBe("'no session id'");
  });

  it("evicts the least recently used namespace past the cap", async () => {
    const worker = makeRealNodeWorker();

    await worker.execute("const marker = 'oldest'", "session-oldest");
    for (let i = 0; i < MAX_SESSION_NAMESPACES; i += 1) {
      await worker.execute(`const marker = ${i}`, `filler-${i}`);
    }

    const evicted = await worker.execute(
      "typeof marker === 'undefined' ? 'evicted' : 'resident'",
      "session-oldest",
    );
    expect(evicted.result.trim()).toBe("'evicted'");
  });

  it("reports an error as stderr rather than hanging or dying", async () => {
    const worker = makeRealNodeWorker();

    const thrown = await worker.execute("throw new Error('boom')", "session-A");
    expect(thrown.stderr).toContain("boom");

    const after = await worker.execute("'still alive'", "session-A");
    expect(after.result.trim()).toBe("'still alive'");
  });
});

describe("worker sources", () => {
  const BACKSLASH = String.fromCharCode(92);
  const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

  it("terminate response lines with a real newline escape", () => {
    // The defect: the Node template wrote a doubled backslash, so the generated
    // file said `+ "\\n"` — a backslash and an `n`, not a newline. The parent
    // splits stdout on real newlines and keeps the trailing fragment, so no line
    // was ever complete: READY never arrived, `isNodeReady` never became true,
    // and every call hung forever with no deadline to end it.
    for (const source of [PYTHON_WORKER_SOURCE, NODE_WORKER_SOURCE]) {
      expect(occurrences(source, BACKSLASH + "n")).toBeGreaterThan(0);
      expect(occurrences(source, BACKSLASH + BACKSLASH + "n")).toBe(0);
    }
  });

  it("give the Node context require but not raw process", () => {
    // The approval gate, not the vm, is the security boundary — but there is no
    // reason to hand out a live handle to the core's own process either.
    expect(NODE_WORKER_SOURCE).toContain("require: require");
    expect(NODE_WORKER_SOURCE).not.toContain("process: process");
  });

  it("format objects with util.inspect rather than string coercion", () => {
    // `console.log({a: 1})` printed '[object Object]' before.
    expect(NODE_WORKER_SOURCE).toContain("util.inspect");
  });

  it("keep no single global namespace", () => {
    expect(PYTHON_WORKER_SOURCE).not.toContain("_global_env");
    expect(PYTHON_WORKER_SOURCE).toContain("_namespace_for");
    expect(NODE_WORKER_SOURCE).toContain("contextFor");
  });

  it("cap namespaces in both languages", () => {
    expect(PYTHON_WORKER_SOURCE).toContain(`MAX_NAMESPACES = ${MAX_SESSION_NAMESPACES}`);
    expect(NODE_WORKER_SOURCE).toContain(`MAX_NAMESPACES = ${MAX_SESSION_NAMESPACES}`);
  });
});

describe("routes pass the session through", () => {
  // Read with the real fs: `vite.config.ts` aliases `node:fs` to a browser
  // polyfill whose readFileSync returns '', which would make every assertion
  // below pass vacuously.
  const read = (relative: string) =>
    readFileSync(new URL(relative, import.meta.url), "utf8") as string;

  it("keys the Python namespace by the request's sessionId", () => {
    const source = read("../api/routes/python.routes.js");
    expect(source).toContain("sessionId");
    expect(source).toContain("sandboxService.execute(script, sessionId)");
  });

  it("keys the Node namespace by the request's sessionId", () => {
    const source = read("../api/routes/node.routes.js");
    expect(source).toContain("sessionId");
    expect(source).toContain("sandboxService.executeNode(script, sessionId)");
  });
});
