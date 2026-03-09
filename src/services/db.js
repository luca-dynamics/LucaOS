// Browser-safe Database Service
// Detect environment
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;
const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;

let db;

if (isNode || isElectron) {
    // Dynamic import to prevent build-time crashes in web environments
    try {
        const Database = (await import('better-sqlite3')).default;
        const path = (await import('path')).default;
        const fs = (await import('fs')).default;
        
        // Standardized Storage Root
        const { DATA_DIR } = await import('../../cortex/server/config/constants.js');

        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const DB_PATH = path.join(DATA_DIR, 'luca.db');
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');

        // Initialize Schema logic here
        const initSchema = (database) => {
            console.log('[DB] Initializing Node/Electron Schema...');
            database.exec(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, embedding_json TEXT, type TEXT DEFAULT 'episodic', created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), metadata_json TEXT)`);
            database.exec(`CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, type TEXT, description TEXT, last_updated INTEGER DEFAULT (strftime('%s', 'now') * 1000))`);
            database.exec(`CREATE TABLE IF NOT EXISTS relationships (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id INTEGER NOT NULL, target_id INTEGER NOT NULL, relation TEXT NOT NULL, strength REAL DEFAULT 1.0, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), valid_until INTEGER, context_event_id TEXT, weight REAL DEFAULT 1.0, FOREIGN KEY(source_id) REFERENCES entities(id), FOREIGN KEY(target_id) REFERENCES entities(id), UNIQUE(source_id, target_id, relation))`);
            database.exec(`CREATE TABLE IF NOT EXISTS user_profile (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, face_reference_path TEXT, voice_settings_json TEXT, voice_reference_path TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`);
            database.exec(`CREATE TABLE IF NOT EXISTS credentials (site TEXT PRIMARY KEY, username TEXT NOT NULL, encrypted_password TEXT NOT NULL, iv TEXT NOT NULL, auth_tag TEXT NOT NULL, metadata_json TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`);
            database.exec(`CREATE TABLE IF NOT EXISTS pentest_sessions (id TEXT PRIMARY KEY, project_name TEXT, target_url TEXT, status TEXT DEFAULT 'running', current_phase TEXT, start_time INTEGER DEFAULT (strftime('%s', 'now') * 1000), end_time INTEGER, summary_json TEXT)`);
            database.exec(`CREATE TABLE IF NOT EXISTS pentest_findings (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, vulnerability_type TEXT, severity TEXT, confidence REAL, sink_path TEXT, proof_of_concept TEXT, evidence_json TEXT, status TEXT DEFAULT 'potential', created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), FOREIGN KEY(session_id) REFERENCES pentest_sessions(id))`);
        };
        initSchema(db);
    } catch (e) {
        console.warn('[DB] Native database initialization failed, falling back to mock.', e);
    }
}

// Fallback / Web implementation
if (!db) {
    console.log('[DB] Using Web Mock Database (InMemory/LocalStorage)');
    db = {
        exec: () => {},
        prepare: () => ({
            run: () => ({ changes: 0, lastInsertRowid: 0 }),
            get: () => null,
            all: () => []
        }),
        pragma: () => {}
    };
}

export default db;
