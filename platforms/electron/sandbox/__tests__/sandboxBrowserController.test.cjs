const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandboxBrowserController } = require('../sandboxBrowserController.cjs');

test('routes a bounded semantic browser plan through the sandbox broker', async () => {
    let call;
    const controller = createSandboxBrowserController({ broker: { execute: async (...args) => { call = args; return { exitCode: 0 }; } } });
    await controller.run('session-1', { url: 'https://example.com', actions: [{ type: 'click', role: 'button', name: 'Continue' }] });
    assert.equal(call[0], 'session-1');
    assert.equal(call[1].executable, '/usr/local/bin/luca-browser');
    const plan = JSON.parse(Buffer.from(call[1].args[0], 'base64url').toString('utf8'));
    assert.equal(plan.actions[0].role, 'button');
});

test('rejects arbitrary selectors and unsupported actions', async () => {
    const controller = createSandboxBrowserController({ broker: { execute: async () => assert.fail('must not execute') } });
    await assert.rejects(() => controller.run('session-1', { url: 'https://example.com', actions: [{ type: 'evaluate', role: 'document', name: 'body' }] }), /Invalid browser action/);
});
