const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createWindowsSandboxAdapter } = require('../windowsSandboxAdapter.cjs');

test('does not claim availability off Windows or without Windows Sandbox executable', async () => {
    const nonWindows = createWindowsSandboxAdapter({ platform: 'linux', fsApi: { existsSync: () => true } });
    assert.equal((await nonWindows.probe()).available, false);

    const missing = createWindowsSandboxAdapter({ platform: 'win32', fsApi: { existsSync: () => false } });
    const probe = await missing.probe();
    assert.equal(probe.available, false);
    assert.equal(probe.isolated, false);
});

test('reports workspace capabilities without terminal execution', async () => {
    const adapter = createWindowsSandboxAdapter({ platform: 'win32', fsApi: { existsSync: () => true } });
    const probe = await adapter.probe();
    assert.equal(probe.available, true);
    assert.equal(probe.isolated, true);
    assert.deepEqual(probe.capabilities, ['workspace_read', 'workspace_write']);
});

test('creates a locked-down Windows Sandbox configuration', async () => {
    const writes = new Map();
    const created = [];
    const systemRoot = path.resolve('fixtures', 'Windows');
    const configRoot = path.resolve('fixtures', 'configs');
    const workspacePath = path.resolve('fixtures', 'workspace');
    const adapter = createWindowsSandboxAdapter({
        platform: 'win32',
        systemRoot,
        configRoot,
        fsApi: {
            existsSync: () => true,
            mkdirSync(target) { created.push(target); },
            writeFileSync(file, contents, options) {
                assert.equal(options.flag, 'wx');
                writes.set(file, contents);
            },
            rmSync() {}
        },
        spawn(executable, args, options) {
            assert.equal(executable, path.join(systemRoot, 'System32', 'WindowsSandbox.exe'));
            assert.deepEqual(args, [path.join(configRoot, '12345678-1234-1234-1234-123456789abc.wsb')]);
            assert.equal(options.detached, true);
            return { pid: 42, unref() {} };
        }
    });

    const runtime = await adapter.create({
        sessionId: '12345678-1234-1234-1234-123456789abc',
        workspacePath
    });

    const config = writes.get(runtime.configPath);
    assert.equal(runtime.processId, 42);
    assert.ok(created.includes(configRoot));
    assert.match(config, /<VGpu>Disable<\/VGpu>/);
    assert.match(config, /<Networking>Disable<\/Networking>/);
    assert.ok(config.includes(`<HostFolder>${workspacePath}</HostFolder>`));
    assert.match(config, /<ReadOnly>false<\/ReadOnly>/);
});

