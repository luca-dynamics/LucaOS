const crypto = require('crypto');
const http = require('http');

function createNativeGgufApiServer({ host, bindAddress = '127.0.0.1' }) {
    let server = null;
    let port = null;
    let tokenDigest = null;

    /**
     * Whether a request carries this session's bearer token. Both sides are
     * reduced to a fixed 32 bytes first: timingSafeEqual throws outright on a
     * length mismatch, and comparing the strings directly would leak the token's
     * length and then, one byte at a time, the token itself.
     */
    function authorized(req) {
        if (!tokenDigest) return false;
        const header = String(req.headers.authorization || '').trim();
        const match = /^bearer +(\S+)$/i.exec(header);
        if (!match) return false;
        return crypto.timingSafeEqual(sha256(match[1]), tokenDigest);
    }

    async function handle(req, res) {
        res.setHeader('Content-Type', 'application/json');
        // Authorization comes before routing, so an unauthorized caller cannot
        // map which endpoints exist and no request body is read on its behalf.
        if (!authorized(req)) {
            res.setHeader('WWW-Authenticate', 'Bearer realm="luca-local"');
            return send(res, 401, {
                error: {
                    message: 'This endpoint requires the local API token Luca showed you when the API started.',
                    type: 'invalid_request_error',
                },
            });
        }
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
            if (server) {
                return reject(new Error('The local API is already running. Stop it before starting it again.'));
            }
            // One token per start, kept here only as a digest and handed to the
            // caller once. Restarting the API invalidates whatever the previous
            // start gave out, so a token that leaked cannot outlive the session.
            const token = crypto.randomBytes(32).toString('base64url');
            tokenDigest = sha256(token);
            server = http.createServer((req, res) => void handle(req, res));
            server.once('error', error => {
                server = null;
                tokenDigest = null;
                reject(error);
            });
            server.listen(requestedPort, bindAddress, () => {
                port = server.address().port;
                resolve({ running: true, host: bindAddress, port, token });
            });
        }),
        stop: () => new Promise(resolve => {
            tokenDigest = null;
            if (!server) return resolve({ running: false, host: bindAddress, port: null });
            const current = server;
            server = null;
            current.close(() => { port = null; resolve({ running: false, host: bindAddress, port: null }); });
        }),
        // Deliberately without the token: it is shown once, at start. Anything
        // that can poll status could otherwise read it back at will.
        status: () => ({ running: Boolean(server), host: bindAddress, port }),
    };
}

function sha256(value) {
    return crypto.createHash('sha256').update(String(value), 'utf8').digest();
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
