const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
    createLocalDocsHost,
    chunkText,
    chunkUnits,
    formatCitation,
    EXTRACTOR_VERSION,
} = require('./localDocsHost.cjs');

// jszip is mammoth's own dependency, so it is present wherever DOCX support is.
// Used here only to build a fixture; the host itself never touches it.
const JSZip = require('jszip');

function tempRoot(label) {
    return fs.mkdtempSync(path.join(os.tmpdir(), `luca-localdocs-${label}-`));
}

/**
 * Wraps text into lines that fit the page. pdfjs drops glyphs painted outside
 * the MediaBox, so a page whose text is one very long line extracts back
 * truncated — the fixture has to lay text out the way a real document does.
 */
function wrapLines(text, columns = 60) {
    const lines = [];
    let line = '';
    for (const word of text.trim().split(/\s+/)) {
        if (line && line.length + 1 + word.length > columns) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

/**
 * Builds a structurally valid multi-page PDF with a correct xref table, so the
 * test exercises the real parser rather than pdfjs' damaged-file recovery.
 */
function buildPdf(pageTexts) {
    const objects = [];
    const pageNumbers = pageTexts.map((_, index) => 3 + index * 2);
    const fontNumber = 3 + pageTexts.length * 2;

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageNumbers.map(n => `${n} 0 R`).join(' ')}] /Count ${pageTexts.length} >>`;
    pageTexts.forEach((text, index) => {
        const pageNumber = pageNumbers[index];
        const contentNumber = pageNumber + 1;
        objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] `
            + `/Contents ${contentNumber} 0 R /Resources << /Font << /F1 ${fontNumber} 0 R >> >> >>`;
        const shown = wrapLines(text)
            .map(line => `(${line.replace(/([\\()])/g, '\\$1')}) Tj T*`)
            .join('\n');
        const stream = `BT /F1 10 Tf 14 TL 40 752 Td\n${shown}\nET`;
        objects[contentNumber] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    objects[fontNumber] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    for (let n = 1; n <= fontNumber; n += 1) {
        offsets[n] = pdf.length;
        pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${fontNumber + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= fontNumber; n += 1) {
        pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${fontNumber + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
}

function buildDocx(paragraphs) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${paragraphs.map(paragraph => `    <w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>`).join('\n')}
  </w:body>
</w:document>`);
    return zip.generateAsync({ type: 'nodebuffer' });
}

test('registers, incrementally rescans, persists, and removes text folders', async () => {
    const root = tempRoot('text');
    const source = path.join(root, 'source');
    const stateRoot = path.join(root, 'state');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'notes.md'), '# Notes\nLocal knowledge');
    fs.writeFileSync(path.join(source, 'ignored.bin'), Buffer.from([0, 1, 2]));
    const host = createLocalDocsHost({ stateRoot, now: () => 100 });

    const registered = await host.register({ folderPath: source, displayName: 'Notes' });
    assert.equal(registered.documentCount, 1);
    assert.equal(registered.chunkCount, 1);
    assert.equal(host.getChunks()[0].relativePath, 'notes.md');

    fs.writeFileSync(path.join(source, 'second.txt'), 'Another document');
    const rescanned = await host.rescan(registered.id);
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

test('persists embeddings and retrieves ranked source chunks with citations', async () => {
    const root = tempRoot('vector');
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'cats.md'), 'cats purr softly');
    fs.writeFileSync(path.join(source, 'rockets.md'), 'rockets launch upward');
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state') });
    const folder = await host.register({ folderPath: source });
    const vectors = text => (text.includes('cat') ? [1, 0] : [0, 1]);
    await host.embedFolder(folder.id, 'embed-model', async texts => texts.map(vectors));
    const results = await host.search(
        { query: 'tell me about cats', modelId: 'embed-model', limit: 2 },
        async texts => texts.map(vectors),
    );
    assert.equal(results[0].relativePath, 'cats.md');
    assert.equal(results[0].score, 1);
    // A retrieved chunk has to be able to say where it came from, or the answer
    // built on it cannot be checked against the source.
    assert.equal(results[0].citation, 'cats.md, line 1');
    assert.equal(host.list()[0].embeddingModelId, 'embed-model');
    fs.rmSync(root, { recursive: true, force: true });
});

test('indexes PDF pages and cites the page each chunk came from', async () => {
    const root = tempRoot('pdf');
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    // Each page is deliberately longer than one chunk, so a page produces
    // several chunks and every one of them must still cite that single page.
    fs.writeFileSync(path.join(source, 'manual.pdf'), buildPdf([
        'Cats purr softly. '.repeat(90),
        'Rockets launch upward. '.repeat(80),
        'Harbours hold ships. '.repeat(80),
    ]));
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state') });

    const folder = await host.register({ folderPath: source });
    assert.equal(folder.failureCount, 0, JSON.stringify(folder.failures));
    assert.equal(folder.documentCount, 1);

    const chunks = host.getChunks();
    assert.ok(chunks.length >= 3, `expected several chunks, got ${chunks.length}`);
    assert.ok(chunks.every(chunk => chunk.locator.kind === 'page'));

    // Each subject only appears on its own page, so a chunk citing the wrong
    // page would be a citation pointing at text that is not there.
    const pageOf = { Cats: 1, Rockets: 2, Harbours: 3 };
    for (const [word, page] of Object.entries(pageOf)) {
        const matching = chunks.filter(chunk => chunk.text.includes(word));
        assert.ok(matching.length >= 1, `no chunk contains ${word}`);
        for (const chunk of matching) {
            assert.deepEqual(chunk.locator, { kind: 'page', start: page, end: page });
            assert.equal(chunk.citation, `manual.pdf, p. ${page}`);
        }
    }

    // A page bigger than one chunk is split, not truncated.
    assert.ok(chunks.filter(chunk => chunk.text.includes('Cats')).length >= 2);
    fs.rmSync(root, { recursive: true, force: true });
});

test('indexes DOCX paragraphs and cites the paragraph range', async () => {
    const root = tempRoot('docx');
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'report.docx'), await buildDocx([
        'First paragraph about cats.',
        'Second paragraph about rockets.',
        'Third paragraph about harbours.',
    ]));
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state') });

    const folder = await host.register({ folderPath: source });
    assert.equal(folder.failureCount, 0, JSON.stringify(folder.failures));
    assert.equal(folder.documentCount, 1);

    const chunks = host.getChunks();
    // Three short paragraphs fit in one chunk, which therefore covers all three.
    assert.equal(chunks.length, 1);
    assert.ok(chunks[0].text.includes('rockets'));
    assert.deepEqual(chunks[0].locator, { kind: 'paragraph', start: 1, end: 3 });
    assert.equal(chunks[0].citation, 'report.docx, ¶ 1–3');
    fs.rmSync(root, { recursive: true, force: true });
});

test('cites ascending line ranges across a long text file', async () => {
    const root = tempRoot('lines');
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    const lines = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}: ${'detail '.repeat(5)}`);
    fs.writeFileSync(path.join(source, 'long.md'), lines.join('\n'));
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state') });

    await host.register({ folderPath: source });
    const chunks = host.getChunks();
    assert.ok(chunks.length >= 2, `expected several chunks, got ${chunks.length}`);
    assert.equal(chunks[0].locator.kind, 'line');
    assert.equal(chunks[0].locator.start, 1);
    for (let index = 1; index < chunks.length; index += 1) {
        assert.ok(
            chunks[index].locator.start >= chunks[index - 1].locator.start,
            'line ranges must advance through the file',
        );
        assert.ok(chunks[index].locator.end >= chunks[index].locator.start);
    }
    assert.equal(chunks.at(-1).locator.end, lines.length);
    fs.rmSync(root, { recursive: true, force: true });
});

test('re-extracts documents left behind by an older extractor version', async () => {
    const root = tempRoot('upgrade');
    const source = path.join(root, 'source');
    const stateRoot = path.join(root, 'state');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'notes.md'), 'first line\nsecond line');
    await createLocalDocsHost({ stateRoot }).register({ folderPath: source });

    // Rewrite the manifest as a previous version left it: correct hash, no
    // locators. An unchanged hash must not be enough to keep serving these.
    const manifestPath = path.join(stateRoot, 'local-docs-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const document = manifest.folders[0].documents[0];
    document.extractorVersion = EXTRACTOR_VERSION - 1;
    document.chunks = document.chunks.map(chunk => ({ index: chunk.index, text: chunk.text }));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const stale = createLocalDocsHost({ stateRoot });
    assert.equal(stale.getChunks()[0].locator, null);
    assert.equal(stale.getChunks()[0].citation, 'notes.md');

    await stale.rescan(manifest.folders[0].id);
    assert.deepEqual(stale.getChunks()[0].locator, { kind: 'line', start: 1, end: 2 });
    assert.equal(stale.getChunks()[0].citation, 'notes.md, lines 1–2');
    fs.rmSync(root, { recursive: true, force: true });
});

test('reports an honest failure when a document parser cannot load', async () => {
    const root = tempRoot('noparser');
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'manual.pdf'), buildPdf(['Page one']));
    fs.writeFileSync(path.join(source, 'notes.md'), 'still indexable');
    const host = createLocalDocsHost({
        stateRoot: path.join(root, 'state'),
        loadPdfParser: () => { throw new Error('Cannot find module "pdf-parse"'); },
    });

    const folder = await host.register({ folderPath: source });
    assert.equal(folder.failureCount, 1);
    assert.equal(folder.failures[0].relativePath, 'manual.pdf');
    assert.match(folder.failures[0].reason, /PDF extraction is unavailable: pdf-parse failed to load/);
    // One unreadable document must not cost the folder its readable ones.
    assert.equal(folder.documentCount, 1);
    assert.equal(host.getChunks()[0].relativePath, 'notes.md');
    fs.rmSync(root, { recursive: true, force: true });
});

test('reports oversized files instead of dropping them silently', async () => {
    const root = tempRoot('toobig');
    const source = path.join(root, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'huge.md'), 'x'.repeat(200));
    fs.writeFileSync(path.join(source, 'small.md'), 'indexed fine');
    const host = createLocalDocsHost({ stateRoot: path.join(root, 'state'), maxTextBytes: 100 });

    const folder = await host.register({ folderPath: source });
    assert.equal(folder.documentCount, 1);
    assert.equal(folder.failureCount, 1);
    assert.equal(folder.failures[0].relativePath, 'huge.md');
    assert.match(folder.failures[0].reason, /Too large to index: 200 B exceeds the 100 B limit/);
    fs.rmSync(root, { recursive: true, force: true });
});

test('chunkUnits keeps a unit whole and formats citations for each kind', () => {
    const packed = chunkUnits(
        [{ number: 1, text: 'alpha' }, { number: 2, text: 'beta' }, { number: 3, text: 'gamma' }],
        'paragraph',
        1200,
        200,
    );
    assert.equal(packed.length, 1);
    assert.deepEqual(packed[0].locator, { kind: 'paragraph', start: 1, end: 3 });

    // A unit larger than a chunk is split, and every piece keeps its number.
    const split = chunkUnits([{ number: 7, text: 'word '.repeat(200) }], 'page', 300, 50);
    assert.ok(split.length > 2);
    assert.ok(split.every(chunk => chunk.locator.start === 7 && chunk.locator.end === 7));

    assert.equal(formatCitation('a.pdf', { kind: 'page', start: 4, end: 4 }), 'a.pdf, p. 4');
    assert.equal(formatCitation('a.pdf', { kind: 'page', start: 4, end: 6 }), 'a.pdf, pp. 4–6');
    assert.equal(formatCitation('b.md', { kind: 'line', start: 9, end: 9 }), 'b.md, line 9');
    assert.equal(formatCitation('c.docx', { kind: 'paragraph', start: 2, end: 5 }), 'c.docx, ¶ 2–5');
    assert.equal(formatCitation('d.txt', null), 'd.txt');
});
