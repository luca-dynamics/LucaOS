const { execFile: nodeExecFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createWsl2SandboxAdapter({
    execFile = promisify(nodeExecFile),
    fsApi = fs,
    platform = process.platform,
    rootfsPath,
    checksumPath = `${rootfsPath}.sha256`,
    installRoot
} = {}) {
    if (!rootfsPath || !path.isAbsolute(rootfsPath)) throw new Error('WSL2 sandbox rootfs path must be absolute.');
    if (!installRoot || !path.isAbsolute(installRoot)) throw new Error('WSL2 sandbox install root must be absolute.');
    const wsl = (args, options = {}) => execFile('wsl.exe', args, {
        windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024, ...options
    });

    function verifyRootfs() {
        if (!fsApi.existsSync(checksumPath)) return { valid: false, reason: 'Managed LucaOS WSL2 rootfs checksum is missing.' };
        const expected = String(fsApi.readFileSync(checksumPath, 'utf8')).trim().split(/\s+/)[0]?.toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(expected || '')) return { valid: false, reason: 'Managed LucaOS WSL2 rootfs checksum is invalid.' };
        const actual = crypto.createHash('sha256').update(fsApi.readFileSync(rootfsPath)).digest('hex');
        return actual === expected
            ? { valid: true, sha256: actual }
            : { valid: false, reason: 'Managed LucaOS WSL2 rootfs checksum does not match.' };
    }

    function workspacePath(relativePath) {
        const normalized = typeof relativePath === 'string' ? relativePath.replaceAll('\\', '/').trim() : '';
        if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) throw new Error('Invalid WSL2 sandbox artifact path.');
        if (normalized.split('/').some((part) => !part || part === '..')) throw new Error('Invalid WSL2 sandbox artifact path.');
        return `/workspace/${normalized}`;
    }

    return {
        kind: 'wsl2',
        async probe() {
            if (platform !== 'win32') return { backend: 'wsl2', available: false, isolated: false, reason: 'WSL2 is only available on Windows.', capabilities: [] };
            if (!fsApi.existsSync(rootfsPath)) return { backend: 'wsl2', available: false, isolated: false, reason: 'Managed LucaOS WSL2 root filesystem is missing.', capabilities: [] };
            const integrity = verifyRootfs();
            if (!integrity.valid) return { backend: 'wsl2', available: false, isolated: false, reason: integrity.reason, capabilities: [] };
            try {
                await wsl(['--status']);
                return { backend: 'wsl2', available: true, isolated: true, reason: 'WSL2 and the verified managed sandbox rootfs are available.', capabilities: ['terminal', 'workspace_read', 'workspace_write', 'network'], rootfsSha256: integrity.sha256 };
            } catch (error) {
                return { backend: 'wsl2', available: false, isolated: false, reason: error?.code === 'ENOENT' ? 'WSL is not installed.' : 'WSL2 is unavailable or not initialized.', capabilities: [] };
            }
        },
        async create({ sessionId, networkEnabled = false }) {
            if (!/^[a-f0-9-]{36}$/.test(sessionId)) throw new Error('Invalid WSL2 sandbox session id.');
            const distroName = `LucaOS-Sandbox-${sessionId}`;
            const distroPath = path.join(installRoot, sessionId);
            fsApi.mkdirSync(distroPath, { recursive: true });
            try {
                await wsl(['--import', distroName, distroPath, rootfsPath, '--version', '2'], { timeout: 120_000 });
                return {
                    backend: 'wsl2', distroName, distroPath, networkEnabled,
                    networkIsolation: networkEnabled ? 'wsl_default' : 'unshare_required'
                };
            } catch (error) {
                try { await wsl(['--unregister', distroName]); } catch { /* best-effort rollback */ }
                fsApi.rmSync(distroPath, { recursive: true, force: true });
                throw error;
            }
        },
        async execute(runtime, { executable, args, timeoutMs }) {
            const command = runtime.networkEnabled
                ? [executable, ...args]
                : ['unshare', '--user', '--map-root-user', '--net', '--', executable, ...args];
            const result = await wsl(
                ['--distribution', runtime.distroName, '--user', 'luca', '--cd', '/workspace', '--exec', ...command],
                { timeout: timeoutMs }
            );
            return { stdout: String(result.stdout || ''), stderr: String(result.stderr || ''), exitCode: 0 };
        },
        async exportArtifact(runtime, { relativePath, maxBytes }) {
            const artifactPath = workspacePath(relativePath);
            const result = await wsl(
                ['--distribution', runtime.distroName, '--user', 'luca', '--cd', '/workspace', '--exec', '/bin/sh', '-c', 'test -f "$1" && cat "$1"', 'luca-export', artifactPath],
                { timeout: 30_000, encoding: 'buffer', maxBuffer: maxBytes + 1 }
            );
            const bytes = Buffer.from(result.stdout || []);
            if (bytes.byteLength > maxBytes) throw new Error('Sandbox artifact exceeds the transfer size limit.');
            return { bytes };
        },
        async importArtifact(runtime, { relativePath, bytes, maxBytes }) {
            if (bytes.byteLength > maxBytes) throw new Error('Sandbox artifact exceeds the transfer size limit.');
            const artifactPath = workspacePath(relativePath);
            const directory = path.posix.dirname(artifactPath);
            await wsl(
                ['--distribution', runtime.distroName, '--user', 'luca', '--cd', '/workspace', '--exec', '/bin/sh', '-c', 'mkdir -p "$1" && test ! -e "$2" && cat > "$2"', 'luca-import', directory, artifactPath],
                { timeout: 30_000, input: bytes, maxBuffer: 1024 * 1024 }
            );
            return { imported: true };
        },
        async destroy({ distroName, distroPath }) {
            await wsl(['--terminate', distroName]).catch(() => undefined);
            await wsl(['--unregister', distroName]);
            fsApi.rmSync(distroPath, { recursive: true, force: true });
        }
    };
}

module.exports = { createWsl2SandboxAdapter };
