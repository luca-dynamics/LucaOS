const assert = require('node:assert/strict');
const test = require('node:test');
const { createNativeGgufApiServer } = require('./nativeGgufApiServer.cjs');

const bearer = token => ({ authorization: `Bearer ${token}` });

test('exposes registered models and non-streaming chat to a token-bearing caller', async () => {
    const calls = [];
    const host = {
        list: () => [{ id: 'tiny', displayName: 'Tiny' }],
        chat: async request => { calls.push(request); return 'local answer'; },
    };
    const api = createNativeGgufApiServer({ host });
    const started = await api.start(0);
    try {
        assert.equal(started.host, '127.0.0.1');
        assert.match(started.token, /^[A-Za-z0-9_-]{40,}$/);
        const modelsResponse = await fetch(`http://127.0.0.1:${started.port}/v1/models`, {
            headers: bearer(started.token),
        });
        assert.deepEqual(await modelsResponse.json(), {
            object: 'list',
            data: [{ id: 'native-gguf:tiny', object: 'model', owned_by: 'luca-local' }],
        });
        const chatResponse = await fetch(`http://127.0.0.1:${started.port}/v1/chat/completions`, {
            method: 'POST', headers: { 'content-type': 'application/json', ...bearer(started.token) },
            body: JSON.stringify({ model: 'native-gguf:tiny', messages: [{ role: 'user', content: 'Hello' }], max_tokens: 32 }),
        });
        const completion = await chatResponse.json();
        assert.equal(chatResponse.status, 200);
        assert.equal(completion.choices[0].message.content, 'local answer');
        assert.deepEqual(calls, [{ model: 'tiny', prompt: 'USER: Hello', temperature: undefined, maxTokens: 32 }]);
    } finally { await api.stop(); }
});

test('streams OpenAI-compatible SSE chunks and completion marker', async () => {
    const api = createNativeGgufApiServer({
        host: {
            list: () => [],
            chat: async () => '',
            stream: async ({ onToken }) => { onToken('local '); onToken('stream'); },
        },
    });
    const started = await api.start(0);
    try {
        const response = await fetch(`http://127.0.0.1:${started.port}/v1/chat/completions`, {
            method: 'POST', headers: { 'content-type': 'application/json', ...bearer(started.token) },
            body: JSON.stringify({ model: 'native-gguf:tiny', messages: [], stream: true }),
        });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/event-stream/);
        const body = await response.text();
        assert.match(body, /"content":"local "/);
        assert.match(body, /"content":"stream"/);
        assert.match(body, /"finish_reason":"stop"/);
        assert.match(body, /data: \[DONE\]/);
    } finally { await api.stop(); }
});

test('answers 401 without a token and never reaches the model', async () => {
    const calls = [];
    const api = createNativeGgufApiServer({
        host: { list: () => { calls.push('list'); return []; }, chat: async () => { calls.push('chat'); return ''; } },
    });
    const started = await api.start(0);
    try {
        for (const request of [
            ['/v1/models', {}],
            ['/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"model":"native-gguf:tiny","messages":[]}' }],
            // An unknown path answers 401 too, so an unauthorized caller cannot
            // map the surface by watching which paths answer 404 instead.
            ['/v1/embeddings', {}],
        ]) {
            const response = await fetch(`http://127.0.0.1:${started.port}${request[0]}`, request[1]);
            assert.equal(response.status, 401, request[0]);
            assert.match(response.headers.get('www-authenticate'), /^Bearer/);
            assert.match((await response.json()).error.message, /local API token/);
        }
        assert.deepEqual(calls, []);
    } finally { await api.stop(); }
});

test('answers 401 to a wrong, malformed, or superseded token', async () => {
    const api = createNativeGgufApiServer({ host: { list: () => [], chat: async () => '' } });
    const started = await api.start(0);
    const url = `http://127.0.0.1:${started.port}/v1/models`;
    try {
        const rejected = [
            bearer('not-the-token'),
            // Same length as the real token, so length alone cannot be what fails.
            bearer('A'.repeat(started.token.length)),
            { authorization: started.token },
            { authorization: `Basic ${started.token}` },
            { authorization: 'Bearer' },
        ];
        for (const headers of rejected) {
            const response = await fetch(url, { headers });
            assert.equal(response.status, 401, JSON.stringify(headers));
        }
        assert.equal((await fetch(url, { headers: bearer(started.token) })).status, 200);
    } finally { await api.stop(); }

    // A restart issues a fresh token; the one handed out before is spent, so a
    // token that leaked cannot outlive the listener it was minted for.
    const restarted = await api.start(0);
    try {
        assert.notEqual(restarted.token, started.token);
        const stale = await fetch(`http://127.0.0.1:${restarted.port}/v1/models`, { headers: bearer(started.token) });
        assert.equal(stale.status, 401);
    } finally { await api.stop(); }
});

test('status reports the listener without handing back the token', async () => {
    const api = createNativeGgufApiServer({ host: { list: () => [], chat: async () => '' } });
    assert.deepEqual(api.status(), { running: false, host: '127.0.0.1', port: null });
    const started = await api.start(0);
    try {
        assert.deepEqual(api.status(), { running: true, host: '127.0.0.1', port: started.port });
        await assert.rejects(api.start(0), /already running/);
    } finally { await api.stop(); }
    assert.deepEqual(api.status(), { running: false, host: '127.0.0.1', port: null });
});
