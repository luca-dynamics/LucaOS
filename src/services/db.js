// Browser-safe Database Service
// Detect environment
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;
const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;

let db;
// True only when a real, persistent database was expected and failed to open —
// i.e. we tried node:sqlite and the catch ran. The browser has no filesystem, so
// its mock store is intentional and must stay quiet; a Node/Electron process that
// silently drops to a non-persistent mock and discards every write is a
// correctness bug, not graceful degradation. This flag keeps the two apart.
let dbDegraded = false;
let dbInitError = null;

if (isNode || isElectron) {
    // Dynamic import to prevent build-time crashes in web environments.
    //
    // node:sqlite (built into Node 22.5+/Electron 40) replaces better-sqlite3:
    // it ships with the runtime, so there is no native binary to compile and no
    // NODE_MODULE_VERSION mismatch to fall back from. That mismatch was not
    // theoretical — the native module was built for Electron's ABI while the
    // core ran under system Node, so EVERY boot silently landed in the mock
    // store below and threw the writes away.
    //
    // FTS5, the FTS sync triggers, WAL, and the {changes,lastInsertRowid}
    // return shape are all verified equivalent, so callers need no changes.
    try {
        const { DatabaseSync } = await import('node:sqlite');
        const path = (await import('path')).default;
        const fs = (await import('fs')).default;
        
        // Standardized Storage Root
        const { DATA_DIR } = await import('../../cortex/server/config/constants.js');

        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const DB_PATH = path.join(DATA_DIR, 'luca.db');
        db = new DatabaseSync(DB_PATH);
        // node:sqlite has no .pragma() helper; PRAGMA goes through exec().
        db.exec('PRAGMA journal_mode = WAL');

        // Initialize Schema logic here
        const initSchema = (database) => {
            console.log('[DB] Initializing Node/Electron Schema...');
            database.exec(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, embedding_json TEXT, type TEXT DEFAULT 'episodic', created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), metadata_json TEXT)`);
            
            // Phase 7: FTS5 Integration
            database.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, content='memories', content_rowid='id')`);
            
            // Triggers to keep FTS index in sync
            database.exec(`
                CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
                    INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
                END;
            `);
            database.exec(`
                CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
                    INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
                END;
            `);
            database.exec(`
                CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
                    INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
                    INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
                END;
            `);

            database.exec(`CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, type TEXT, description TEXT, last_updated INTEGER DEFAULT (strftime('%s', 'now') * 1000))`);
            
            // Phase 7: FTS5 for Entities (Indexing Logs & Knowledge)
            database.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(name, description, content='entities', content_rowid='id')`);
            
            // Triggers for entities
            database.exec(`
                CREATE TRIGGER IF NOT EXISTS entities_ai AFTER INSERT ON entities BEGIN
                    INSERT INTO entities_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
                END;
            `);
            database.exec(`
                CREATE TRIGGER IF NOT EXISTS entities_ad AFTER DELETE ON entities BEGIN
                    INSERT INTO entities_fts(entities_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
                END;
            `);
            database.exec(`
                CREATE TRIGGER IF NOT EXISTS entities_au AFTER UPDATE ON entities BEGIN
                    INSERT INTO entities_fts(entities_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
                    INSERT INTO entities_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
                END;
            `);

            database.exec(`CREATE TABLE IF NOT EXISTS relationships (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id INTEGER NOT NULL, target_id INTEGER NOT NULL, relation TEXT NOT NULL, strength REAL DEFAULT 1.0, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), valid_until INTEGER, context_event_id TEXT, weight REAL DEFAULT 1.0, FOREIGN KEY(source_id) REFERENCES entities(id), FOREIGN KEY(target_id) REFERENCES entities(id), UNIQUE(source_id, target_id, relation))`);
            database.exec(`CREATE TABLE IF NOT EXISTS user_profile (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, face_reference_path TEXT, voice_settings_json TEXT, voice_reference_path TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`);
            database.exec(`CREATE TABLE IF NOT EXISTS credentials (site TEXT PRIMARY KEY, username TEXT NOT NULL, encrypted_password TEXT NOT NULL, iv TEXT NOT NULL, auth_tag TEXT NOT NULL, metadata_json TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`);
            database.exec(`CREATE TABLE IF NOT EXISTS pentest_sessions (id TEXT PRIMARY KEY, project_name TEXT, target_url TEXT, status TEXT DEFAULT 'running', current_phase TEXT, start_time INTEGER DEFAULT (strftime('%s', 'now') * 1000), end_time INTEGER, summary_json TEXT)`);
            database.exec(`CREATE TABLE IF NOT EXISTS pentest_findings (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, vulnerability_type TEXT, severity TEXT, confidence REAL, sink_path TEXT, proof_of_concept TEXT, evidence_json TEXT, status TEXT DEFAULT 'potential', created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), FOREIGN KEY(session_id) REFERENCES pentest_sessions(id))`);
        };
        initSchema(db);
        // Publish a cheap, import-free status signal so /api/health can report
        // database health without importing (and thereby initializing) this
        // module on the fast-listen boot path.
        globalThis.__LUCA_DB_STATUS = { ok: true, degraded: false, mock: false, error: null };
    } catch (e) {
        dbDegraded = true;
        dbInitError = e;
        console.error(
            '[DB] CRITICAL: the persistent database failed to open. Running on a ' +
            'NON-PERSISTENT in-memory fallback — memory and other writes WILL BE ' +
            'LOST until this is fixed. This is a data-integrity failure, not a ' +
            'graceful degradation.',
            e,
        );
    }
}

// Fallback implementation.
//
// Two very different situations reach this point:
//   1. The browser build, which has no filesystem — the mock is intentional and
//      quiet.
//   2. A Node/Electron process whose real database failed to open (dbDegraded) —
//      here the mock is a last resort that MUST NOT pretend writes succeeded.
if (!db) {
    if (!dbDegraded) {
        console.log('[DB] Using browser mock database (no filesystem available).');
    }

    // In the degraded case, surface each discarded write once so silent data loss
    // becomes visible in the logs instead of looking like success.
    let warnedWriteLoss = false;
    const noteDiscardedWrite = () => {
        if (dbDegraded && !warnedWriteLoss) {
            warnedWriteLoss = true;
            console.error(
                '[DB] A write was discarded because the database is not persistent ' +
                '(see the CRITICAL startup error above). Further discards are silenced.',
            );
        }
    };

    db = {
        // Detectable by callers and health checks (e.g. /api/health) so the
        // degraded state can be reported rather than hidden.
        __isMockStore: true,
        __degraded: dbDegraded,
        __initError: dbInitError ? String(dbInitError && dbInitError.message || dbInitError) : null,
        exec: () => { noteDiscardedWrite(); },
        prepare: () => ({
            run: () => { noteDiscardedWrite(); return { changes: 0, lastInsertRowid: 0 }; },
            get: () => null,
            all: () => []
        }),
        pragma: () => {}
    };

    // Import-free status signal for /api/health. `degraded: true` means a real
    // database was expected and is missing (writes are being lost); a quiet
    // browser mock reports degraded: false.
    globalThis.__LUCA_DB_STATUS = {
        ok: !dbDegraded,
        degraded: dbDegraded,
        mock: true,
        error: db.__initError,
    };
}

export default db;
