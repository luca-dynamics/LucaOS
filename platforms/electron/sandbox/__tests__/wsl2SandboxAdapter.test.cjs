const test = require('node:test');
const assert = require('node:assert/strict');
const { createWsl2SandboxAdapter } = require('../wsl2SandboxAdapter.cjs');

const rootfsPath = 'C:\\luca\\rootfs.tar';
const checksumPath = `${rootfsPath}.sha256`;
const installRoot = 'C:\\luca\\distros';
const rootfs = Buffer.from('verified-rootfs');
const checksum = require('crypto').createHash('sha256').update(rootfs).digest('hex');
const verifiedFs = {
    existsSync: () => true,
    readFileSync(file) { return file === rootfsPath ? rootfs : `${checksum}  rootfs.tar\n`; },
    mkdirSync() {}, rmSync() {}
};

test('does not claim isolation without the managed rootfs', async () => {
    const adapter = createWsl2SandboxAdapter({ platform: 'win32', rootfsPath, checksumPath, installRoot, fsApi: { existsSync: () => false } });
    const probe = await adapter.probe();
    assert.equal(probe.available, false);
    assert.equal(probe.isolated, false);
});

test('fails closed when rootfs integrity does not match', async () => {
    const adapter = createWsl2SandboxAdapter({
        platform: 'win32', rootfsPath, checksumPath, installRoot,
        fsApi: { ...verifiedFs, readFileSync(file) { return file === rootfsPath ? rootfs : `${'0'.repeat(64)}  rootfs.tar\n`; } }
    });
    const probe = await adapter.probe();
    assert.equal(probe.available, false);
    assert.match(probe.reason, /does not match/);
});

test('imports a unique WSL2 distro and requires per-command network isolation', async () => {
    const calls = [];
    const adapter = createWsl2SandboxAdapter({
        platform: 'win32', rootfsPath, installRoot,
        checksumPath,
        fsApi: verifiedFs,
        execFile: async (_command, args) => { calls.push(args); return { stdout: '' }; }
    });
    const sessionId = '12345678-1234-1234-1234-123456789abc';
    const runtime = await adapter.create({ sessionId, networkEnabled: false });
    assert.equal(runtime.distroName, `LucaOS-Sandbox-${sessionId}`);
    assert.equal(runtime.networkIsolation, 'unshare_required');
    assert.deepEqual(calls[0].slice(0, 2), ['--import', `LucaOS-Sandbox-${sessionId}`]);
    assert.ok(calls[0].includes('--version'));
    assert.equal(calls.length, 1);
});

test('exports and imports artifacts through WSL2 workspace commands', async () => {
    const calls = [];
    const inputs = [];
    const adapter = createWsl2SandboxAdapter({
        platform: 'win32', rootfsPath, installRoot,
        checksumPath,
        fsApi: verifiedFs,
        execFile: async (_command, args, options = {}) => {
            calls.push(args);
            if (options.input) inputs.push(options.input);
            return { stdout: Buffer.from('artifact') };
        }
    });
    const runtime = { distroName: 'LucaOS-Sandbox-test', networkEnabled: false };

    const exported = await adapter.exportArtifact(runtime, { relativePath: 'dist/app.zip', maxBytes: 1024 });
    await adapter.importArtifact(runtime, { relativePath: 'incoming/app.zip', bytes: Buffer.from('artifact'), maxBytes: 1024 });

    assert.deepEqual(exported, { bytes: Buffer.from('artifact') });
    assert.deepEqual(calls[0].slice(0, 6), ['--distribution', runtime.distroName, '--user', 'luca', '--cd', '/workspace']);
    assert.ok(calls[0].includes('/workspace/dist/app.zip'));
    assert.ok(calls[1].includes('/workspace/incoming'));
    assert.ok(calls[1].includes('/workspace/incoming/app.zip'));
    assert.equal(String(inputs[0]), 'artifact');
});
