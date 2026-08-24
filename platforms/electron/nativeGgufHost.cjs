const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createNativeGgufHost({ stateRoot, loadNative = () => import('node-llama-cpp') }) {
    const statePath = path.join(stateRoot, 'native-gguf-models.json');
    const models = new Map();
    let loaded = null;

    function restore() {
        try {
            const entries = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            for (const entry of Array.isArray(entries) ? entries : []) {
                if (entry?.id && entry?.modelPath && fs.existsSync(entry.modelPath)) models.set(entry.id, entry);
            }
        } catch { /* first run or invalid stale state */ }
    }

    function persist() {
        fs.mkdirSync(stateRoot, { recursive: true });
        fs.writeFileSync(statePath, JSON.stringify([...models.values()], null, 2), 'utf8');
    }

    async function register(input = {}) {
        const id = String(input.id || '').trim();
        const modelPath = path.resolve(String(input.modelPath || ''));
        if (!id) throw new Error('Native GGUF registration requires an id.');
        if (path.extname(modelPath).toLowerCase() !== '.gguf') throw new Error('Native model must be a .gguf file.');
        if (!fs.existsSync(modelPath)) throw new Error('Native GGUF file does not exist.');
        const actualSha256 = await hashFile(modelPath);
        const expectedSha256 = normalizeSha256(input.sha256);
        if (expectedSha256 && actualSha256 !== expectedSha256) throw new Error('Native GGUF checksum mismatch.');
        const entry = {
            id,
            modelPath,
            displayName: String(input.displayName || id),
            contextWindow: Number(input.contextWindow) || undefined,
            sha256: actualSha256,
            verified: Boolean(expectedSha256),
        };
        models.set(id, entry);
        persist();
        return entry;
    }

    async function unload() {
        const current = loaded;
        loaded = null;
        if (!current) return;
        current.session?.dispose?.();
        await current.context?.dispose?.();
        await current.model?.dispose?.();
    }

    async function ensureLoaded(id) {
        if (loaded?.id === id && loaded?.kind === 'chat') return loaded;
        await unload();
        const registration = models.get(id);
        if (!registration) throw new Error(`Native GGUF model is not registered: ${id}`);
        const native = await loadNative();
        const llama = await native.getLlama();
        const model = await llama.loadModel({ modelPath: registration.modelPath });
        const context = await model.createContext({ contextSize: registration.contextWindow });
        const session = new native.LlamaChatSession({ contextSequence: context.getSequence() });
        loaded = { id, kind: 'chat', model, context, session };
        return loaded;
    }

    async function ensureEmbeddingLoaded(id) {
        if (loaded?.id === id && loaded?.kind === 'embedding') return loaded;
        await unload();
        const registration = models.get(id);
        if (!registration) throw new Error(`Native GGUF model is not registered: ${id}`);
        const native = await loadNative();
        const llama = await native.getLlama();
        const model = await llama.loadModel({ modelPath: registration.modelPath });
        let context;
        try {
            context = await model.createEmbeddingContext({ contextSize: registration.contextWindow });
        } catch (error) {
            await model.dispose?.();
            throw new Error(`Model ${id} does not support embeddings: ${error?.message || String(error)}`);
        }
        loaded = { id, kind: 'embedding', model, context };
        return loaded;
    }

    restore();
    return {
        list: () => [...models.values()],
        register,
        remove: async (id) => { if (loaded?.id === id) await unload(); models.delete(id); persist(); return true; },
        health: async () => { try { await loadNative(); return { reachable: true, modelIds: [...models.keys()] }; } catch (error) { return { reachable: false, modelIds: [...models.keys()], error: error?.message || String(error) }; } },
        chat: async ({ model: id, prompt, temperature, maxTokens }) => {
            const current = await ensureLoaded(id);
            return current.session.prompt(String(prompt || ''), { temperature, maxTokens });
        },
        stream: async ({ model: id, prompt, temperature, maxTokens, signal, onToken }) => {
            const current = await ensureLoaded(id);
            return current.session.prompt(String(prompt || ''), {
                temperature,
                maxTokens,
                signal,
                stopOnAbortSignal: true,
                onTextChunk: chunk => onToken?.(chunk),
            });
        },
        embed: async ({ model: id, texts }) => {
            const current = await ensureEmbeddingLoaded(id);
            const vectors = [];
            for (const text of Array.isArray(texts) ? texts : []) {
                const embedding = await current.context.getEmbeddingFor(String(text || ''));
                vectors.push([...embedding.vector]);
            }
            return vectors;
        },
        unload,
    };
}

function normalizeSha256(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/^sha256:/, '');
    return /^[a-f0-9]{64}$/.test(normalized) ? normalized : undefined;
}

function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', reject);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

module.exports = { createNativeGgufHost };
