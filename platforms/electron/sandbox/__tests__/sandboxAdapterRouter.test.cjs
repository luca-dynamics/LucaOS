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
