const test = require('node:test');
const assert = require('node:assert/strict');
const { createDockerSandboxAdapter } = require('../dockerSandboxAdapter.cjs');

test('constructs a hardened container without shell interpolation', async () => {
    const calls = [];
    const adapter = createDockerSandboxAdapter({ execFile: async (...args) => { calls.push(args); return { stdout: 'container-id\n' }; } });
    await adapter.create({ sessionId: 'safe-id', workspacePath: 'C:\\sandbox\\safe-id', networkEnabled: false });
    const [command, args] = calls[0];
    assert.equal(command, 'docker');
    assert.ok(args.includes('--cap-drop'));
    assert.ok(args.includes('no-new-privileges:true'));
    assert.ok(args.includes('--read-only'));
    assert.equal(args[args.indexOf('--network') + 1], 'none');
    assert.ok(!args.includes('--privileged'));
});
