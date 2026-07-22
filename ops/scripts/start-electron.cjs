/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const { spawn } = require('child_process');
const electron = require('electron');

const host = process.env.VITE_DEV_HOST || '127.0.0.1';
const port = Number(process.env.VITE_DEV_PORT || 3000);
const timeoutAt = Date.now() + 60_000;

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
// like Vite's client. Connection refused means Vite is still starting (retry);
// a healthy response that is NOT Vite means someone else owns the port, which
// Vite can never recover from — fail immediately with a clear message instead
// of burning the whole timeout.
const VITE_PROBE_PATH = '/@vite/client';

function probeDevServer(callback) {
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
                const isVite =
                    res.statusCode === 200 &&
                    /createHotContext|__vite__|vite\/dist\/client/.test(body);
                callback(isVite ? 'ready' : 'foreign');
            });
        },
    );
    req.once('timeout', () => {
        req.destroy();
        callback('waiting');
    });
    req.once('error', () => callback('waiting'));
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

function waitForDevServer() {
    probeDevServer((result) => {
        if (result === 'ready') {
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

        if (Date.now() >= timeoutAt) {
            console.error(`[ELECTRON] Timed out waiting for the Vite dev server at ${host}:${port}.`);
            process.exitCode = 1;
            return;
        }
        setTimeout(waitForDevServer, 250);
    });
}

waitForDevServer();
