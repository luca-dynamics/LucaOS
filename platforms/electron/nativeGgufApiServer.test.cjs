const assert = require('node:assert/strict');
const test = require('node:test');
const { createNativeGgufApiServer } = require('./nativeGgufApiServer.cjs');

test('exposes registered models and non-streaming chat on localhost', async () => {
    const calls = [];
    const host = {
        list: () => [{ id: 'tiny', displayName: 'Tiny' }],
        chat: async request => { calls.push(request); return 'local answer'; },
    };
    const api = createNativeGgufApiServer({ host });
    const started = await api.start(0);
    try {
        assert.equal(started.host, '127.0.0.1');
        const modelsResponse = await fetch(`http://127.0.0.1:${started.port}/v1/models`);
        assert.deepEqual(await modelsResponse.json(), {
            object: 'list',
            data: [{ id: 'native-gguf:tiny', object: 'model', owned_by: 'luca-local' }],
        });
        const chatResponse = await fetch(`http://127.0.0.1:${started.port}/v1/chat/completions`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
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
            method: 'POST', headers: { 'content-type': 'application/json' },
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
