const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const LAUNCHER = path.join(__dirname, 'start-electron.cjs');

// Run the real launcher as a child process and collect everything it said. None
// of these tests let the probe reach 'ready', so Electron is never spawned and no
// window opens.
function runLauncher(env) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [LAUNCHER], {
            env: { ...process.env, ...env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        child.stdout.on('data', (chunk) => { out += chunk; });
        child.stderr.on('data', (chunk) => { out += chunk; });
        child.on('exit', (code) => resolve({ code, out }));
    });
}

function listen(handler, port = 0) {
    const server = http.createServer(handler);
    const sockets = [];
    server.on('connection', (socket) => sockets.push(socket));
    return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => {
            resolve({
                port: server.address().port,
                close: () => new Promise((done) => {
                    for (const socket of sockets) socket.destroy();
                    server.close(done);
                }),
            });
        });
    });
}

/** A port nothing holds: bind one, then let it go. */
async function freePort() {
    const probe = await listen(() => {});
    const { port } = probe;
    await probe.close();
    return port;
}

function occurrences(haystack, needle) {
    return haystack.split(needle).length - 1;
}

test('says the dev server never started when nothing is listening', async () => {
    const port = await freePort();

    const { code, out } = await runLauncher({
        VITE_DEV_PORT: String(port),
        LUCA_VITE_LISTEN_TIMEOUT_MS: '400',
        LUCA_VITE_READY_TIMEOUT_MS: '400',
    });

    assert.equal(code, 1);
    assert.match(out, /never started/);
    // The dangerous message must not appear for a port that is simply empty.
    assert.doesNotMatch(out, /NOT the LucaOS Vite dev server/);
});

test('refuses a healthy non-Vite server on the port, and says so once', async () => {
    const server = await listen((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>some other dev server</html>');
    });
    try {
        const { code, out } = await runLauncher({
            VITE_DEV_PORT: String(server.port),
            LUCA_VITE_LISTEN_TIMEOUT_MS: '5000',
            LUCA_VITE_READY_TIMEOUT_MS: '5000',
        });

        assert.equal(code, 1);
        assert.equal(occurrences(out, 'is serving an application that is NOT'), 1);
    } finally {
        await server.close();
    }
});

test('treats a 504 from a re-optimizing Vite as busy, not as a foreign server', async () => {
    // Vite answers its own module requests with 504 while it rebuilds the
    // dependency bundle. Reading that as "someone else owns the port" aborted a
    // launch that only needed more time.
    const server = await listen((req, res) => {
        res.writeHead(504);
        res.end('Outdated Optimize Dep');
    });
    try {
        const { code, out } = await runLauncher({
            VITE_DEV_PORT: String(server.port),
            LUCA_VITE_LISTEN_TIMEOUT_MS: '5000',
            LUCA_VITE_READY_TIMEOUT_MS: '0',
        });

        assert.equal(code, 1);
        assert.doesNotMatch(out, /NOT the LucaOS Vite dev server/);
        assert.match(out, /did not finish starting/);
    } finally {
        await server.close();
    }
});

test('a probe that times out mid-request delivers one verdict, not two', async () => {
    // The request timeout calls req.destroy(), which also trips the 'error'
    // handler. Without a latch that is two verdicts for one probe: it forks the
    // retry loop and prints the failure twice.
    const server = await listen(() => { /* accept, never answer */ });
    try {
        const { code, out } = await runLauncher({
            VITE_DEV_PORT: String(server.port),
            LUCA_VITE_LISTEN_TIMEOUT_MS: '30000',
            LUCA_VITE_READY_TIMEOUT_MS: '0',
        });

        assert.equal(code, 1);
        assert.equal(occurrences(out, 'did not finish starting'), 1);
    } finally {
        await server.close();
    }
});

test('a server that appears late gets the build budget, not the listen budget', async () => {
    // The fix that matters: time spent waiting for Vite to bind must not be
    // charged against the time Vite needs to build. A launcher that held one flat
    // deadline killed a healthy dev server mid-optimize.
    const port = await freePort();
    const pending = runLauncher({
        VITE_DEV_PORT: String(port),
        LUCA_VITE_LISTEN_TIMEOUT_MS: '2000',
        LUCA_VITE_READY_TIMEOUT_MS: '0',
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    const server = await listen((req, res) => {
        res.writeHead(504);
        res.end('Outdated Optimize Dep');
    }, port);

    try {
        const { code, out } = await pending;

        assert.equal(code, 1);
        // The build-phase message proves the budget was handed back on first
        // evidence of life; the listen-phase message would prove it was not.
        assert.match(out, /did not finish starting/);
        assert.doesNotMatch(out, /never started/);
    } finally {
        await server.close();
    }
});
