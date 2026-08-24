const http = require('http');

function createNativeGgufApiServer({ host, bindAddress = '127.0.0.1' }) {
    let server = null;
    let port = null;

    async function handle(req, res) {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET' && req.url === '/v1/models') {
            return send(res, 200, { object: 'list', data: host.list().map(model => ({ id: `native-gguf:${model.id}`, object: 'model', owned_by: 'luca-local' })) });
        }
        if (req.method === 'POST' && req.url === '/v1/chat/completions') {
            try {
                const body = await readJson(req);
                const id = String(body.model || '').replace(/^native-gguf:/, '');
                const prompt = (Array.isArray(body.messages) ? body.messages : [])
                    .map(message => `${String(message.role || 'user').toUpperCase()}: ${String(message.content || '')}`)
                    .join('\n\n');
                if (body.stream) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');
                    const controller = new AbortController();
                    req.on('close', () => controller.abort());
                    const writeChunk = content => writeSse(res, {
                        id: `chatcmpl-luca-${Date.now()}`,
                        object: 'chat.completion.chunk',
                        model: `native-gguf:${id}`,
                        choices: [{ index: 0, delta: { content }, finish_reason: null }],
                    });
                    await host.stream({
                        model: id,
                        prompt,
                        temperature: body.temperature,
                        maxTokens: body.max_tokens,
                        signal: controller.signal,
                        onToken: writeChunk,
                    });
                    writeSse(res, {
                        id: `chatcmpl-luca-${Date.now()}`,
                        object: 'chat.completion.chunk',
                        model: `native-gguf:${id}`,
                        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                    });
                    res.end('data: [DONE]\n\n');
                    return;
                }
                const text = await host.chat({ model: id, prompt, temperature: body.temperature, maxTokens: body.max_tokens });
                return send(res, 200, {
                    id: `chatcmpl-luca-${Date.now()}`,
                    object: 'chat.completion',
                    model: `native-gguf:${id}`,
                    choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
                });
            } catch (error) {
                return send(res, 400, { error: { message: error?.message || String(error) } });
            }
        }
        return send(res, 404, { error: { message: 'Not found' } });
    }

    return {
        start: (requestedPort = 4891) => new Promise((resolve, reject) => {
            if (server) return resolve({ running: true, host: bindAddress, port });
            server = http.createServer((req, res) => void handle(req, res));
            server.once('error', error => { server = null; reject(error); });
            server.listen(requestedPort, bindAddress, () => {
                port = server.address().port;
                resolve({ running: true, host: bindAddress, port });
            });
        }),
        stop: () => new Promise(resolve => {
            if (!server) return resolve({ running: false, host: bindAddress, port: null });
            const current = server;
            server = null;
            current.close(() => { port = null; resolve({ running: false, host: bindAddress, port: null }); });
        }),
        status: () => ({ running: Boolean(server), host: bindAddress, port }),
    };
}

function send(res, status, body) {
    res.statusCode = status;
    res.end(JSON.stringify(body));
}

function writeSse(res, body) {
    if (!res.destroyed) res.write(`data: ${JSON.stringify(body)}\n\n`);
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1_000_000) reject(new Error('Request body is too large.'));
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Request body must be valid JSON.')); }
        });
        req.on('error', reject);
    });
}

module.exports = { createNativeGgufApiServer };
