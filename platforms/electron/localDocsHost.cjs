const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set([
    '.txt', '.md', '.mdx', '.json', '.csv', '.tsv', '.js', '.jsx', '.ts', '.tsx',
    '.py', '.go', '.rs', '.java', '.c', '.cc', '.cpp', '.h', '.hpp', '.css', '.html',
]);
const OPTIONAL_DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function createLocalDocsHost({ stateRoot, now = () => Date.now(), loadWatcher = () => import('chokidar') }) {
    const manifestPath = path.join(stateRoot, 'local-docs-manifest.json');
    let state = loadState(manifestPath);
    state.folders.forEach(folder => { folder.watching = false; });
    const watchers = new Map();
    const watchTimers = new Map();

    function persist() {
        fs.mkdirSync(stateRoot, { recursive: true });
        const temporaryPath = `${manifestPath}.tmp`;
        fs.writeFileSync(temporaryPath, JSON.stringify(state, null, 2));
        fs.renameSync(temporaryPath, manifestPath);
    }

    function list() {
        return state.folders.map(folder => summarizeFolder(folder));
    }

    function register(input) {
        const folderPath = requireDirectory(input?.folderPath);
        const existing = state.folders.find(folder => samePath(folder.folderPath, folderPath));
        if (existing) return rescan(existing.id);
        const folder = {
            id: crypto.createHash('sha256').update(folderPath.toLowerCase()).digest('hex').slice(0, 16),
            folderPath,
            displayName: String(input?.displayName || path.basename(folderPath)),
            createdAt: now(),
            indexedAt: null,
            documents: [],
        };
        state.folders.push(folder);
        return rescan(folder.id);
    }

    function rescan(id) {
        const folder = requireFolder(id);
        const previousByPath = new Map(folder.documents.map(document => [document.relativePath, document]));
        const documents = [];
        const failures = [];
        for (const file of walkTextFiles(folder.folderPath)) {
            if (OPTIONAL_DOCUMENT_EXTENSIONS.has(path.extname(file.path).toLowerCase())) {
                failures.push({
                    relativePath: path.relative(folder.folderPath, file.path),
                    reason: `${path.extname(file.path).slice(1).toUpperCase()} extraction parser is not installed.`,
                });
                continue;
            }
            try {
            const relativePath = path.relative(folder.folderPath, file.path);
            const previous = previousByPath.get(relativePath);
            const hash = hashFile(file.path);
            if (previous?.sha256 === hash) {
                documents.push(previous);
                continue;
            }
            const content = fs.readFileSync(file.path, 'utf8').replace(/\0/g, '');
            documents.push({
                relativePath,
                sha256: hash,
                size: file.size,
                modifiedAt: file.modifiedAt,
                chunks: chunkText(content).map((text, index) => ({ index, text })),
            });
            } catch (error) {
                failures.push({
                    relativePath: path.relative(folder.folderPath, file.path),
                    reason: error?.message || String(error),
                });
            }
        }
        folder.documents = documents;
        folder.failures = failures;
        folder.indexedAt = now();
        persist();
        return summarizeFolder(folder);
    }

    function remove(id) {
        const initialLength = state.folders.length;
        stopWatching(id);
        state.folders = state.folders.filter(folder => folder.id !== id);
        if (state.folders.length === initialLength) return false;
        persist();
        return true;
    }

    async function startWatching(id) {
        const folder = requireFolder(id);
        if (watchers.has(id)) return summarizeFolder(folder);
        const module = await loadWatcher();
        const watch = module.watch || module.default?.watch;
        if (!watch) throw new Error('LocalDocs file watcher is unavailable.');
        const watcher = watch(folder.folderPath, {
            ignoreInitial: true,
            ignored: /(^|[\\/])\../,
            followSymlinks: false,
            awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
        });
        const schedule = () => {
            clearTimeout(watchTimers.get(id));
            watchTimers.set(id, setTimeout(() => {
                watchTimers.delete(id);
                try { rescan(id); } catch { /* exposed on next manual rescan */ }
            }, 750));
        };
        watcher.on('add', schedule).on('change', schedule).on('unlink', schedule)
            .on('addDir', schedule).on('unlinkDir', schedule);
        watchers.set(id, watcher);
        folder.watching = true;
        persist();
        return summarizeFolder(folder);
    }

    function stopWatching(id) {
        clearTimeout(watchTimers.get(id));
        watchTimers.delete(id);
        const watcher = watchers.get(id);
        watchers.delete(id);
        void watcher?.close?.();
        const folder = state.folders.find(candidate => candidate.id === id);
        if (folder) folder.watching = false;
        return Boolean(watcher);
    }

    function getChunks(folderId) {
        const folders = folderId ? [requireFolder(folderId)] : state.folders;
        return folders.flatMap(folder => folder.documents.flatMap(document =>
            document.chunks.map(chunk => ({
                folderId: folder.id,
                folderName: folder.displayName,
                relativePath: document.relativePath,
                chunkIndex: chunk.index,
                text: chunk.text,
            })),
        ));
    }

    async function embedFolder(id, modelId, embed) {
        if (!modelId) throw new Error('Select a registered GGUF embedding model.');
        const folder = requireFolder(id);
        const pending = folder.documents.flatMap(document => document.chunks
            .filter(chunk => chunk.embeddingModelId !== modelId || !Array.isArray(chunk.embedding))
            .map(chunk => ({ document, chunk })));
        for (let offset = 0; offset < pending.length; offset += 16) {
            const batch = pending.slice(offset, offset + 16);
            const vectors = await embed(batch.map(item => item.chunk.text));
            if (!Array.isArray(vectors) || vectors.length !== batch.length) {
                throw new Error('Embedding runtime returned an invalid vector batch.');
            }
            batch.forEach((item, index) => {
                item.chunk.embedding = vectors[index];
                item.chunk.embeddingModelId = modelId;
            });
            persist();
        }
        folder.embeddingModelId = modelId;
        folder.embeddedAt = now();
        persist();
        return summarizeFolder(folder);
    }

    async function search({ query, modelId, limit = 5, minScore = 0.2 }, embed) {
        if (!String(query || '').trim()) return [];
        const candidates = getChunks().filter(chunk => {
            const folder = state.folders.find(item => item.id === chunk.folderId);
            const document = folder?.documents.find(item => item.relativePath === chunk.relativePath);
            return document?.chunks[chunk.chunkIndex]?.embeddingModelId === modelId;
        });
        if (!candidates.length) return [];
        const [queryVector] = await embed([String(query)]);
        return candidates.map(candidate => {
            const folder = requireFolder(candidate.folderId);
            const document = folder.documents.find(item => item.relativePath === candidate.relativePath);
            const vector = document.chunks[candidate.chunkIndex].embedding;
            return { ...candidate, score: cosineSimilarity(queryVector, vector) };
        }).filter(candidate => candidate.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.max(1, Math.min(Number(limit) || 5, 12)));
    }

    function requireFolder(id) {
        const folder = state.folders.find(candidate => candidate.id === id);
        if (!folder) throw new Error(`Unknown LocalDocs folder: ${id}`);
        return folder;
    }

    return { list, register, rescan, remove, getChunks, embedFolder, search, startWatching, stopWatching };
}

function loadState(manifestPath) {
    try {
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return { version: 1, folders: Array.isArray(parsed.folders) ? parsed.folders : [] };
    } catch { return { version: 1, folders: [] }; }
}

function requireDirectory(inputPath) {
    if (!inputPath) throw new Error('A LocalDocs folder path is required.');
    const resolved = fs.realpathSync(String(inputPath));
    if (!fs.statSync(resolved).isDirectory()) throw new Error('LocalDocs source must be a directory.');
    return resolved;
}

function samePath(left, right) {
    return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function walkTextFiles(root) {
    const output = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
            const absolutePath = path.join(current, entry.name);
            if (entry.isDirectory()) visit(absolutePath);
            else if (entry.isFile() && (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || OPTIONAL_DOCUMENT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))) {
                const stat = fs.statSync(absolutePath);
                if (stat.size <= MAX_FILE_BYTES) output.push({ path: absolutePath, size: stat.size, modifiedAt: stat.mtimeMs });
            }
        }
    };
    visit(root);
    return output.sort((a, b) => a.path.localeCompare(b.path));
}

function hashFile(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function chunkText(input, chunkSize = 1200, overlap = 200) {
    const text = String(input || '').replace(/\r\n/g, '\n').trim();
    if (!text) return [];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);
        if (end < text.length) {
            const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf(' ', end));
            if (boundary > start + Math.floor(chunkSize * 0.6)) end = boundary;
        }
        chunks.push(text.slice(start, end).trim());
        if (end >= text.length) break;
        start = Math.max(start + 1, end - overlap);
    }
    return chunks.filter(Boolean);
}

function summarizeFolder(folder) {
    return {
        id: folder.id,
        folderPath: folder.folderPath,
        displayName: folder.displayName,
        createdAt: folder.createdAt,
        indexedAt: folder.indexedAt,
        documentCount: folder.documents.length,
        chunkCount: folder.documents.reduce((total, document) => total + document.chunks.length, 0),
        totalBytes: folder.documents.reduce((total, document) => total + document.size, 0),
        embeddingModelId: folder.embeddingModelId || null,
        embeddedAt: folder.embeddedAt || null,
        embeddedChunkCount: folder.documents.reduce(
            (total, document) => total + document.chunks.filter(chunk => Array.isArray(chunk.embedding)).length,
            0,
        ),
        failures: Array.isArray(folder.failures) ? folder.failures : [],
        failureCount: Array.isArray(folder.failures) ? folder.failures.length : 0,
        watching: watchersState(folder),
    };
}

function watchersState(folder) {
    return Boolean(folder.watching);
}

function cosineSimilarity(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return 0;
    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;
    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        leftMagnitude += left[index] * left[index];
        rightMagnitude += right[index] * right[index];
    }
    const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
    return denominator ? dot / denominator : 0;
}

module.exports = { createLocalDocsHost, chunkText };
