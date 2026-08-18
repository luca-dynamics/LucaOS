const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** How long an idle chat model stays resident before its weights are released. */
const DEFAULT_CHAT_KEEP_ALIVE_MS = 5 * 60 * 1000;

function createNativeGgufHost({
    stateRoot,
    loadNative = () => import('node-llama-cpp'),
    chatKeepAliveMs = DEFAULT_CHAT_KEEP_ALIVE_MS,
    now = () => Date.now(),
}) {
    const statePath = path.join(stateRoot, 'native-gguf-models.json');
    const models = new Map();
    // Chat and embedding models hold independent slots. One shared slot meant an
    // embed between two chat turns evicted a multi-gigabyte chat model and then
    // reloaded it — on the exact path this host exists to serve, grounded local
    // chat, where every answer is an embed followed by a completion.
    let chatSlot = null;
    let embeddingSlot = null;
    let chatIdleTimer = null;

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
        const stats = fs.statSync(modelPath);
        const actualSha256 = await hashFile(modelPath);
        const expectedSha256 = normalizeSha256(input.sha256);
        if (expectedSha256 && actualSha256 !== expectedSha256) throw new Error('Native GGUF checksum mismatch.');
        const entry = {
            id,
            modelPath,
            displayName: String(input.displayName || id),
            contextWindow: Number(input.contextWindow) || undefined,
            // Pinned here and enforced on every load. Size and mtime ride along
            // so the load gate can tell "nothing touched this file" from "these
            // bytes changed" without re-hashing gigabytes each time.
            sha256: actualSha256,
            sizeBytes: stats.size,
            mtimeMs: stats.mtimeMs,
            // Verified means the user supplied a checksum and these bytes matched
            // it. Otherwise Luca has only pinned what it found — trust on first
            // use — and the model stays unloadable until the user accepts it.
            verified: Boolean(expectedSha256),
            consentedAt: null,
        };
        models.set(id, entry);
        persist();
        return entry;
    }

    /**
     * Records that the user accepted this model's pinned bytes. The pin is
     * verified first, so consenting to a file that changed between registration
     * and the prompt fails rather than blessing whatever is on disk now.
     */
    async function consent(id) {
        const registration = models.get(String(id || '').trim());
        if (!registration) throw new Error(`Native GGUF model is not registered: ${id}`);
        await verifyPin(registration);
        registration.consentedAt = new Date(now()).toISOString();
        persist();
        return registration;
    }

    /**
     * The load gate. A model may be loaded only if it is registered, its bytes
     * still match the pin taken when the user accepted them, and — for a model
     * whose hash Luca computed rather than checked against one the user supplied
     * — the user has explicitly consented to it. Every uncertain case throws.
     */
    async function admit(id) {
        const registration = models.get(String(id || '').trim());
        if (!registration) throw new Error(`Native GGUF model is not registered: ${id}`);
        if (!registration.sha256) throw new Error(`Native GGUF model has no pinned checksum: ${registration.id}`);
        if (!registration.verified && !registration.consentedAt) {
            throw new Error(`Native GGUF model needs explicit consent before it can be loaded: ${registration.id}`);
        }
        await verifyPin(registration);
        return registration;
    }

    /**
     * Compares the file against the pin taken at registration. Size and mtime are
     * checked first: re-hashing a 40 GB GGUF on every load would make this gate
     * too slow to keep, and a file whose size and mtime both match has not been
     * rewritten in place. If either moved, the hash is paid and drift rejected.
     */
    async function verifyPin(registration) {
        let stats;
        try {
            stats = fs.statSync(registration.modelPath);
        } catch {
            throw new Error(`Native GGUF file is missing: ${registration.modelPath}`);
        }
        if (stats.size === registration.sizeBytes && stats.mtimeMs === registration.mtimeMs) return;
        const actualSha256 = await hashFile(registration.modelPath);
        if (actualSha256 !== registration.sha256) {
            throw new Error(`Native GGUF file changed since it was accepted: ${registration.id}`);
        }
        // Same bytes under a new stat — a copy, a restore, a touch. Re-pin so the
        // fast path works again instead of re-hashing on every subsequent load.
        registration.sizeBytes = stats.size;
        registration.mtimeMs = stats.mtimeMs;
        persist();
    }

    function clearChatIdleTimer() {
        if (!chatIdleTimer) return;
        clearTimeout(chatIdleTimer);
        chatIdleTimer = null;
    }

    /**
     * Releases the chat model after a stretch of inactivity, the way Ollama's
     * keep-alive does. Multi-gigabyte weights should not sit in RAM forever, but
     * they must not be evicted between two turns of one conversation either.
     */
    function armChatIdleTimer() {
        clearChatIdleTimer();
        if (!Number.isFinite(chatKeepAliveMs) || chatKeepAliveMs <= 0) return;
        chatIdleTimer = setTimeout(() => {
            chatIdleTimer = null;
            void releaseChatSlot();
        }, chatKeepAliveMs);
        // Never hold the host process open merely to keep an idle model warm.
        chatIdleTimer.unref?.();
    }

    async function disposeSlot(slot) {
        if (!slot) return;
        slot.session?.dispose?.();
        await slot.context?.dispose?.();
        await slot.model?.dispose?.();
    }

    async function releaseChatSlot() {
        const current = chatSlot;
        chatSlot = null;
        clearChatIdleTimer();
        await disposeSlot(current);
    }

    async function releaseEmbeddingSlot() {
        const current = embeddingSlot;
        embeddingSlot = null;
        await disposeSlot(current);
    }

    async function unload() {
        await releaseChatSlot();
        await releaseEmbeddingSlot();
    }

    async function ensureChatLoaded(id) {
        clearChatIdleTimer();
        if (chatSlot?.id === id) return chatSlot;
        // Admit before evicting: a rejected load must not also cost the user the
        // model they already had resident.
        const registration = await admit(id);
        await releaseChatSlot();
        const native = await loadNative();
        const llama = await native.getLlama();
        const model = await llama.loadModel({ modelPath: registration.modelPath });
        const context = await model.createContext({ contextSize: registration.contextWindow });
        const session = new native.LlamaChatSession({ contextSequence: context.getSequence() });
        chatSlot = { id, model, context, session };
        return chatSlot;
    }

    async function ensureEmbeddingLoaded(id) {
        if (embeddingSlot?.id === id) return embeddingSlot;
        const registration = await admit(id);
        await releaseEmbeddingSlot();
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
        // Embedding models run 100–700 MB against 4–40 GB for chat, so this slot
        // stays resident once loaded: cheap to hold, expensive to reload per query.
        embeddingSlot = { id, model, context };
        return embeddingSlot;
    }

    restore();
    return {
        list: () => [...models.values()],
        register,
        consent,
        remove: async (id) => {
            const key = String(id || '').trim();
            if (chatSlot?.id === key) await releaseChatSlot();
            if (embeddingSlot?.id === key) await releaseEmbeddingSlot();
            models.delete(key);
            persist();
            return true;
        },
        health: async () => { try { await loadNative(); return { reachable: true, modelIds: [...models.keys()] }; } catch (error) { return { reachable: false, modelIds: [...models.keys()], error: error?.message || String(error) }; } },
        chat: async ({ model: id, prompt, temperature, maxTokens }) => {
            const current = await ensureChatLoaded(id);
            try {
                return await current.session.prompt(String(prompt || ''), { temperature, maxTokens });
            } finally {
                armChatIdleTimer();
            }
        },
        stream: async ({ model: id, prompt, temperature, maxTokens, signal, onToken }) => {
            const current = await ensureChatLoaded(id);
            try {
                return await current.session.prompt(String(prompt || ''), {
                    temperature,
                    maxTokens,
                    signal,
                    stopOnAbortSignal: true,
                    onTextChunk: chunk => onToken?.(chunk),
                });
            } finally {
                armChatIdleTimer();
            }
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
        /** Which models are resident right now. For tests and diagnostics. */
        residentModels: () => ({ chat: chatSlot?.id ?? null, embedding: embeddingSlot?.id ?? null }),
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
