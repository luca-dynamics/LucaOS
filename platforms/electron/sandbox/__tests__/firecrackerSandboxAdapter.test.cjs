const test = require('node:test'); const assert = require('node:assert/strict'); const path = require('path');
const { createFirecrackerSandboxAdapter } = require('../firecrackerSandboxAdapter.cjs');
const options = { kernelPath: path.resolve('kernel'), rootfsPath: path.resolve('rootfs'), stateRoot: path.resolve('state') };
test('fails closed away from Linux', async () => { const adapter = createFirecrackerSandboxAdapter({ ...options, platform: 'win32' }); assert.equal((await adapter.probe()).available, false); });
test('requires KVM and managed images', async () => { const adapter = createFirecrackerSandboxAdapter({ ...options, platform: 'linux', fsApi: { existsSync: () => false } }); assert.match((await adapter.probe()).reason, /KVM/); });
