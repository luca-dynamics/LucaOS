import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PYTHON_BIN, VENV_DIR } from '../config/constants.js';

/**
 * Stateful code sandbox: a persistent Python interpreter and a persistent Node
 * `vm` context, so variables, imports and functions defined by one tool call are
 * still there for the next one.
 *
 * Both languages are driven by the same `SandboxWorker` below. They were
 * previously two near-identical copies of this logic, which is how the Node half
 * came to be broken in a way the Python half was not, and why fixing the
 * response-correlation bug once was worth the restructure.
 *
 * Four properties this file is responsible for:
 *
 * 1. **A reply reaches the caller that asked for it.** Requests carry a
 *    `requestId` and the worker echoes it. The previous version paired replies to
 *    callers positionally (`currentQueue.shift()`), so a single dropped or
 *    malformed reply shifted every later caller onto the wrong result —
 *    permanently, and silently. Now a reply whose id does not match the request
 *    in flight is logged and dropped rather than handed to the wrong turn.
 * 2. **One namespace per session.** A single `_global_env` shared by every
 *    session and Surface meant one conversation could read another's variables,
 *    which Invariant 3 does not permit — memory belongs to Luca, but a working
 *    variable belongs to the piece of work that made it. Namespaces are keyed by
 *    session and capped at MAX_SESSION_NAMESPACES on an LRU basis.
 * 3. **Execution is serialized and deadlined.** One cell at a time per worker
 *    (they share one interpreter; two concurrent cells in one namespace is a data
 *    race by construction), and no cell may run longer than `timeoutMs`. Reaching
 *    the deadline kills and respawns the worker: a cell that ignores the clock
 *    still owns the interpreter, so nothing short of a restart reclaims it.
 * 4. **Nothing here is a security boundary.** `vm` is not a sandbox and the
 *    Python worker has the full standard library; both can reach everything the
 *    core process can. Containment is the LEVEL_2 approval gate on
 *    `runPythonScript` / `runNodeScript` in `src/services/toolRegistry.ts`. If
 *    that gate is ever removed, this file becomes remote code execution driven by
 *    model output.
 *
 * State here is deliberately **ephemeral**: a namespace lives as long as the core
 * process and no longer. Anything that must outlive a restart has to be written
 * somewhere durable — a file, or memory — because a live interpreter object is not
 * a thing that can be persisted. A session-scoped durable store for exactly this
 * purpose is the next step, and is not here yet.
 */

/** Longest a single cell may run before its worker is restarted. */
export const EXECUTION_TIMEOUT_MS = 60_000;

/** How many session namespaces one worker keeps before evicting the oldest. */
export const MAX_SESSION_NAMESPACES = 8;

/** Namespace used when no session has been resolved yet (cold boot, no auth). */
export const FALLBACK_SESSION_ID = 'default';

/**
 * The Python worker. Reads one JSON payload per line from stdin, executes it in
 * the namespace for its session, and writes one JSON line back.
 *
 * Escaping note for anyone editing this: it lives in a template literal, so `\\n`
 * here becomes `\n` in the generated file, which Python then reads as a newline.
 * Getting this wrong is not cosmetic — see the Node worker's history below.
 */
export const PYTHON_WORKER_SOURCE = `
import sys
import json
import traceback
from io import StringIO
import contextlib

MAX_NAMESPACES = ${MAX_SESSION_NAMESPACES}

# One namespace per session, most-recently-used last. A single shared namespace
# would let one conversation read another's variables.
_envs = {}
_order = []

def _namespace_for(session_id, evicted):
    if session_id in _envs:
        _order.remove(session_id)
        _order.append(session_id)
        return _envs[session_id]

    _envs[session_id] = {}
    _order.append(session_id)
    while len(_order) > MAX_NAMESPACES:
        gone = _order.pop(0)
        _envs.pop(gone, None)
        evicted.append(gone)
    return _envs[session_id]

def main():
    sys.stdout.write('{"status": "READY"}\\n')
    sys.stdout.flush()

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            payload = json.loads(line)
            request_id = payload.get("requestId")
            session_id = payload.get("sessionId") or "${FALLBACK_SESSION_ID}"
            code = payload.get("code", "")

            evicted = []
            env = _namespace_for(session_id, evicted)

            output = StringIO()
            error = StringIO()

            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(error):
                try:
                    # Evaluate as an expression first so the last value is echoed
                    # the way a REPL would; fall back to exec for statements.
                    try:
                        _eval_code = compile(code, '<string>', 'eval')
                        _eval_result = eval(_eval_code, env)
                        if _eval_result is not None:
                            print(repr(_eval_result))
                    except SyntaxError:
                        _exec_code = compile(code, '<string>', 'exec')
                        exec(_exec_code, env)
                except Exception:
                    traceback.print_exc(file=error)

            # If matplotlib drew anything, return it as a base64 PNG.
            images = []
            try:
                import matplotlib
                matplotlib.use('Agg')  # headless
                import matplotlib.pyplot as plt
                if plt.get_fignums():
                    import io
                    import base64
                    buf = io.BytesIO()
                    plt.savefig(buf, format='png', bbox_inches='tight')
                    buf.seek(0)
                    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                    images.append(f"data:image/png;base64,{img_base64}")
                    plt.clf()
                    plt.close('all')
            except ImportError:
                pass
            except Exception as e:
                print(f"Failed to capture plot: {e}", file=error)

            response = {
                "requestId": request_id,
                "stdout": output.getvalue(),
                "stderr": error.getvalue(),
                "images": images,
                "evicted": evicted,
            }
            sys.stdout.write(json.dumps(response) + "\\n")
            sys.stdout.flush()

        except Exception as e:
            # Malformed payload. Answer without a requestId; the parent attributes
            # it to the cell in flight, which serialization makes unambiguous.
            err_resp = {"stdout": "", "stderr": "Fatal sandbox error: " + str(e), "images": []}
            sys.stdout.write(json.dumps(err_resp) + "\\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
`;

/**
 * The Node worker.
 *
 * The previous version terminated every line with `'\\\\n'` in this template,
 * which reached the generated file as `"\\n"` — a literal backslash and an `n`,
 * not a newline. The parent splits stdout on real newlines and keeps the trailing
 * fragment, so no response line was ever complete: `READY` never arrived,
 * `isNodeReady` never became true, and every `runNodeScript` call hung forever
 * with no deadline to end it. The worker was computing correct answers and
 * throwing them into a buffer nobody could read. Keep it at `\\n`.
 *
 * `process` is deliberately not exposed in the context. The original passed it
 * through, but nothing can have depended on that — no call ever returned — so
 * removing it costs no compatibility. `require` stays: a Node sandbox that cannot
 * require anything is not the tool this claims to be, and the approval gate, not
 * the `vm`, is what makes this safe to offer.
 */
export const NODE_WORKER_SOURCE = `
const vm = require('vm');
const util = require('util');
const readline = require('readline');

const MAX_NAMESPACES = ${MAX_SESSION_NAMESPACES};

// One vm context per session, most-recently-used last.
const contexts = new Map();
const order = [];

// Execution is serialized by the parent, so one shared capture buffer is safe.
const capture = { out: '', err: '' };

const fmt = (args) =>
    args
        .map((a) => (typeof a === 'string' ? a : util.inspect(a, { depth: 3 })))
        .join(' ');

const makeContext = () =>
    vm.createContext({
        console: {
            log: (...a) => { capture.out += fmt(a) + '\\n'; },
            info: (...a) => { capture.out += fmt(a) + '\\n'; },
            debug: (...a) => { capture.out += fmt(a) + '\\n'; },
            error: (...a) => { capture.err += fmt(a) + '\\n'; },
            warn: (...a) => { capture.err += fmt(a) + '\\n'; },
        },
        require: require,
        Buffer: Buffer,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
    });

const contextFor = (sessionId, evicted) => {
    if (contexts.has(sessionId)) {
        order.splice(order.indexOf(sessionId), 1);
        order.push(sessionId);
        return contexts.get(sessionId);
    }

    const context = makeContext();
    contexts.set(sessionId, context);
    order.push(sessionId);
    while (order.length > MAX_NAMESPACES) {
        const gone = order.shift();
        contexts.delete(gone);
        evicted.push(gone);
    }
    return context;
};

const rl = readline.createInterface({ input: process.stdin, terminal: false });

process.stdout.write(JSON.stringify({ status: 'READY' }) + '\\n');

rl.on('line', (line) => {
    if (!line.trim()) return;

    let payload;
    try {
        payload = JSON.parse(line);
    } catch (e) {
        process.stdout.write(
            JSON.stringify({ stdout: '', stderr: 'JSON parse error: ' + e.message, images: [] }) + '\\n',
        );
        return;
    }

    const evicted = [];
    const context = contextFor(payload.sessionId || '${FALLBACK_SESSION_ID}', evicted);

    capture.out = '';
    capture.err = '';

    try {
        const result = vm.runInContext(payload.code || '', context);
        // Echo the last value the way a REPL would, but never on top of output
        // the script produced itself. util.inspect rather than the console
        // formatter above: a returned string is quoted here, so a caller can tell
        // 42 from '42' — the same distinction Python's repr() gives the sibling
        // worker.
        if (result !== undefined && capture.out === '') {
            capture.out += util.inspect(result, { depth: 3 }) + '\\n';
        }
    } catch (e) {
        capture.err += (e && e.stack) || (e && e.message) || String(e);
    }

    process.stdout.write(
        JSON.stringify({
            requestId: payload.requestId ?? null,
            stdout: capture.out,
            stderr: capture.err,
            images: [],
            evicted,
        }) + '\\n',
    );
});
`;

/** "60s" / "400ms" — a deadline message that says "after 0s" helps nobody. */
const describeDuration = (ms) => (ms >= 1000 ? `${Math.round(ms / 1000)}s` : `${ms}ms`);

/**
 * Interpreter names to try on PATH, in order, when there is no venv and no
 * configured binary.
 *
 * Windows has no `python3` — the installer provides `python` and the `py`
 * launcher — so the previous unconditional `'python3'` fallback could not start
 * an interpreter on the platform this is developed on. Combined with the missing
 * `error` handler above, that did not fail the call: it emitted an unhandled
 * `error` event on the child, which takes the core process down with it.
 *
 * Computed lazily, never at import time: `vite.config.ts` aliases `os` to a
 * browser polyfill whose default export has no `platform`, so a module-level call
 * would throw the moment any test imported this file.
 */
const pathCandidates = () =>
    os.platform() === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

/** Probed once per process: spawning to ask `--version` is not free. */
let cachedPythonCommand = null;

/** Where the Python interpreter actually is: venv, then configured, then PATH. */
const resolvePythonCommand = () => {
    if (cachedPythonCommand) return cachedPythonCommand;

    if (fs.existsSync(VENV_DIR)) {
        const binary =
            os.platform() === 'win32'
                ? path.join(VENV_DIR, 'Scripts', 'python.exe')
                : path.join(VENV_DIR, 'bin', 'python');
        if (fs.existsSync(binary)) {
            cachedPythonCommand = { command: binary, args: [] };
            return cachedPythonCommand;
        }
    }

    if (fs.existsSync(PYTHON_BIN)) {
        cachedPythonCommand = { command: PYTHON_BIN, args: [] };
        return cachedPythonCommand;
    }

    for (const candidate of pathCandidates()) {
        const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore', timeout: 5000 });
        if (!probe.error && probe.status === 0) {
            cachedPythonCommand = { command: candidate, args: [] };
            return cachedPythonCommand;
        }
    }

    // Nothing answered. Returned rather than thrown so the failure arrives as a
    // rejected execution carrying the name that was tried, not as a boot crash.
    const candidates = pathCandidates();
    console.error(
        `[SANDBOX] No Python interpreter found on PATH (tried ${candidates.join(', ')}). ` +
            `runPythonScript will fail until one is installed.`,
    );
    cachedPythonCommand = { command: candidates[0], args: [] };
    return cachedPythonCommand;
};

/**
 * The Node builtins this file needs, in one injectable bundle.
 *
 * `vite.config.ts` aliases `child_process`, `fs`, `path` and `os` to browser
 * stubs — `spawn` returns an object with no `stdin`, `writeFileSync` records into
 * a fake map — so a test that let the aliases stand would exercise the mocks and
 * prove nothing about the service. Injectable for the same reason
 * `SessionEntryStore` takes a database handle: the test passes the real builtins
 * via `process.getBuiltinModule`, and production keeps the plain imports.
 */
const DEFAULT_RUNTIME = {
    spawn,
    writeFileSync: (...args) => fs.writeFileSync(...args),
    existsSync: (...args) => fs.existsSync(...args),
    unlinkSync: (...args) => fs.unlinkSync(...args),
    tmpdir: () => os.tmpdir(),
    join: (...parts) => path.join(...parts),
};

/**
 * One persistent interpreter process, with a serialized request queue.
 *
 * Exported so tests can drive the queueing, correlation and timeout behaviour
 * against a stub worker instead of requiring a Python install.
 */
export class SandboxWorker {
    constructor({
        label,
        extension,
        source,
        resolveCommand,
        timeoutMs = EXECUTION_TIMEOUT_MS,
        runtime = DEFAULT_RUNTIME,
    }) {
        this.label = label;
        this.source = source;
        this.extension = extension;
        this.resolveCommand = resolveCommand;
        this.timeoutMs = timeoutMs;
        this.runtime = runtime;
        /** Resolved on first spawn, not here — see `ensureWorkerPath`. */
        this.workerPath = null;

        this.process = null;
        this.isReady = false;
        /** The one request currently executing, or null. */
        this.inFlight = null;
        /** Requests waiting for the interpreter. */
        this.queue = [];
        this.requestSeq = 0;
        this.restarts = 0;
        this.buffer = '';
    }

    status() {
        return {
            label: this.label,
            running: !!this.process,
            isReady: this.isReady,
            inFlight: this.inFlight ? this.inFlight.requestId : null,
            queued: this.queue.length,
            restarts: this.restarts,
        };
    }

    /**
     * Where this worker's script lives, resolved on first use.
     *
     * Not computed in the constructor: the module-level `sandboxService` singleton
     * is built at import time, so touching `os.tmpdir()` there made merely
     * importing this file fail under vitest, where `os` is aliased to a browser
     * polyfill. A constructor that only assigns fields cannot fail.
     */
    ensureWorkerPath() {
        if (!this.workerPath) {
            this.workerPath = this.runtime.join(
                this.runtime.tmpdir(),
                `luca_sandbox_${this.label}_${process.pid}_${Date.now()}${this.extension}`,
            );
        }
        return this.workerPath;
    }

    /**
     * Spawn the worker. Called lazily on the first execution, so importing this
     * module costs nothing and a core that never runs a script never pays for an
     * interpreter.
     */
    start() {
        this.stop();
        const workerPath = this.ensureWorkerPath();
        this.runtime.writeFileSync(workerPath, this.source);

        const { command, args } = this.resolveCommand();
        this.process = this.runtime.spawn(command, [...args, workerPath], {
            // stderr inherited: a worker that dies on startup should say so in the
            // core's log rather than into a buffer nobody reads.
            stdio: ['pipe', 'pipe', 'inherit'],
        });
        this.buffer = '';

        this.process.stdout.on('data', (chunk) => this.absorb(chunk));

        // Unhandled 'error' on a ChildProcess throws. A missing `python3` used to
        // take the whole core down with it.
        this.process.on('error', (error) => {
            console.error(`[SANDBOX] ${this.label} worker could not start (${command}):`, error.message);
            this.isReady = false;
            this.failAll(
                new Error(
                    `The ${this.label} sandbox could not start: ${error.message}. ` +
                        `Check that ${command} is installed and on PATH.`,
                ),
            );
        });

        this.process.on('close', (code) => {
            console.log(`[SANDBOX] ${this.label} worker exited with code ${code}`);
            this.isReady = false;
            this.process = null;
            this.failAll(new Error(`The ${this.label} sandbox process closed unexpectedly (code ${code}).`));
        });
    }

    /** Kill the worker without failing anything. Listeners go first, so the */
    /** `close` handler cannot fail requests a restart is about to re-run. */
    stop() {
        if (!this.process) return;
        this.process.removeAllListeners('close');
        this.process.removeAllListeners('error');
        if (this.process.stdout) this.process.stdout.removeAllListeners('data');
        try {
            this.process.kill();
        } catch (e) {
            console.warn(`[SANDBOX] ${this.label} worker kill failed:`, e.message);
        }
        this.process = null;
        this.isReady = false;
    }

    /**
     * Queue a cell. Resolves `{ result, stderr, images }` — the shape the python
     * and node routes already return to their callers.
     */
    execute(code, sessionId) {
        return new Promise((resolve, reject) => {
            this.requestSeq += 1;
            this.queue.push({
                requestId: `${this.label}_${this.requestSeq}`,
                sessionId: sessionId || FALLBACK_SESSION_ID,
                code: code ?? '',
                resolve,
                reject,
                timer: null,
            });
            this.pump();
        });
    }

    /** Send the next queued cell, if the interpreter is free. */
    pump() {
        if (this.inFlight || this.queue.length === 0) return;
        if (!this.process) this.start();

        const request = this.queue.shift();
        this.inFlight = request;

        // The deadline starts when the cell is handed to the interpreter, not when
        // it was queued: a caller must not be timed out by someone else's slow
        // (but legitimate) script running ahead of it.
        request.timer = setTimeout(() => this.onTimeout(request), this.timeoutMs);
        if (typeof request.timer.unref === 'function') request.timer.unref();

        // No wait for READY and no sleep: stdin is a pipe, so a payload written
        // before the worker reaches its read loop simply sits there until it does.
        // The old 500ms sleep after a restart was a race, not a guarantee.
        try {
            this.process.stdin.write(
                JSON.stringify({
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                    code: request.code,
                }) + '\n',
            );
        } catch (e) {
            clearTimeout(request.timer);
            this.inFlight = null;
            request.reject(new Error(`Could not reach the ${this.label} sandbox: ${e.message}`));
            this.pump();
        }
    }

    /** Split stdout into lines and hand each complete one to `handle`. */
    absorb(chunk) {
        this.buffer += chunk.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let response;
            try {
                response = JSON.parse(trimmed);
            } catch (e) {
                // Attributed to the cell in flight rather than to the head of a
                // queue: with execution serialized, the cell in flight is the only
                // thing that could have produced this line.
                console.error(
                    `[SANDBOX] ${this.label} worker emitted a line that is not JSON:`,
                    trimmed.slice(0, 500),
                );
                if (this.inFlight) {
                    this.reject(this.inFlight, new Error(`The ${this.label} sandbox returned unreadable output.`));
                }
                continue;
            }
            this.handle(response);
        }
    }

    handle(response) {
        if (response.status === 'READY') {
            this.isReady = true;
            console.log(`[SANDBOX] Persistent ${this.label} sandbox is READY.`);
            return;
        }

        if (Array.isArray(response.evicted) && response.evicted.length > 0) {
            console.log(
                `[SANDBOX] ${this.label} evicted ${response.evicted.length} idle session namespace(s) ` +
                    `at the ${MAX_SESSION_NAMESPACES}-namespace cap: ${response.evicted.join(', ')}`,
            );
        }

        const request = this.inFlight;
        if (!request) {
            console.warn(`[SANDBOX] ${this.label} produced output with no request in flight; dropping it.`);
            return;
        }

        // The correlation check. A mismatch is dropped, never resolved into the
        // wrong caller — that is the bug this replaced. The request in flight
        // keeps its deadline and fails honestly instead of receiving a stranger's
        // result. An absent id is attributed to the cell in flight, which
        // serialization makes unambiguous.
        if (response.requestId && response.requestId !== request.requestId) {
            console.error(
                `[SANDBOX] ${this.label} reply for ${response.requestId} does not match the request in ` +
                    `flight (${request.requestId}); dropping it rather than answering the wrong caller.`,
            );
            return;
        }

        this.settle(request, {
            result: response.stdout ?? '',
            stderr: response.stderr ?? '',
            images: response.images ?? [],
        });
    }

    settle(request, value) {
        clearTimeout(request.timer);
        if (this.inFlight === request) this.inFlight = null;
        request.resolve(value);
        this.pump();
    }

    reject(request, error) {
        clearTimeout(request.timer);
        if (this.inFlight === request) this.inFlight = null;
        request.reject(error);
        this.pump();
    }

    /**
     * A cell outran its deadline. It still holds the interpreter, so the worker
     * has to go — and a namespace half-mutated by an abandoned cell is not one
     * worth keeping.
     */
    onTimeout(request) {
        console.error(
            `[SANDBOX] ${this.label} execution ${request.requestId} exceeded ${this.timeoutMs}ms; ` +
                `restarting the worker.`,
        );
        if (this.inFlight === request) this.inFlight = null;
        request.reject(
            new Error(
                `The ${this.label} sandbox stopped this script after ` +
                    `${describeDuration(this.timeoutMs)}. In-memory variables were cleared when the ` +
                    `worker restarted, so re-create anything the next script depends on.`,
            ),
        );
        this.restart('restarted after a timeout');
    }

    /**
     * Replace the worker and clear the queue. Callers behind the restart are
     * rejected rather than silently re-run: their namespaces are gone, so code
     * that assumed a variable was defined would fail in a far more confusing way.
     */
    restart(reason) {
        this.restarts += 1;
        this.stop();
        const error = new Error(
            `The ${this.label} sandbox was ${reason}; in-memory variables were cleared. Send this again.`,
        );
        while (this.queue.length > 0) {
            const queued = this.queue.shift();
            clearTimeout(queued.timer);
            queued.reject(error);
        }
        this.start();
    }

    /** Fail everything outstanding — the worker is gone and is not coming back. */
    failAll(error) {
        const request = this.inFlight;
        this.inFlight = null;
        if (request) {
            clearTimeout(request.timer);
            request.reject(error);
        }
        while (this.queue.length > 0) {
            const queued = this.queue.shift();
            clearTimeout(queued.timer);
            queued.reject(error);
        }
    }

    cleanup() {
        this.stop();
        // Null when the worker was never started: nothing was written, so there is
        // nothing to remove.
        if (this.workerPath && this.runtime.existsSync(this.workerPath)) {
            try {
                this.runtime.unlinkSync(this.workerPath);
            } catch (e) {
                console.warn(`[SANDBOX] Cleanup unlink failed for the ${this.label} worker:`, e.message);
            }
        }
    }
}

class SandboxService {
    constructor() {
        this.python = new SandboxWorker({
            label: 'python',
            extension: '.py',
            source: PYTHON_WORKER_SOURCE,
            resolveCommand: resolvePythonCommand,
        });
        // `node` rather than `process.execPath`: under Electron the latter is the
        // Electron binary, which would spawn a second app instead of a script host.
        this.node = new SandboxWorker({
            label: 'node',
            extension: '.js',
            source: NODE_WORKER_SOURCE,
            resolveCommand: () => ({ command: 'node', args: [] }),
        });
    }

    /** Run Python in the namespace belonging to `sessionId`. */
    execute(code, sessionId) {
        return this.python.execute(code, sessionId);
    }

    /** Run JavaScript in the vm context belonging to `sessionId`. */
    executeNode(code, sessionId) {
        return this.node.execute(code, sessionId);
    }

    /** Throw away all interpreter state in both languages. */
    reset() {
        console.log('[SANDBOX] Resetting sandbox environments...');
        this.python.restart('reset on request');
        this.node.restart('reset on request');
        return { success: true, message: 'Sandbox states cleared and restarted.' };
    }

    /** Kept for callers that reached for the old init methods. */
    initProcess() {
        this.python.restart('reset on request');
    }

    initNodeProcess() {
        this.node.restart('reset on request');
    }

    status() {
        return { python: this.python.status(), node: this.node.status() };
    }

    cleanup() {
        this.python.cleanup();
        this.node.cleanup();
    }
}

export const sandboxService = new SandboxService();

// Clean up temp files and children on exit.
process.on('exit', () => sandboxService.cleanup());
process.on('SIGINT', () => {
    sandboxService.cleanup();
    process.exit();
});
