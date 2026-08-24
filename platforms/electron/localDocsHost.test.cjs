const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createLocalDocsHost, chunkText } = require('./localDocsHost.cjs');

test('registers, incrementally rescans, persists, and removes text folders', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-localdocs-'));
    const source = path.join(root, 'source');
    const stateRoot = path.join(root, 'state');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'notes.md'), '# Notes\nLocal knowledge');
    fs.writeFileSync(path.join(source, 'ignored.bin'), Buffer.from([0, 1, 2]));
    const host = createLocalDocsHost({ stateRoot, now: () => 100 });

    const registered = host.register({ folderPath: source, displayName: 'Notes' });
    assert.equal(registered.documentCount, 1);
    assert.equal(registered.chunkCount, 1);
    assert.equal(host.getChunks()[0].relativePath, 'notes.md');

    fs.writeFileSync(path.join(source, 'second.txt'), 'Another document');
    const rescanned = host.rescan(registered.id);
    assert.equal(rescanned.documentCount, 2);

    const restored = createLocalDocsHost({ stateRoot });
    assert.equal(restored.list()[0].documentCount, 2);
    assert.equal(restored.remove(registered.id), true);
    assert.deepEqual(restored.list(), []);
    fs.rmSync(root, { recursive: true, force: true });
});

test('chunks long text with bounded overlap', () => {
    const chunks = chunkText('word '.repeat(700), 300, 50);
    assert.ok(chunks.length > 2);
    assert.ok(chunks.every(chunk => chunk.length <= 300));
});

test('persists embeddings and retrieves ranked source chunks', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-localdocs-vector-'));
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'cats.md'), 'cats purr softly');
    fs.writeFileSync(path.join(source, 'rockets.md'), 'rockets launch upward');
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state') });
    const folder = host.register({ folderPath: source });
    const vectors = text => text.includes('cat') ? [1, 0] : [0, 1];
    await host.embedFolder(folder.id, 'embed-model', async texts => texts.map(vectors));
    const results = await host.search(
        { query: 'tell me about cats', modelId: 'embed-model', limit: 2 },
        async texts => texts.map(vectors),
    );
    assert.equal(results[0].relativePath, 'cats.md');
    assert.equal(results[0].score, 1);
    assert.equal(host.list()[0].embeddingModelId, 'embed-model');
    fs.rmSync(root, { recursive: true, force: true });
});

test('reports optional document parser failures instead of silently skipping files', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luca-localdocs-failures-'));
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'manual.pdf'), 'not parsed');
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state') });
    const folder = host.register({ folderPath: source });
    assert.equal(folder.failureCount, 1);
    assert.match(folder.failures[0].reason, /PDF extraction parser is not installed/);
    fs.rmSync(root, { recursive: true, force: true });
});
