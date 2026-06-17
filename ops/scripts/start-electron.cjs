/* eslint-disable @typescript-eslint/no-require-imports */
const net = require('net');
const { spawn } = require('child_process');
const electron = require('electron');

const host = process.env.VITE_DEV_HOST || '127.0.0.1';
const port = Number(process.env.VITE_DEV_PORT || 3000);
const timeoutAt = Date.now() + 60_000;

function waitForDevServer() {
    const socket = net.createConnection({ host, port });
    socket.once('connect', () => {
        socket.destroy();
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
    });
    socket.once('error', () => {
        socket.destroy();
        if (Date.now() >= timeoutAt) {
            console.error(`[ELECTRON] Timed out waiting for ${host}:${port}.`);
            process.exitCode = 1;
            return;
        }
        setTimeout(waitForDevServer, 250);
    });
}

waitForDevServer();
