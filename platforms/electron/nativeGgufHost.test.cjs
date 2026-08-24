const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createNativeGgufHost } = require('./nativeGgufHost.cjs');

test('registers, verifies, persists, and chats with GGUF models', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-gguf-host-'));
    const modelPath = path.join(root, 'tiny.gguf');
    fs.writeFileSync(modelPath, 'hello');
    const prompt = async value => `native:${value}`;
    const loadNative = async () => ({
        getLlama: async () => ({ loadModel: async () => ({ createContext: async () => ({ getSequence: () => ({}), dispose: async () => {} }), dispose: async () => {} }) }),
        LlamaChatSession: class { prompt = prompt; dispose() {} },
    });
    const host = createNativeGgufHost({ stateRoot: root, loadNative });
    const registered = await host.register({
        id: 'tiny', modelPath,
        sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    });
    assert.equal(registered.verified, true);
    assert.equal(await host.chat({ model: 'tiny', prompt: 'hello' }), 'native:hello');
    const restored = createNativeGgufHost({ stateRoot: root, loadNative });
    assert.deepEqual(restored.list().map(model => model.id), ['tiny']);
});

test('rejects checksum mismatches', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-gguf-host-'));
    const modelPath = path.join(root, 'tiny.gguf');
    fs.writeFileSync(modelPath, 'hello');
    const host = createNativeGgufHost({ stateRoot: root });
    await assert.rejects(
        host.register({ id: 'tiny', modelPath, sha256: '0'.repeat(64) }),
        /checksum mismatch/i,
    );
});

test('generates embeddings through a registered GGUF model', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-gguf-embed-'));
    const modelPath = path.join(root, 'embed.gguf');
    fs.writeFileSync(modelPath, 'embedding model');
    const loadNative = async () => ({
        getLlama: async () => ({ loadModel: async () => ({
            createEmbeddingContext: async () => ({
                getEmbeddingFor: async text => ({ vector: [String(text).length, 1] }),
                dispose: async () => {},
            }),
            dispose: async () => {},
        }) }),
        LlamaChatSession: class {},
    });
    const host = createNativeGgufHost({ stateRoot: root, loadNative });
    await host.register({ id: 'embed', modelPath });
    assert.deepEqual(await host.embed({ model: 'embed', texts: ['a', 'abcd'] }), [[1, 1], [4, 1]]);
});

test('streams native text chunks and forwards cancellation signals', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-gguf-stream-'));
    const modelPath = path.join(root, 'stream.gguf');
    fs.writeFileSync(modelPath, 'stream model');
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
    const controller = new AbortController();
    const tokens = [];
    await host.stream({ model: 'stream', prompt: 'go', signal: controller.signal, onToken: token => tokens.push(token) });
    assert.deepEqual(tokens, ['one', 'two']);
    assert.equal(receivedSignal, controller.signal);
});
