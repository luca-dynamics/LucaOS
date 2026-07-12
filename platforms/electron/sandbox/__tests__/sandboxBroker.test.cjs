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

test('passes requested capabilities into automatic backend probing', async () => {
    const probes = [];
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi, adapter: {
        kind: 'automatic',
        async probe(request) {
            probes.push(request);
            return { available: true, isolated: true, capabilities: ['terminal'] };
        },
        async create() { return { backend: 'wsl2' }; },
        async destroy() {}
    } });

    await broker.create({ missionId: 'mission-capabilities', capabilities: ['terminal'] });

    assert.deepEqual(probes, [{ capabilities: ['terminal'] }]);
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

test('exports and imports workspace artifacts with digest verification', async () => {
    const files = new Map();
    const writes = [];
    const artifactFs = {
        mkdirSync() {},
        rmSync() {},
        statSync(filePath) {
            const bytes = files.get(filePath);
            if (!bytes) throw new Error('missing file');
            return { isFile: () => true, size: bytes.byteLength };
        },
        readFileSync(filePath) {
            const bytes = files.get(filePath);
            if (!bytes) throw new Error('missing file');
            return bytes;
        },
        writeFileSync(filePath, bytes, options) {
            assert.equal(options.flag, 'wx');
            writes.push({ filePath, bytes });
            files.set(filePath, Buffer.from(bytes));
        }
    };
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi: artifactFs, adapter: {
        kind: 'docker',
        async probe() { return { available: true, isolated: true, capabilities: ['workspace_read', 'workspace_write'] }; },
        async create(input) { return { backend: 'docker', name: input.sessionId }; },
        async destroy() {}
    } });
    const source = await broker.create({ missionId: 'mission-6', capabilities: ['workspace_read', 'workspace_write'] });
    const target = await broker.create({ missionId: 'mission-6', capabilities: ['workspace_read', 'workspace_write'] });
    files.set(path.join(source.workspacePath, 'dist', 'app.zip'), Buffer.from('artifact-bytes'));

    const artifact = await broker.exportArtifact(source.sessionId, { relativePath: 'dist/app.zip' });
    assert.equal(artifact.hostFallbackAllowed, false);
    assert.equal(artifact.digest, 'sha256:6521df166eb07efaf36eba5b6bedefd9d6a252e9c80bab1c99653700ec71473c');

    const result = await broker.importArtifact(target.sessionId, { ...artifact, relativePath: 'incoming/app.zip' });
    assert.equal(result.imported, true);
    assert.equal(result.hostFallbackAllowed, false);
    assert.equal(writes[0].filePath, path.join(target.workspacePath, 'incoming', 'app.zip'));
    assert.equal(String(writes[0].bytes), 'artifact-bytes');
});

test('blocks unsafe artifact paths and digest mismatches', async () => {
    const artifactFs = {
        mkdirSync() {},
        rmSync() {},
        statSync() { return { isFile: () => true, size: 4 }; },
        readFileSync() { return Buffer.from('safe'); },
        writeFileSync() { throw new Error('write should not happen'); }
    };
    const broker = createSandboxBroker({ workspaceRoot: root, fsApi: artifactFs, adapter: {
        kind: 'docker',
        async probe() { return { available: true, isolated: true, capabilities: ['workspace_read', 'workspace_write'] }; },
        async create(input) { return { backend: 'docker', name: input.sessionId }; },
        async destroy() {}
    } });
    const session = await broker.create({ missionId: 'mission-7', capabilities: ['workspace_read', 'workspace_write'] });

    await assert.rejects(() => broker.exportArtifact(session.sessionId, { relativePath: '../escape.txt' }), /inside the workspace/);
    await assert.rejects(() => broker.importArtifact(session.sessionId, {
        sourceSessionId: 'other-session',
        relativePath: 'in/file.txt',
        bytesBase64: Buffer.from('safe').toString('base64'),
        digest: 'sha256:wrong'
    }), /digest mismatch/);
    await assert.rejects(() => broker.importArtifact(session.sessionId, {
        sourceSessionId: session.sessionId,
        relativePath: 'in/file.txt',
        bytesBase64: Buffer.from('safe').toString('base64'),
        digest: 'sha256:8b3369944dd2a3fab39e32d1aeb1f763946a458ae3e6368a46432adc8f3a0860'
    }), /source session/);
});
