/**
 * Session Entry Store (Backend Service)
 *
 * The durable, append-only record of Luca's conversation: an ordered tree of
 * entries per session, with tool structure intact.
 *
 * This replaces reconstructing history from the Chroma vector index, which
 * cannot represent a turn — it holds flat `{text, sender}` pairs, so a tool call
 * and its result come back as ordinary chat lines (or worse, as if the user had
 * said them). An `INSERT`-only table with a server-assigned `seq` is the only
 * shape that can answer "what happened, in what order" honestly.
 *
 * Append-only is a rule, not an accident: nothing here updates `content` and
 * nothing deletes an entry. A context compaction is recorded as a NEW
 * `role='summary'` entry rather than a rewrite of the rows it covers, so the
 * pre-compaction transcript survives on disk even though the model stops being
 * shown it.
 *
 * Why the schema lives here rather than in `initSchema` (src/services/db.js):
 * the store must be testable against an injected in-memory database, and
 * `CheckpointManager` already sets the precedent for a module owning its own
 * `CREATE TABLE IF NOT EXISTS`. It also keeps this change from touching the
 * seven tables the rest of the system depends on.
 */

import db from '../../../src/services/db.js';

/**
 * Persisted-shape version. Rides on every row and every API response so a newer
 * and older surface can interoperate during a rollout, per RFC-0004
 * ("versioning discipline is forever"). This repository has no migration
 * framework — only `CREATE TABLE IF NOT EXISTS` — so shapes evolve additively
 * and the version is how a reader knows what it is looking at.
 */
export const SESSION_SCHEMA_VERSION = 1;

/** Roles a transcript entry may carry. `summary` is written by the compactor. */
export const ENTRY_ROLES = Object.freeze(['user', 'model', 'tool', 'system', 'summary']);

const DEFAULT_ENTRY_LIMIT = 500;
const MAX_ENTRY_LIMIT = 5000;

const mapSessionRow = (row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapEntryRow = (row) => ({
    seq: row.seq,
    parentSeq: row.parent_seq,
    role: row.role,
    content: row.content,
    thought: row.thought,
    toolName: row.tool_name,
    toolCallId: row.tool_call_id,
    toolCalls: row.tool_calls_json ? JSON.parse(row.tool_calls_json) : null,
    surface: row.surface,
    schemaVersion: row.schema_version,
    clientId: row.client_id,
    createdAt: row.created_at,
});

/**
 * A lease as described to *someone else* — deliberately without `token`.
 *
 * A refused acquire tells the loser who is driving, and it must not hand them
 * the winner's token in the process: the token is the capability that authorizes
 * a release, so leaking it here would let a refused surface evict the holder it
 * was just refused by. The holder learns its own token from the acquire that
 * issued it, and from nowhere else.
 */
const mapLeaseRow = (row) => ({
    sessionId: row.session_id,
    holderId: row.holder_id,
    surface: row.surface,
    acquiredAt: row.acquired_at,
    renewedAt: row.renewed_at,
    expiresAt: row.expires_at,
});

/** node:sqlite rejects `undefined`; every optional column binds as NULL. */
const orNull = (value) => (value === undefined || value === '' ? null : value ?? null);

/**
 * How long a lease stays valid without a renewal, and the bounds a caller may
 * ask for. The default is deliberately several times the renewal interval the
 * client uses: a holder blocked on a garbage collection or a slow disk must not
 * lose its lease to a rival while it is still very much alive.
 */
export const DEFAULT_LEASE_TTL_MS = 45_000;
const MIN_LEASE_TTL_MS = 5_000;
const MAX_LEASE_TTL_MS = 300_000;

/**
 * Scratchpad budget.
 *
 * Bounded **at the write**, not truncated at the read: a caller that stored a
 * value and got an acknowledgement must be able to rely on it being whole. A read
 * that quietly returned a shortened value would be the same lie as an in-memory
 * fallback that pretends to persist. Over budget is a refusal with the numbers
 * attached, so the caller can decide what to drop.
 *
 * The per-key cap is what a script's intermediate result plausibly needs; the
 * per-session cap is what keeps one runaway loop from filling the database that
 * also holds the transcript. Keys are capped as well, because 100 000 one-byte
 * keys is a different denial of service from one large value.
 */
export const MAX_SCRATCHPAD_KEY_BYTES = 256 * 1024;
export const MAX_SCRATCHPAD_SESSION_BYTES = 1024 * 1024;
export const MAX_SCRATCHPAD_KEYS = 64;
/** A key is an identifier, not a payload; this stops it being used as one. */
export const MAX_SCRATCHPAD_KEY_LENGTH = 256;

/**
 * Errors carry a code so the route layer can map them to a status without
 * pattern-matching English.
 */
export const SESSION_ERRORS = Object.freeze({
    NOT_WRITABLE: 'SESSION_STORE_NOT_WRITABLE',
    NOT_FOUND: 'SESSION_NOT_FOUND',
    INVALID: 'SESSION_ENTRY_INVALID',
    LEASE_HELD: 'SESSION_LEASE_HELD',
    SCRATCHPAD_FULL: 'SESSION_SCRATCHPAD_FULL',
});

/** `extra` carries structured detail — e.g. which holder refused an acquire. */
const storeError = (code, message, extra = {}) =>
    Object.assign(new Error(message), { code, ...extra });

class SessionEntryStore {
    /**
     * @param {object} [handle] SQLite handle. Defaults to the shared database;
     *   tests inject a real `DatabaseSync(':memory:')`.
     * @param {() => number} [now] Clock, used by the **lease methods only**.
     *   The lease is the one feature whose correctness depends on *elapsed*
     *   time — expiry and takeover are decisions about a duration — while
     *   `createSession` and `appendEntries` merely stamp a timestamp and branch
     *   on nothing. Keeping the seam to the leases makes expiry testable
     *   deterministically instead of by sleeping, without touching the append
     *   path at all.
     */
    constructor(handle = db, now = () => Date.now()) {
        this.db = handle;
        this.now = now;
        this.schemaReady = false;
    }

    /**
     * Idempotent DDL, run once per handle on first use.
     */
    ensureSchema() {
        if (this.schemaReady) return;

        this.db.exec(`CREATE TABLE IF NOT EXISTS sessions (
            id             TEXT PRIMARY KEY,
            title          TEXT,
            status         TEXT    NOT NULL DEFAULT 'active',
            schema_version INTEGER NOT NULL DEFAULT 1,
            created_at     INTEGER NOT NULL,
            updated_at     INTEGER NOT NULL
        )`);

        // `parent_seq` is `seq - 1` today. It is here from the start because
        // adding it later would need an ALTER TABLE this repo has no mechanism
        // for, and it is what lets rewind/branch arrive additively later.
        this.db.exec(`CREATE TABLE IF NOT EXISTS session_entries (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      TEXT    NOT NULL,
            seq             INTEGER NOT NULL,
            parent_seq      INTEGER,
            role            TEXT    NOT NULL,
            content         TEXT    NOT NULL DEFAULT '',
            thought         TEXT,
            tool_name       TEXT,
            tool_call_id    TEXT,
            tool_calls_json TEXT,
            surface         TEXT,
            schema_version  INTEGER NOT NULL DEFAULT 1,
            client_id       TEXT,
            created_at      INTEGER NOT NULL,
            UNIQUE(session_id, seq),
            UNIQUE(session_id, client_id),
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )`);

        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_session_entries_lookup
            ON session_entries(session_id, seq)`);

        // Which surface is currently allowed to drive a turn on a session.
        //
        // The append-only table above records honestly whatever it is given —
        // which means two surfaces appending at once produce one contiguous,
        // perfectly legal transcript of two braided conversations. `client_id`
        // does not help: it dedupes a *retry*, not a *rival*. This table is how
        // a rival is recognised as a rival.
        //
        // `session_id` is the primary key, so there is at most one lease per
        // session by construction rather than by convention.
        this.db.exec(`CREATE TABLE IF NOT EXISTS session_leases (
            session_id   TEXT PRIMARY KEY,
            holder_id    TEXT    NOT NULL,
            surface      TEXT    NOT NULL,
            token        TEXT    NOT NULL,
            acquired_at  INTEGER NOT NULL,
            renewed_at   INTEGER NOT NULL,
            expires_at   INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )`);

        // Working data a script left behind, keyed by session.
        //
        // Separate from `session_entries` because it is the one thing here that is
        // deliberately NOT append-only: a script overwrites `rows` on every run,
        // and recording each overwrite as a new immutable row would grow without
        // bound to preserve versions nobody asked for. The transcript records that
        // a value was stored; this table holds the value.
        //
        // `(session_id, key)` is the primary key, so an upsert is the natural
        // write and a key cannot exist twice under one session by construction.
        // `bytes` is stored rather than recomputed so the per-session budget is a
        // SUM over an integer column instead of a re-measure of every value.
        this.db.exec(`CREATE TABLE IF NOT EXISTS session_scratchpad (
            session_id  TEXT    NOT NULL,
            key         TEXT    NOT NULL,
            value       TEXT    NOT NULL,
            bytes       INTEGER NOT NULL,
            surface     TEXT    NOT NULL,
            updated_at  INTEGER NOT NULL,
            PRIMARY KEY (session_id, key),
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )`);

        this.schemaReady = true;
    }

    /**
     * Whether this handle is the non-persistent mock from db.js.
     *
     * `degraded` means a real database was expected and failed to open — on the
     * core server that is always the case, since only a browser build has no
     * filesystem. Reported on every response so the caller can say "these
     * entries are NOT saved" instead of quietly assuming they were.
     */
    storageStatus() {
        const mock = !!this.db.__isMockStore;
        return {
            mock,
            degraded: mock && this.db.__degraded !== false,
            schemaVersion: SESSION_SCHEMA_VERSION,
        };
    }

    /**
     * Refuse writes we know will be discarded. Failing closed here is what keeps
     * a lost transcript from looking like a saved one; the route turns this into
     * a 503 and the renderer reports the backlog loudly.
     */
    assertWritable() {
        if (this.db.__isMockStore) {
            throw storeError(
                SESSION_ERRORS.NOT_WRITABLE,
                'Session transcript is not writable: the persistent database failed to open, ' +
                'so entries would be discarded. Refusing the write instead of losing it.',
            );
        }
    }

    /**
     * The session every surface should be appending to, created on first ask.
     *
     * Session identity is owned by the core precisely so it is not invented once
     * per renderer — one Luca, one thread, one answer for every surface.
     */
    getOrCreateCurrentSession() {
        this.ensureSchema();
        const row = this.db
            .prepare(`SELECT * FROM sessions WHERE status = 'active'
                      ORDER BY updated_at DESC, created_at DESC LIMIT 1`)
            .get();

        if (row) return mapSessionRow(row);
        return this.createSession();
    }

    /**
     * Begin a new session, archiving whatever was active. Archiving rather than
     * deleting: an old thread stays readable.
     */
    createSession({ title = null } = {}) {
        this.assertWritable();
        this.ensureSchema();

        const now = Date.now();
        const id = `session_${now}_${Math.random().toString(36).slice(2, 11)}`;

        this.db.exec('BEGIN');
        try {
            this.db
                .prepare(`UPDATE sessions SET status = 'archived', updated_at = ?
                          WHERE status = 'active'`)
                .run(now);
            this.db
                .prepare(`INSERT INTO sessions (id, title, status, schema_version, created_at, updated_at)
                          VALUES (?, ?, 'active', ?, ?, ?)`)
                .run(id, orNull(title), SESSION_SCHEMA_VERSION, now, now);
            this.db.exec('COMMIT');
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }

        return this.getSession(id);
    }

    /**
     * Fetch one session's metadata.
     */
    getSession(id) {
        this.ensureSchema();
        const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
        return row ? mapSessionRow(row) : null;
    }

    /**
     * Append a batch of entries in one transaction, assigning `seq` server-side.
     *
     * Batched because one tool round produces several entries at once and they
     * must land contiguously — a per-entry request would interleave under
     * concurrency and could tear a tool call away from its result.
     *
     * Idempotent by caller-supplied `clientId`: the renderer's flush queue
     * retries, and `ON CONFLICT DO NOTHING` means a retry cannot double-write.
     * A conflicting entry does not consume a `seq`, so numbering stays
     * contiguous no matter how many times a batch is replayed.
     *
     * @param {string} sessionId
     * @param {Array<object>} entries
     */
    appendEntries(sessionId, entries) {
        this.assertWritable();
        this.ensureSchema();

        if (!sessionId) throw storeError(SESSION_ERRORS.INVALID, 'appendEntries requires a sessionId');
        if (!Array.isArray(entries)) {
            throw storeError(SESSION_ERRORS.INVALID, 'appendEntries requires an array of entries');
        }

        // Validate before opening a transaction, so a bad role cannot roll back
        // a batch that was half-inserted.
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object') {
                throw storeError(SESSION_ERRORS.INVALID, 'Each entry must be an object');
            }
            if (!ENTRY_ROLES.includes(entry.role)) {
                throw storeError(
                    SESSION_ERRORS.INVALID,
                    `Unknown entry role "${entry.role}". Expected one of: ${ENTRY_ROLES.join(', ')}`,
                );
            }
        }

        if (!this.db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId)) {
            throw storeError(SESSION_ERRORS.NOT_FOUND, `Unknown session "${sessionId}"`);
        }

        if (entries.length === 0) {
            return { sessionId, entries: [], ...this.storageStatus() };
        }

        const now = Date.now();
        const insert = this.db.prepare(`
            INSERT INTO session_entries
                (session_id, seq, parent_seq, role, content, thought, tool_name,
                 tool_call_id, tool_calls_json, surface, schema_version, client_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING
        `);
        const findByClientId = this.db.prepare(
            'SELECT seq FROM session_entries WHERE session_id = ? AND client_id = ?',
        );

        this.db.exec('BEGIN');
        try {
            const head = this.db
                .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM session_entries WHERE session_id = ?')
                .get(sessionId);
            let nextSeq = Number(head?.max_seq ?? 0) + 1;

            const written = [];
            for (const entry of entries) {
                const clientId = orNull(entry.clientId);
                const result = insert.run(
                    sessionId,
                    nextSeq,
                    nextSeq > 1 ? nextSeq - 1 : null,
                    entry.role,
                    typeof entry.content === 'string' ? entry.content : '',
                    orNull(entry.thought),
                    orNull(entry.toolName ?? entry.name),
                    orNull(entry.toolCallId),
                    entry.toolCalls ? JSON.stringify(entry.toolCalls) : null,
                    orNull(entry.surface),
                    SESSION_SCHEMA_VERSION,
                    clientId,
                    Number(entry.createdAt) || now,
                );

                if (Number(result.changes) > 0) {
                    written.push({ clientId, seq: nextSeq, stored: true });
                    nextSeq += 1;
                } else {
                    // Already stored by an earlier attempt at this batch.
                    const existing = clientId ? findByClientId.get(sessionId, clientId) : null;
                    written.push({
                        clientId,
                        seq: existing ? Number(existing.seq) : null,
                        stored: false,
                        duplicate: true,
                    });
                }
            }

            this.db
                .prepare('UPDATE sessions SET updated_at = ? WHERE id = ?')
                .run(now, sessionId);
            this.db.exec('COMMIT');

            return { sessionId, entries: written, ...this.storageStatus() };
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    /**
     * Read a session's entries in order. `sinceSeq` is exclusive, so a caller
     * that already holds up to N asks for `sinceSeq=N` and gets only what is new.
     */
    getEntries(sessionId, { sinceSeq = 0, limit = DEFAULT_ENTRY_LIMIT } = {}) {
        this.ensureSchema();

        const safeSince = Number.isFinite(Number(sinceSeq)) ? Math.max(0, Number(sinceSeq)) : 0;
        const safeLimit = Math.min(
            MAX_ENTRY_LIMIT,
            Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : DEFAULT_ENTRY_LIMIT),
        );

        const rows = this.db
            .prepare(`SELECT * FROM session_entries
                      WHERE session_id = ? AND seq > ?
                      ORDER BY seq ASC
                      LIMIT ?`)
            .all(sessionId, safeSince, safeLimit);

        return {
            sessionId,
            entries: rows.map(mapEntryRow),
            ...this.storageStatus(),
        };
    }

    /**
     * The last `limit` entries, in chronological order — what a surface needs to
     * hydrate a long-running session without reading the whole thread.
     */
    getRecentEntries(sessionId, { limit = DEFAULT_ENTRY_LIMIT } = {}) {
        this.ensureSchema();

        const safeLimit = Math.min(
            MAX_ENTRY_LIMIT,
            Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : DEFAULT_ENTRY_LIMIT),
        );

        const rows = this.db
            .prepare(`SELECT * FROM session_entries
                      WHERE session_id = ?
                      ORDER BY seq DESC
                      LIMIT ?`)
            .all(sessionId, safeLimit);

        return {
            sessionId,
            entries: rows.reverse().map(mapEntryRow),
            ...this.storageStatus(),
        };
    }

    /**
     * Claim the right to drive a turn on a session, or renew a claim already
     * held.
     *
     * Acquire and renew are deliberately the same call. A holder whose renewal
     * request is lost to a network blip retries, and that retry must not be
     * refused by the holder's *own* earlier lease — so a matching `holderId`
     * extends rather than conflicts. It also means the client needs one route
     * and one code path instead of two.
     *
     * **What makes this mutually exclusive:** the method is synchronous from top
     * to bottom, `node:sqlite` executes statements synchronously, and every
     * surface talks to the same single-process core — so Node's event loop
     * cannot interleave another request between the read and the write. Two
     * surfaces racing to acquire get a serialized answer and exactly one wins.
     * Introducing an `await` anywhere in this method would silently break that;
     * if this ever needs to become async, it needs a real transaction and a
     * `BEGIN IMMEDIATE` instead.
     *
     * @param {string} sessionId
     * @param {{holderId: string, surface?: string, ttlMs?: number}} options
     * @throws A `LEASE_HELD` error, carrying `holder`, when someone else is
     *   driving — the caller is meant to name them, not to guess.
     */
    acquireLease(sessionId, { holderId, surface = null, ttlMs } = {}) {
        this.assertWritable();
        this.ensureSchema();

        if (!sessionId) throw storeError(SESSION_ERRORS.INVALID, 'acquireLease requires a sessionId');
        if (!holderId || typeof holderId !== 'string') {
            throw storeError(SESSION_ERRORS.INVALID, 'acquireLease requires a holderId');
        }

        const requested = Number(ttlMs);
        const ttl = Math.min(
            MAX_LEASE_TTL_MS,
            Math.max(MIN_LEASE_TTL_MS, Number.isFinite(requested) ? requested : DEFAULT_LEASE_TTL_MS),
        );

        if (!this.db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId)) {
            throw storeError(SESSION_ERRORS.NOT_FOUND, `Unknown session "${sessionId}"`);
        }

        const now = this.now();
        const expiresAt = now + ttl;
        const current = this.db
            .prepare('SELECT * FROM session_leases WHERE session_id = ?')
            .get(sessionId);

        // Someone else is driving and is still alive. Nothing is written: a
        // refusal must leave no trace, or a rival's failed attempt would look
        // like activity.
        if (current && current.holder_id !== holderId && Number(current.expires_at) > now) {
            throw storeError(
                SESSION_ERRORS.LEASE_HELD,
                `Session "${sessionId}" is being driven by another surface (${current.surface}).`,
                { holder: mapLeaseRow(current) },
            );
        }

        const renewing = !!current && current.holder_id === holderId;

        // A renewal keeps the token it already handed out — the holder is still
        // using it — and keeps `acquired_at`, so "how long has this surface been
        // driving" stays answerable across renewals.
        const token = renewing ? current.token : `lease_${now}_${Math.random().toString(36).slice(2, 11)}`;
        const acquiredAt = renewing ? Number(current.acquired_at) : now;

        // One statement, so SQLite's implicit transaction is the whole
        // transaction; an explicit BEGIN would add nothing here.
        this.db
            .prepare(`INSERT INTO session_leases
                          (session_id, holder_id, surface, token, acquired_at, renewed_at, expires_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(session_id) DO UPDATE SET
                          holder_id   = excluded.holder_id,
                          surface     = excluded.surface,
                          token       = excluded.token,
                          acquired_at = excluded.acquired_at,
                          renewed_at  = excluded.renewed_at,
                          expires_at  = excluded.expires_at`)
            .run(sessionId, holderId, orNull(surface) ?? 'unknown', token, acquiredAt, now, expiresAt);

        return {
            lease: {
                sessionId,
                holderId,
                token,
                acquiredAt,
                renewedAt: now,
                expiresAt,
                ttlMs: ttl,
                renewed: renewing,
            },
            ...this.storageStatus(),
        };
    }

    /**
     * Give up a lease. Requires both the holder id and the token it was issued,
     * so one surface can never release another's claim — the token is what makes
     * this a capability rather than a suggestion.
     *
     * Releasing a lease that is not held is not an error: a surface that crashed
     * and came back, or one whose lease already lapsed, should be able to clean
     * up without having to reason about whether it still owns anything.
     */
    releaseLease(sessionId, { holderId, token } = {}) {
        this.assertWritable();
        this.ensureSchema();

        if (!sessionId) throw storeError(SESSION_ERRORS.INVALID, 'releaseLease requires a sessionId');
        if (!holderId || !token) {
            throw storeError(SESSION_ERRORS.INVALID, 'releaseLease requires a holderId and a token');
        }

        const result = this.db
            .prepare('DELETE FROM session_leases WHERE session_id = ? AND holder_id = ? AND token = ?')
            .run(sessionId, holderId, token);

        return { released: Number(result.changes) > 0, ...this.storageStatus() };
    }

    /**
     * Who is driving, if anyone. An expired row is reported as no lease at all:
     * a lapsed claim is not a claim, and every reader should agree on that
     * rather than each applying its own clock arithmetic.
     */
    getLease(sessionId) {
        this.ensureSchema();
        const row = this.db
            .prepare('SELECT * FROM session_leases WHERE session_id = ?')
            .get(sessionId);
        if (!row || Number(row.expires_at) <= this.now()) return null;
        return mapLeaseRow(row);
    }

    /**
     * Read a session's scratchpad as a plain object of parsed values.
     *
     * An unknown session reads as empty rather than as an error: a surface that
     * has not stored anything yet is in exactly the same position as one whose
     * session was archived, and neither is a fault.
     *
     * A row whose JSON will not parse is reported in `corruptKeys` and omitted
     * from `state`, instead of either throwing — which would make the whole
     * scratchpad permanently unreadable over one bad row — or being silently
     * skipped, which would make a corrupt value indistinguishable from one that
     * was never written.
     */
    readScratchpad(sessionId) {
        this.ensureSchema();

        const rows = this.db
            .prepare(`SELECT key, value, bytes, surface, updated_at
                      FROM session_scratchpad WHERE session_id = ?
                      ORDER BY key ASC`)
            .all(sessionId);

        const state = {};
        const corruptKeys = [];
        let bytesUsed = 0;

        for (const row of rows) {
            bytesUsed += Number(row.bytes) || 0;
            try {
                state[row.key] = JSON.parse(row.value);
            } catch {
                corruptKeys.push(row.key);
            }
        }

        return {
            sessionId,
            state,
            corruptKeys,
            bytesUsed,
            keyCount: rows.length,
            limits: {
                maxKeyBytes: MAX_SCRATCHPAD_KEY_BYTES,
                maxSessionBytes: MAX_SCRATCHPAD_SESSION_BYTES,
                maxKeys: MAX_SCRATCHPAD_KEYS,
            },
            ...this.storageStatus(),
        };
    }

    /**
     * Upsert a batch of scratchpad values in one transaction.
     *
     * Every check happens **before** `BEGIN`, so an over-budget batch writes
     * nothing at all. A partially-applied batch would be the worst outcome
     * available: the caller is told the write failed while some of it landed, and
     * the two halves of a consistent pair get separated.
     *
     * A value of `undefined` is a deletion, not a write of nothing — that is what
     * `delete luca.state.rows` looks like by the time it reaches here, and
     * `JSON.stringify(undefined)` is `undefined`, which cannot be stored anyway.
     *
     * @param {string} sessionId
     * @param {Record<string, unknown>} entries Values to store, as JS values.
     * @param {{surface?: string, replace?: boolean}} [options] `replace` makes the
     *   batch authoritative: keys absent from it are deleted. That is what a flush
     *   of a whole `luca.state` object means, and without it a script could never
     *   remove a key.
     * @throws A `SCRATCHPAD_FULL` error carrying the usage that would result.
     */
    writeScratchpad(sessionId, entries, { surface = null, replace = false } = {}) {
        this.assertWritable();
        this.ensureSchema();

        if (!sessionId) throw storeError(SESSION_ERRORS.INVALID, 'writeScratchpad requires a sessionId');
        if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
            throw storeError(SESSION_ERRORS.INVALID, 'writeScratchpad requires an object of entries');
        }

        if (!this.db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId)) {
            throw storeError(SESSION_ERRORS.NOT_FOUND, `Unknown session "${sessionId}"`);
        }

        // Serialize and measure first. A key whose value will not serialize is a
        // caller error, and it must be caught before anything is written.
        const writes = [];
        const deletes = [];
        for (const [key, value] of Object.entries(entries)) {
            if (!key || typeof key !== 'string') {
                throw storeError(SESSION_ERRORS.INVALID, 'Every scratchpad key must be a non-empty string');
            }
            if (key.length > MAX_SCRATCHPAD_KEY_LENGTH) {
                throw storeError(
                    SESSION_ERRORS.INVALID,
                    `Scratchpad key "${key.slice(0, 32)}..." exceeds ${MAX_SCRATCHPAD_KEY_LENGTH} characters.`,
                );
            }

            if (value === undefined) {
                deletes.push(key);
                continue;
            }

            let json;
            try {
                json = JSON.stringify(value);
            } catch (error) {
                throw storeError(
                    SESSION_ERRORS.INVALID,
                    `Scratchpad key "${key}" holds a value that cannot be stored as JSON ` +
                    `(${error.message}). Functions, circular references and live handles ` +
                    'do not survive leaving the script that made them.',
                );
            }
            if (json === undefined) {
                // A bare function or symbol. `undefined` above is a deletion; this
                // is a value the caller believes it stored.
                throw storeError(
                    SESSION_ERRORS.INVALID,
                    `Scratchpad key "${key}" holds a value with no JSON representation.`,
                );
            }

            const bytes = Buffer.byteLength(json, 'utf8');
            if (bytes > MAX_SCRATCHPAD_KEY_BYTES) {
                throw storeError(
                    SESSION_ERRORS.SCRATCHPAD_FULL,
                    `Scratchpad key "${key}" is ${bytes} bytes, over the ` +
                    `${MAX_SCRATCHPAD_KEY_BYTES}-byte limit for a single key. Nothing was written.`,
                    { key, bytes, limit: MAX_SCRATCHPAD_KEY_BYTES, scope: 'key' },
                );
            }

            writes.push({ key, json, bytes });
        }

        // Budget against what the session will hold *after* this batch: a rewrite
        // of an existing key replaces its bytes rather than adding to them, so
        // overwriting one large value with another must not be refused.
        const existing = this.db
            .prepare('SELECT key, bytes FROM session_scratchpad WHERE session_id = ?')
            .all(sessionId);

        const surviving = new Map();
        for (const row of existing) surviving.set(row.key, Number(row.bytes) || 0);
        if (replace) {
            for (const key of surviving.keys()) {
                if (!Object.prototype.hasOwnProperty.call(entries, key)) surviving.delete(key);
            }
        }
        for (const key of deletes) surviving.delete(key);
        for (const { key, bytes } of writes) surviving.set(key, bytes);

        const projectedKeys = surviving.size;
        let projectedBytes = 0;
        for (const bytes of surviving.values()) projectedBytes += bytes;

        if (projectedKeys > MAX_SCRATCHPAD_KEYS) {
            throw storeError(
                SESSION_ERRORS.SCRATCHPAD_FULL,
                `This write would leave ${projectedKeys} scratchpad keys, over the limit of ` +
                `${MAX_SCRATCHPAD_KEYS}. Nothing was written; clear a key first.`,
                { keyCount: projectedKeys, limit: MAX_SCRATCHPAD_KEYS, scope: 'keys' },
            );
        }
        if (projectedBytes > MAX_SCRATCHPAD_SESSION_BYTES) {
            throw storeError(
                SESSION_ERRORS.SCRATCHPAD_FULL,
                `This write would leave ${projectedBytes} bytes in the session scratchpad, over ` +
                `the ${MAX_SCRATCHPAD_SESSION_BYTES}-byte limit. Nothing was written; ` +
                'clear a key first or store less.',
                { bytesUsed: projectedBytes, limit: MAX_SCRATCHPAD_SESSION_BYTES, scope: 'session' },
            );
        }

        const now = Date.now();
        const provenance = orNull(surface) ?? 'unknown';

        this.db.exec('BEGIN');
        try {
            if (replace) {
                const keep = [...surviving.keys()];
                // No placeholders when nothing survives: `IN ()` is a syntax error.
                if (keep.length === 0) {
                    this.db.prepare('DELETE FROM session_scratchpad WHERE session_id = ?').run(sessionId);
                } else {
                    this.db
                        .prepare(`DELETE FROM session_scratchpad WHERE session_id = ?
                                  AND key NOT IN (${keep.map(() => '?').join(', ')})`)
                        .run(sessionId, ...keep);
                }
            }

            if (deletes.length > 0) {
                const remove = this.db.prepare(
                    'DELETE FROM session_scratchpad WHERE session_id = ? AND key = ?',
                );
                for (const key of deletes) remove.run(sessionId, key);
            }

            const upsert = this.db.prepare(`
                INSERT INTO session_scratchpad (session_id, key, value, bytes, surface, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id, key) DO UPDATE SET
                    value      = excluded.value,
                    bytes      = excluded.bytes,
                    surface    = excluded.surface,
                    updated_at = excluded.updated_at
            `);
            for (const { key, json, bytes } of writes) {
                upsert.run(sessionId, key, json, bytes, provenance, now);
            }

            this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);
            this.db.exec('COMMIT');
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }

        return {
            sessionId,
            written: writes.map(({ key, bytes }) => ({ key, bytes })),
            deleted: deletes,
            bytesUsed: projectedBytes,
            keyCount: projectedKeys,
            ...this.storageStatus(),
        };
    }

    /**
     * Drop scratchpad keys — the named ones, or all of them when `keys` is
     * omitted. Clearing what is not there is not an error, for the same reason
     * releasing an unheld lease is not: cleanup should not require the caller to
     * first prove what exists.
     */
    clearScratchpad(sessionId, keys = null) {
        this.assertWritable();
        this.ensureSchema();

        if (!sessionId) throw storeError(SESSION_ERRORS.INVALID, 'clearScratchpad requires a sessionId');

        if (keys === null || keys === undefined) {
            const result = this.db
                .prepare('DELETE FROM session_scratchpad WHERE session_id = ?')
                .run(sessionId);
            return { sessionId, cleared: Number(result.changes), ...this.storageStatus() };
        }

        if (!Array.isArray(keys)) {
            throw storeError(SESSION_ERRORS.INVALID, 'clearScratchpad expects an array of keys');
        }

        let cleared = 0;
        const remove = this.db.prepare(
            'DELETE FROM session_scratchpad WHERE session_id = ? AND key = ?',
        );
        for (const key of keys) {
            if (typeof key !== 'string' || !key) continue;
            cleared += Number(remove.run(sessionId, key).changes);
        }

        return { sessionId, cleared, ...this.storageStatus() };
    }
}

export { SessionEntryStore };
export const sessionEntryStore = new SessionEntryStore();
