const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set([
    '.txt', '.md', '.mdx', '.json', '.csv', '.tsv', '.js', '.jsx', '.ts', '.tsx',
    '.py', '.go', '.rs', '.java', '.c', '.cc', '.cpp', '.h', '.hpp', '.css', '.html',
]);
const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.docx']);

/**
 * Two limits, because the formats are not comparable: 5 MB of source text is an
 * unusual file, while 5 MB of PDF is an ordinary scanned report. One shared cap
 * sized for text would exclude most real documents.
 */
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 64 * 1024 * 1024;

/**
 * Bumped whenever extraction changes shape. A document whose stored
 * `extractorVersion` is older is re-extracted even when its hash still matches,
 * so an index built by a previous version gains locators instead of quietly
 * serving citation-less chunks until the file happens to change.
 */
const EXTRACTOR_VERSION = 2;

function createLocalDocsHost({
    stateRoot,
    now = () => Date.now(),
    loadWatcher = () => import('chokidar'),
    // Loaded on first use, not at startup: pdf-parse pulls in pdfjs, which is
    // far too heavy to pay for in a folder that holds no PDFs.
    loadPdfParser = () => require('pdf-parse'),
    loadDocxParser = () => require('mammoth'),
    maxTextBytes = MAX_TEXT_BYTES,
    maxDocumentBytes = MAX_DOCUMENT_BYTES,
}) {
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

    async function register(input) {
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

    async function rescan(id) {
        const folder = requireFolder(id);
        const previousByPath = new Map(folder.documents.map(document => [document.relativePath, document]));
        const documents = [];
        const failures = [];
        for (const file of walkIndexableFiles(folder.folderPath)) {
            const relativePath = path.relative(folder.folderPath, file.path);
            try {
                const limit = isDocumentPath(file.path) ? maxDocumentBytes : maxTextBytes;
                if (file.size > limit) {
                    // Reported rather than skipped in silence: a folder whose
                    // largest file is missing from answers should say so.
                    throw new Error(
                        `Too large to index: ${formatBytes(file.size)} exceeds the ${formatBytes(limit)} limit.`,
                    );
                }
                const previous = previousByPath.get(relativePath);
                const hash = hashFile(file.path);
                if (previous?.sha256 === hash && previous.extractorVersion === EXTRACTOR_VERSION) {
                    documents.push(previous);
                    continue;
                }
                const { units, kind } = await extractUnits(file.path, {
                    loadPdfParser,
                    loadDocxParser,
                });
                documents.push({
                    relativePath,
                    sha256: hash,
                    size: file.size,
                    modifiedAt: file.modifiedAt,
                    extractorVersion: EXTRACTOR_VERSION,
                    locatorKind: kind,
                    chunks: chunkUnits(units, kind).map((chunk, index) => ({
                        index,
                        text: chunk.text,
                        locator: chunk.locator,
                    })),
                });
            } catch (error) {
                failures.push({ relativePath, reason: error?.message || String(error) });
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
                // Rescan is asynchronous now that documents may need a parser;
                // a failure here is surfaced on the next manual rescan.
                void rescan(id).catch(() => { /* exposed on next manual rescan */ });
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
                locator: chunk.locator || null,
                citation: formatCitation(document.relativePath, chunk.locator),
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

function isDocumentPath(filePath) {
    return DOCUMENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isIndexableExtension(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(extension) || DOCUMENT_EXTENSIONS.has(extension);
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function walkIndexableFiles(root) {
    const output = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
            const absolutePath = path.join(current, entry.name);
            if (entry.isDirectory()) visit(absolutePath);
            else if (entry.isFile() && isIndexableExtension(entry.name)) {
                // Size is carried, not judged here — the indexer applies the
                // per-format limit so an oversized file becomes a reported
                // failure instead of a file that quietly never existed.
                const stat = fs.statSync(absolutePath);
                output.push({ path: absolutePath, size: stat.size, modifiedAt: stat.mtimeMs });
            }
        }
    };
    visit(root);
    return output.sort((a, b) => a.path.localeCompare(b.path));
}

function hashFile(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Reads a file into numbered units plus the kind of locator those numbers mean.
 *
 * Every format is reduced to the same shape — an ordered list of numbered
 * pieces of text — so one chunker serves all of them and every chunk can say
 * where in the document it came from. The unit is whatever that format can
 * honestly number: pages for a PDF, paragraphs for a DOCX, lines for text.
 */
async function extractUnits(filePath, { loadPdfParser, loadDocxParser }) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.pdf') return { kind: 'page', units: await extractPdfPages(filePath, loadPdfParser) };
    if (extension === '.docx') return { kind: 'paragraph', units: await extractDocxParagraphs(filePath, loadDocxParser) };
    const content = fs.readFileSync(filePath, 'utf8').replace(/\0/g, '').replace(/\r\n/g, '\n');
    return {
        kind: 'line',
        units: content.split('\n').map((text, index) => ({ number: index + 1, text })),
    };
}

async function extractPdfPages(filePath, loadPdfParser) {
    const { PDFParse } = await requireParser(loadPdfParser, 'PDF', 'pdf-parse');
    if (typeof PDFParse !== 'function') {
        throw new Error('PDF extraction is unavailable: pdf-parse did not expose PDFParse.');
    }
    const parser = new PDFParse({ data: fs.readFileSync(filePath) });
    try {
        const result = await parser.getText();
        return (result.pages || []).map(page => ({ number: page.num, text: String(page.text || '') }));
    } finally {
        // pdfjs holds a worker per document; leaking one leaks the whole runtime.
        await parser.destroy().catch(() => { /* the page text is already extracted */ });
    }
}

async function extractDocxParagraphs(filePath, loadDocxParser) {
    const mammoth = await requireParser(loadDocxParser, 'DOCX', 'mammoth');
    if (typeof mammoth?.extractRawText !== 'function') {
        throw new Error('DOCX extraction is unavailable: mammoth did not expose extractRawText.');
    }
    const result = await mammoth.extractRawText({ buffer: fs.readFileSync(filePath) });
    // mammoth separates paragraphs with a blank line. A DOCX has no pages until
    // it is laid out, so the paragraph is the smallest unit we can cite without
    // inventing a page number.
    return String(result?.value || '')
        .split(/\n{2,}/)
        .map(text => text.trim())
        .map((text, index) => ({ number: index + 1, text }))
        .filter(unit => unit.text);
}

async function requireParser(load, label, moduleName) {
    try {
        return await load();
    } catch (error) {
        throw new Error(
            `${label} extraction is unavailable: ${moduleName} failed to load (${error?.message || error}).`,
        );
    }
}

/**
 * Packs numbered units into chunks, carrying the unit numbers through so each
 * chunk knows which pages, paragraphs or lines it covers.
 *
 * A unit larger than one chunk (a full PDF page, usually) is split by
 * `chunkText`, and every piece keeps that unit's number. `chunkSize` is a firm
 * bound for those pieces and an approximate one for chunks packed from several
 * small units, because a unit is never cut across a chunk boundary.
 */
function chunkUnits(units, kind, chunkSize = 1200, overlap = 200) {
    const chunks = [];
    let buffer = [];
    let bufferLength = 0;

    const emit = (text, start, end) => {
        const trimmed = text.trim();
        if (trimmed) chunks.push({ text: trimmed, locator: { kind, start, end } });
    };

    const flush = carryOverlap => {
        if (!buffer.length) return;
        emit(buffer.map(unit => unit.text).join('\n'), buffer[0].number, buffer[buffer.length - 1].number);
        if (!carryOverlap) {
            buffer = [];
            bufferLength = 0;
            return;
        }
        // Repeat the tail of this chunk at the head of the next one so a
        // sentence that straddles the boundary is still retrievable whole.
        const carried = [];
        let carriedLength = 0;
        for (let index = buffer.length - 1; index >= 0; index -= 1) {
            if (carriedLength + buffer[index].text.length > overlap) break;
            carried.unshift(buffer[index]);
            carriedLength += buffer[index].text.length + 1;
        }
        buffer = carried;
        bufferLength = carriedLength;
    };

    for (const unit of units) {
        const text = String(unit.text || '');
        if (!text.trim()) continue;
        if (text.length >= chunkSize) {
            flush(false);
            for (const piece of chunkText(text, chunkSize, overlap)) {
                emit(piece, unit.number, unit.number);
            }
            continue;
        }
        if (buffer.length && bufferLength + text.length > chunkSize) flush(true);
        buffer.push({ number: unit.number, text });
        bufferLength += text.length + 1;
    }
    flush(false);
    return chunks;
}

/**
 * Renders a locator as the citation a person reads. Chunks indexed before
 * locators existed have none, in which case the file path is all we can
 * honestly claim.
 */
function formatCitation(relativePath, locator) {
    const label = describeLocator(locator);
    return label ? `${relativePath}, ${label}` : relativePath;
}

function describeLocator(locator) {
    if (!locator || typeof locator.start !== 'number') return '';
    const { kind, start } = locator;
    const end = typeof locator.end === 'number' ? locator.end : start;
    const span = start === end ? String(start) : `${start}–${end}`;
    if (kind === 'page') return start === end ? `p. ${span}` : `pp. ${span}`;
    if (kind === 'paragraph') return `¶ ${span}`;
    if (kind === 'line') return start === end ? `line ${span}` : `lines ${span}`;
    return span;
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

module.exports = {
    createLocalDocsHost,
    chunkText,
    chunkUnits,
    formatCitation,
    EXTRACTOR_VERSION,
};
