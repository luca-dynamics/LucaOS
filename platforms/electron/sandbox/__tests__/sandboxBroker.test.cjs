const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createSandboxBroker } = require('../sandboxBroker.cjs');

const fsApi = { mkdirSync() {}, rmSync() {} };
const root = path.resolve('C:/luca-sandbox-tests');

test('creates only isolated capability-matched sessions', async () => {
    const calls = [];
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi, adapter: {
        kind: 'docker',
        async probe() { return { available: true, isolated: true, capabilities: ['terminal'] }; },
        async create(input) { calls.push(input); return { name: `luca-sandbox-${input.sessionId}` }; },
        async destroy() {}
    } });
    const session = await broker.create({ missionId: 'mission-1', capabilities: ['terminal'] });
    assert.equal(session.status, 'running');
    assert.equal(session.hostFallbackAllowed, false);
    assert.equal(calls[0].networkEnabled, false);
});

test('fails closed when adapter is not isolated', async () => {
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi, adapter: { kind: 'docker', async probe() { return { available: true, isolated: false, capabilities: ['terminal'] }; } } });
    await assert.rejects(() => broker.create({ missionId: 'mission-2', capabilities: ['terminal'] }), /No isolated/);
});

test('rejects arbitrary capabilities before invoking backend', async () => {
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi, adapter: { kind: 'docker' } });
    await assert.rejects(() => broker.create({ missionId: 'mission-3', capabilities: ['host_control'] }), /unsupported/);
});

test('executes argv without a shell and caps the timeout', async () => {
    const commands = [];
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi, adapter: {
        kind: 'docker',
        async probe() { return { available: true, isolated: true, capabilities: ['terminal'] }; },
        async create() { return { backend: 'docker', name: 'sandbox' }; },
        async execute(_runtime, command) { commands.push(command); return { stdout: 'ok', stderr: '', exitCode: 0 }; },
        async destroy() {}
    } });
    const session = await broker.create({ missionId: 'mission-4', capabilities: ['terminal'] });
    const result = await broker.execute(session.sessionId, { executable: 'node', args: ['--version'], timeoutMs: 999999 });
    assert.equal(result.stdout, 'ok');
    assert.deepEqual(commands[0].args, ['--version']);
    assert.equal(commands[0].timeoutMs, 120000);
});

test('rejects invalid executable names before backend execution', async () => {
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi, adapter: {
        kind: 'docker',
        async probe() { return { available: true, isolated: true, capabilities: ['terminal'] }; },
        async create() { return { backend: 'docker' }; }
    } });
    const session = await broker.create({ missionId: 'mission-5', capabilities: ['terminal'] });
    await assert.rejects(() => broker.execute(session.sessionId, { executable: 'node && host-command', args: [] }), /Invalid sandbox executable/);
});
