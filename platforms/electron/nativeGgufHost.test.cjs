const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createNativeGgufHost } = require('./nativeGgufHost.cjs');

const SHA256_OF_HELLO = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

/** A stub node-llama-cpp that records which weight files were loaded. */
function stubNative(loads = []) {
    return async () => ({
        getLlama: async () => ({
            loadModel: async ({ modelPath }) => {
                loads.push(path.basename(modelPath));
                return {
                    createContext: async () => ({ getSequence: () => ({}), dispose: async () => {} }),
                    createEmbeddingContext: async () => ({
                        getEmbeddingFor: async text => ({ vector: [String(text).length, 1] }),
                        dispose: async () => {},
                    }),
                    dispose: async () => {},
                };
            },
        }),
        LlamaChatSession: class {
            async prompt(value) { return `native:${value}`; }
            dispose() {}
        },
    });
}

function scratchModel(prefix, contents) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    const modelPath = path.join(root, 'tiny.gguf');
    fs.writeFileSync(modelPath, contents);
    return { root, modelPath };
}

test('registers, verifies, persists, and chats with GGUF models', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-host-', 'hello');
    const loadNative = stubNative();
    const host = createNativeGgufHost({ stateRoot: root, loadNative });
    const registered = await host.register({ id: 'tiny', modelPath, sha256: SHA256_OF_HELLO });
    // A checksum the user supplied and the bytes matched is itself the act of
    // consent, so a verified model is loadable without a second prompt.
    assert.equal(registered.verified, true);
    assert.equal(registered.sha256, SHA256_OF_HELLO);
    assert.equal(registered.sizeBytes, 5);
    assert.equal(await host.chat({ model: 'tiny', prompt: 'hello' }), 'native:hello');
    const restored = createNativeGgufHost({ stateRoot: root, loadNative });
    assert.deepEqual(restored.list().map(model => model.id), ['tiny']);
});

test('rejects checksum mismatches', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-host-', 'hello');
    const host = createNativeGgufHost({ stateRoot: root });
    await assert.rejects(
        host.register({ id: 'tiny', modelPath, sha256: '0'.repeat(64) }),
        /checksum mismatch/i,
    );
});

test('refuses to load a model that was never registered', async () => {
    const { root } = scratchModel('luca-gguf-admit-', 'hello');
    const host = createNativeGgufHost({ stateRoot: root, loadNative: stubNative() });
    await assert.rejects(host.chat({ model: 'ghost', prompt: 'hi' }), /not registered/i);
    await assert.rejects(host.embed({ model: 'ghost', texts: ['hi'] }), /not registered/i);
});

test('refuses to load a locally hashed model until the user accepts it', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-consent-', 'hello');
    const host = createNativeGgufHost({ stateRoot: root, loadNative: stubNative() });
    // No checksum supplied: Luca pins what it found and trusts nothing yet.
    const registered = await host.register({ id: 'tiny', modelPath });
    assert.equal(registered.verified, false);
    assert.equal(registered.consentedAt, null);

    await assert.rejects(host.chat({ model: 'tiny', prompt: 'hi' }), /explicit consent/i);

    await host.consent('tiny');
    assert.equal(await host.chat({ model: 'tiny', prompt: 'hi' }), 'native:hi');
});

test('refuses to load a model whose bytes changed after it was accepted', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-tamper-', 'hello');
    const host = createNativeGgufHost({ stateRoot: root, loadNative: stubNative() });
    await host.register({ id: 'tiny', modelPath });
    await host.consent('tiny');
    assert.equal(await host.chat({ model: 'tiny', prompt: 'hi' }), 'native:hi');

    // Unload first: the gate admits bytes into memory, and weights already
    // resident are the ones that passed. Rewriting the file cannot change them,
    // so tampering is caught on the next load, not retroactively.
    await host.unload();
    fs.writeFileSync(modelPath, 'substituted weights of a different length');

    await assert.rejects(host.chat({ model: 'tiny', prompt: 'hi' }), /changed since it was accepted/i);
});

test('generates embeddings through a registered GGUF model', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-embed-', 'embedding model');
    const host = createNativeGgufHost({ stateRoot: root, loadNative: stubNative() });
    await host.register({ id: 'embed', modelPath });
    await host.consent('embed');
    assert.deepEqual(await host.embed({ model: 'embed', texts: ['a', 'abcd'] }), [[1, 1], [4, 1]]);
});

test('keeps the chat model resident across an embedding call', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-gguf-slots-'));
    const chatPath = path.join(root, 'chat.gguf');
    const embedPath = path.join(root, 'embed.gguf');
    fs.writeFileSync(chatPath, 'chat weights');
    fs.writeFileSync(embedPath, 'embed weights');
    const loads = [];
    const host = createNativeGgufHost({ stateRoot: root, loadNative: stubNative(loads) });
    await host.register({ id: 'chat', modelPath: chatPath });
    await host.consent('chat');
    await host.register({ id: 'embed', modelPath: embedPath });
    await host.consent('embed');

    await host.chat({ model: 'chat', prompt: 'first' });
    await host.embed({ model: 'embed', texts: ['ground this'] });
    await host.chat({ model: 'chat', prompt: 'second' });

    // Each model's weights load exactly once. Under the single shared slot this
    // read ['chat.gguf', 'embed.gguf', 'chat.gguf'] — a full reload of a
    // multi-gigabyte chat model between two turns of one conversation, which is
    // precisely the grounded-chat path this host exists to serve.
    assert.deepEqual(loads, ['chat.gguf', 'embed.gguf']);
    assert.deepEqual(host.residentModels(), { chat: 'chat', embedding: 'embed' });
});

test('releases an idle chat model once keep-alive expires', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-ttl-', 'hello');
    const loads = [];
    const host = createNativeGgufHost({
        stateRoot: root,
        loadNative: stubNative(loads),
        chatKeepAliveMs: 10,
    });
    await host.register({ id: 'tiny', modelPath });
    await host.consent('tiny');

    await host.chat({ model: 'tiny', prompt: 'first' });
    assert.equal(host.residentModels().chat, 'tiny');

    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(host.residentModels().chat, null);

    await host.chat({ model: 'tiny', prompt: 'second' });
    assert.deepEqual(loads, ['tiny.gguf', 'tiny.gguf']);
});

test('streams native text chunks and forwards cancellation signals', async () => {
    const { root, modelPath } = scratchModel('luca-gguf-stream-', 'stream model');
    let receivedSignal;
    const loadNative = async () => ({
        getLlama: async () => ({ loadModel: async () => ({
            createContext: async () => ({ getSequence: () => ({}), dispose: async () => {} }),
            dispose: async () => {},
        }) }),
        LlamaChatSession: class {
            async prompt(_prompt, options) {
                receivedSignal = options.signal;
                options.onTextChunk('one');
                options.onTextChunk('two');
                return 'onetwo';
            }
        },
    });
    const host = createNativeGgufHost({ stateRoot: root, loadNative });
    await host.register({ id: 'stream', modelPath });
    await host.consent('stream');
    const controller = new AbortController();
    const tokens = [];
    await host.stream({ model: 'stream', prompt: 'go', signal: controller.signal, onToken: token => tokens.push(token) });
    assert.deepEqual(tokens, ['one', 'two']);
    assert.equal(receivedSignal, controller.signal);
});
