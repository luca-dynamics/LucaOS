/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const { spawn } = require('child_process');
const electron = require('electron');

const host = process.env.VITE_DEV_HOST || '127.0.0.1';
const port = Number(process.env.VITE_DEV_PORT || 5822);

// Two budgets, not one wall clock.
//
// A single fixed deadline cannot tell "Vite is never coming" apart from "Vite is
// working", and here the second case is routine: this renderer is ~1,900 modules,
// and any lockfile change makes Vite re-optimize dependencies before it will
// answer a request. A cold start measured 56s on a dev machine, so a flat 60s
// budget failed the launch against a dev server that was perfectly healthy — and
// because Vite writes the optimized bundle to a temp directory and only renames
// it into place on completion, killing it mid-optimize discards the work, so the
// retry pays the same cost again and fails the same way. That loop is the whole
// "boot takes forever and then never succeeds" symptom.
//
// So the budget resets on evidence of life. "Nothing is listening" is the only
// state that can mean Vite will never arrive, and it gets the short budget. Once
// Vite has bound the port it is alive and merely busy, and we wait much longer
// for it to finish rather than throwing its progress away.
const LISTEN_TIMEOUT_MS = Number(process.env.LUCA_VITE_LISTEN_TIMEOUT_MS || 120_000);
const READY_TIMEOUT_MS = Number(process.env.LUCA_VITE_READY_TIMEOUT_MS || 300_000);
const PROBE_INTERVAL_MS = 250;
const PROGRESS_INTERVAL_MS = 5_000;

// This probes IDENTITY, not just liveness.
//
// A bare TCP connect only proves SOMETHING is listening — and 3000 is the most
// contested port on a dev machine (CRA, Next, Express, Rails). Vite runs with
// strictPort:true, so when 3000 is already taken it does not shift ports, it
// exits. A liveness-only check would then connect to the STRANGER on 3000 and
// launch Electron against it, loading a foreign page inside the LucaOS window
// with our preload attached (window.luca, getSecureToken, the full IPC bridge,
// webviewTag, webSecurity:false). Broken boot and a serious security hole.
//
// So: request a module only a Vite dev server serves and require it to look
// like Vite's client. Only a HEALTHY response that is not Vite means someone
// else owns the port — a state Vite can never recover from, so fail at once with
// a clear message. Every other answer is Vite starting, and we keep waiting.
const VITE_PROBE_PATH = '/@vite/client';

function probeDevServer(callback) {
    // A probe must report exactly once. req.destroy() inside the 'timeout'
    // handler also trips 'error', which used to deliver a second verdict for the
    // same probe: it forked the retry loop and printed the final failure twice.
    let settled = false;
    const settle = (result) => {
        if (settled) return;
        settled = true;
        callback(result);
    };

    const req = http.get(
        { host, port, path: VITE_PROBE_PATH, timeout: 4000 },
        (res) => {
            let body = '';
            res.setEncoding('utf8');
            // The client module is small; a prefix is enough to identify it.
            res.on('data', (chunk) => {
                if (body.length < 4096) body += chunk;
            });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    // Vite answers its own module requests with 504 while it is
                    // re-optimizing dependencies. That is Vite being busy, not a
                    // stranger on the port, and it must not abort the launch.
                    settle('busy');
                    return;
                }
                const isVite = /createHotContext|__vite__|vite\/dist\/client/.test(body);
                settle(isVite ? 'ready' : 'foreign');
            });
        },
    );
    req.once('timeout', () => {
        req.destroy();
        // Connected, but no response inside the window: Vite holds the port and
        // is blocked on work.
        settle('busy');
    });
    req.once('error', (error) => {
        // Refused is the only error that proves nothing is listening yet. A
        // reset or a hang-up means something answered and then dropped us.
        settle(error && error.code === 'ECONNREFUSED' ? 'down' : 'busy');
    });
}

function launchElectron() {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(electron, ['.'], { env, stdio: 'inherit', windowsHide: false });
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => child.kill(signal));
    }
    child.on('error', (error) => {
        console.error(`[ELECTRON] Failed to start: ${error.message}`);
        process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
        process.exitCode = code ?? (signal ? 1 : 0);
    });
}

const startedAt = Date.now();
let sawServer = false;
let deadline = startedAt + LISTEN_TIMEOUT_MS;
let lastProgressAt = startedAt;

// Minutes of silence read as a hang, which is how a working build gets killed by
// hand. Say which of the two states we are in, and for how long.
function reportProgress(state) {
    const now = Date.now();
    if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = now;
    const seconds = Math.round((now - startedAt) / 1000);
    console.log(
        state === 'down'
            ? `[ELECTRON] Waiting for the Vite dev server to listen on ${host}:${port} (${seconds}s).`
            : `[ELECTRON] Vite has ${host}:${port} and is still building; holding the window back (${seconds}s).`,
    );
}

function waitForDevServer() {
    probeDevServer((result) => {
        if (result === 'ready') {
            const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
            console.log(`[ELECTRON] Vite dev server ready after ${seconds}s. Starting Electron.`);
            launchElectron();
            return;
        }

        if (result === 'foreign') {
            console.error(
                `[ELECTRON] Refusing to start: ${host}:${port} is serving an application that is NOT the LucaOS Vite dev server.\n` +
                `[ELECTRON] Vite uses strictPort, so it exited rather than moving. Free that port, or set VITE_DEV_PORT to an unused one.`,
            );
            process.exitCode = 1;
            return;
        }

        if (result === 'busy' && !sawServer) {
            // First evidence of life. Hand back the longer budget, measured from
            // now, so the time already spent waiting for the bind is not charged
            // against the build.
            sawServer = true;
            deadline = Date.now() + READY_TIMEOUT_MS;
        }

        if (Date.now() >= deadline) {
            console.error(
                sawServer
                    ? `[ELECTRON] Vite is listening on ${host}:${port} but did not finish starting within ${Math.round(READY_TIMEOUT_MS / 1000)}s.\n` +
                      `[ELECTRON] Raise LUCA_VITE_READY_TIMEOUT_MS if this machine needs longer.`
                    : `[ELECTRON] Nothing is listening on ${host}:${port} after ${Math.round(LISTEN_TIMEOUT_MS / 1000)}s, so the Vite dev server never started.\n` +
                      `[ELECTRON] Its own error is in the [0] output above.`,
            );
            process.exitCode = 1;
            return;
        }

        reportProgress(result);
        setTimeout(waitForDevServer, PROBE_INTERVAL_MS);
    });
}

waitForDevServer();
