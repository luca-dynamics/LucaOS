const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandboxAdapterRouter } = require('../sandboxAdapterRouter.cjs');

test('selects WSL2 when Docker is unavailable', async () => {
    const selected = [];
    const router = createSandboxAdapterRouter([
        { kind: 'docker', async probe() { return { backend: 'docker', available: false, isolated: false, reason: 'down', capabilities: [] }; } },
        { kind: 'wsl2', async probe() { return { backend: 'wsl2', available: true, isolated: true, reason: 'ready', capabilities: ['terminal'] }; }, async create() { selected.push('wsl2'); return {}; }, async destroy() {} }
    ]);
    const runtime = await router.create({});
    assert.deepEqual(selected, ['wsl2']);
    assert.equal(runtime.backend, 'wsl2');
});

test('skips isolated backends that do not satisfy requested capabilities', async () => {
    const router = createSandboxAdapterRouter([
        {
            kind: 'windows_sandbox',
            async probe() { return { backend: 'windows_sandbox', available: true, isolated: true, reason: 'gui only', capabilities: ['workspace_read'] }; },
            async create() { throw new Error('wrong backend'); },
            async destroy() {}
        },
        {
            kind: 'wsl2',
            async probe() { return { backend: 'wsl2', available: true, isolated: true, reason: 'ready', capabilities: ['terminal', 'workspace_read'] }; },
            async create() { return { distroName: 'wsl' }; },
            async destroy() {}
        }
    ]);

    const probe = await router.probe({ capabilities: ['terminal'] });
    const runtime = await router.create({ capabilities: ['terminal'] });

    assert.equal(probe.backend, 'wsl2');
    assert.equal(runtime.backend, 'wsl2');
});

test('delegates artifact operations to the runtime backend', async () => {
    const calls = [];
    const router = createSandboxAdapterRouter([
        {
            kind: 'docker',
            async probe() { return { backend: 'docker', available: true, isolated: true, capabilities: [] }; },
            async create() { return { backend: 'docker', name: 'docker-session' }; },
            async exportArtifact(_runtime, request) { calls.push(['export', request.relativePath]); return { bytes: Buffer.from('ok') }; },
            async importArtifact(_runtime, artifact) { calls.push(['import', artifact.relativePath]); return { imported: true }; },
            async destroy() {}
        }
    ]);

    assert.deepEqual(await router.exportArtifact({ backend: 'docker' }, { relativePath: 'dist/app.zip' }), { bytes: Buffer.from('ok') });
    assert.deepEqual(await router.importArtifact({ backend: 'docker' }, { relativePath: 'incoming/app.zip' }), { imported: true });
    assert.deepEqual(calls, [['export', 'dist/app.zip'], ['import', 'incoming/app.zip']]);
});
