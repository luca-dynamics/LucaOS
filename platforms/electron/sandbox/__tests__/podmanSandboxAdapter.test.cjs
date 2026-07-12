const test = require('node:test');
const assert = require('node:assert/strict');
const { createPodmanSandboxAdapter } = require('../podmanSandboxAdapter.cjs');

test('only reports isolation for rootless Podman', async () => {
    const rootless = createPodmanSandboxAdapter({ execFile: async () => ({ stdout: 'true\n' }) });
    assert.equal((await rootless.probe()).available, true);
    assert.equal((await rootless.probe()).isolated, true);

    const rootful = createPodmanSandboxAdapter({ execFile: async () => ({ stdout: 'false\n' }) });
    const probe = await rootful.probe();
    assert.equal(probe.available, false);
    assert.equal(probe.isolated, false);
    assert.match(probe.reason, /not rootless/);
});

test('constructs a hardened rootless container without shell interpolation', async () => {
    const calls = [];
    const adapter = createPodmanSandboxAdapter({ execFile: async (...args) => { calls.push(args); return { stdout: 'container-id\n' }; } });
    await adapter.create({ sessionId: 'safe-id', workspacePath: '/tmp/luca-safe-id', networkEnabled: false });
    const [, podmanArgs] = calls[0];

    assert.deepEqual(podmanArgs.slice(0, 4), ['run', '--detach', '--name', 'luca-sandbox-safe-id']);
    assert.ok(podmanArgs.includes('--cap-drop'));
    assert.ok(podmanArgs.includes('all'));
    assert.ok(podmanArgs.includes('--read-only'));
    assert.ok(podmanArgs.includes('--security-opt'));
    assert.ok(podmanArgs.includes('no-new-privileges'));
    assert.ok(podmanArgs.includes('--network'));
    assert.ok(podmanArgs.includes('none'));
    assert.ok(podmanArgs.includes('--mount'));
    assert.ok(podmanArgs.includes('type=bind,src=/tmp/luca-safe-id,dst=/workspace'));
});

