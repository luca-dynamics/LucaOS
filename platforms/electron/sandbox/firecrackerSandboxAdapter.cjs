const { execFile: nodeExecFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

function createFirecrackerSandboxAdapter({ execFile = promisify(nodeExecFile), fsApi = fs, platform = process.platform, kernelPath, rootfsPath, stateRoot } = {}) {
    for (const [name, value] of Object.entries({ kernelPath, rootfsPath, stateRoot })) if (!value || !path.isAbsolute(value)) throw new Error(`Firecracker ${name} must be absolute.`);
    const sessions = new Map();
    return {
        kind: 'firecracker',
        async probe() {
            if (platform !== 'linux') return { backend: 'firecracker', available: false, isolated: false, reason: 'Firecracker requires a Linux host.', capabilities: [] };
            if (!fsApi.existsSync('/dev/kvm')) return { backend: 'firecracker', available: false, isolated: false, reason: 'KVM is unavailable.', capabilities: [] };
            if (!fsApi.existsSync(kernelPath) || !fsApi.existsSync(rootfsPath)) return { backend: 'firecracker', available: false, isolated: false, reason: 'Managed microVM kernel or rootfs is missing.', capabilities: [] };
            try { await execFile('firecracker', ['--version'], { timeout: 5_000 }); return { backend: 'firecracker', available: true, isolated: true, reason: 'Firecracker and KVM are available.', capabilities: ['terminal', 'workspace_read', 'workspace_write', 'network'] }; }
            catch { return { backend: 'firecracker', available: false, isolated: false, reason: 'Firecracker is not installed.', capabilities: [] }; }
        },
        async create({ sessionId, networkEnabled = false }) {
            if (!/^[a-f0-9-]{36}$/.test(sessionId)) throw new Error('Invalid Firecracker session id.');
            const sessionRoot = path.join(stateRoot, sessionId); fsApi.mkdirSync(sessionRoot, { recursive: true });
            const runtime = { backend: 'firecracker', sessionId, sessionRoot, socketPath: path.join(sessionRoot, 'firecracker.sock'), networkEnabled, kernelPath, rootfsPath };
            sessions.set(sessionId, runtime); return runtime;
        },
        async execute(runtime, command) {
            if (!sessions.has(runtime.sessionId)) throw new Error('Firecracker session is not active.');
            const result = await execFile('firecracker-guest-exec', ['--socket', runtime.socketPath, '--', command.executable, ...command.args], { timeout: command.timeoutMs, maxBuffer: 1024 * 1024 });
            return { stdout: String(result.stdout || ''), stderr: String(result.stderr || ''), exitCode: 0 };
        },
        async destroy(runtime) { sessions.delete(runtime.sessionId); fsApi.rmSync(runtime.sessionRoot, { recursive: true, force: true }); }
    };
}
module.exports = { createFirecrackerSandboxAdapter };
