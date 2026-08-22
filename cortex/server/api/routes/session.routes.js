/**
 * Session Transcript Routes
 *
 * The core owns session identity. A surface asks "which session am I in?" and
 * gets one answer — it does not invent a session id of its own, because a
 * per-renderer id is how one Luca quietly becomes several.
 *
 * Reads return raw entry rows rather than provider-shaped messages: shaping
 * history for a model (token budgeting, legal cut points, summary handling) is
 * TypeScript that lives in the renderer, and this file is plain JS the server
 * cannot type-check against it. The server owns order and durability; the
 * renderer owns shape.
 */

import express from 'express';
import { sessionEntryStore, SESSION_ERRORS } from '../../services/sessionEntryStore.js';

const router = express.Router();

/**
 * Map a store error to a status. A discarded write must never look like a
 * success, so an unwritable store answers 503 with `degraded: true` and the
 * client reports the backlog instead of assuming it landed.
 */
const sendStoreError = (res, error) => {
    if (error?.code === SESSION_ERRORS.NOT_WRITABLE) {
        return res.status(503).json({ error: error.message, degraded: true });
    }
    // 409 is the ONE status that means "another surface is driving". The client
    // refuses a turn on this and on nothing else, so every other failure mode
    // here — including ones nobody has thought of yet — lets the turn proceed
    // rather than silencing Luca. Keep it that way.
    if (error?.code === SESSION_ERRORS.LEASE_HELD) {
        return res.status(409).json({ error: error.message, holder: error.holder ?? null });
    }
    if (error?.code === SESSION_ERRORS.NOT_FOUND) {
        return res.status(404).json({ error: error.message });
    }
    if (error?.code === SESSION_ERRORS.INVALID) {
        return res.status(400).json({ error: error.message });
    }
    // 413, not 500: the store refused a write it was perfectly able to perform,
    // and the caller can act on that — store less, or clear a key first. The
    // structured detail travels with the status so the client can say which limit
    // was hit rather than guessing from the prose.
    if (error?.code === SESSION_ERRORS.SCRATCHPAD_FULL) {
        return res.status(413).json({
            error: error.message,
            scope: error.scope ?? null,
            limit: error.limit ?? null,
            bytesUsed: error.bytesUsed ?? null,
            keyCount: error.keyCount ?? null,
        });
    }
    return res.status(500).json({ error: error?.message || String(error) });
};

/**
 * CURRENT SESSION
 * GET /api/session/current
 */
router.get('/current', (req, res) => {
    try {
        const session = sessionEntryStore.getOrCreateCurrentSession();
        res.json({ session, ...sessionEntryStore.storageStatus() });
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * NEW SESSION (archives the previous one)
 * POST /api/session/new
 */
router.post('/new', (req, res) => {
    try {
        const { title } = req.body || {};
        const session = sessionEntryStore.createSession({ title });
        res.json({ session, ...sessionEntryStore.storageStatus() });
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * APPEND ENTRIES (batch)
 * POST /api/session/:id/entries
 *
 * Batched because one tool round produces several entries that must land
 * contiguously. Idempotent by `clientId`, so the renderer's retry cannot
 * double-write.
 */
router.post('/:id/entries', (req, res) => {
    try {
        const { entries } = req.body || {};
        if (!Array.isArray(entries)) {
            return res.status(400).json({ error: 'Body must be { entries: [...] }' });
        }
        res.json(sessionEntryStore.appendEntries(req.params.id, entries));
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * READ ENTRIES
 * GET /api/session/:id/entries?sinceSeq=&limit=
 * GET /api/session/:id/entries?tail=200   (the last N, for boot hydration)
 */
router.get('/:id/entries', (req, res) => {
    try {
        const { sinceSeq, limit, tail } = req.query;
        const result = tail
            ? sessionEntryStore.getRecentEntries(req.params.id, { limit: tail })
            : sessionEntryStore.getEntries(req.params.id, { sinceSeq, limit });
        res.json(result);
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * ACQUIRE OR RENEW THE TURN LEASE
 * POST /api/session/:id/lease
 *
 * One route for both because a lost renewal is retried, and that retry must not
 * be refused by the holder's own earlier lease. A rival gets 409 with the holder
 * named — see `sendStoreError`, and RFC-0006 for why 409 is the only refusal.
 *
 * Declared above `GET /:id` to keep this file's specific-before-general order.
 */
router.post('/:id/lease', (req, res) => {
    try {
        const { holderId, surface, ttlMs } = req.body || {};
        res.json(sessionEntryStore.acquireLease(req.params.id, { holderId, surface, ttlMs }));
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * RELEASE THE TURN LEASE
 * DELETE /api/session/:id/lease
 *
 * The token is required: it is what makes a lease a capability rather than a
 * suggestion, so no surface can end another's turn.
 */
router.delete('/:id/lease', (req, res) => {
    try {
        const { holderId, token } = req.body || {};
        res.json(sessionEntryStore.releaseLease(req.params.id, { holderId, token }));
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * READ THE SCRATCHPAD
 * GET /api/session/:id/scratchpad
 *
 * Answers `{ state, corruptKeys, bytesUsed, keyCount, limits }` plus the storage
 * status. An unknown session reads as empty rather than 404: a surface that has
 * stored nothing yet and one whose session was archived are in the same
 * position, and neither is a fault.
 *
 * Declared above `GET /:id` to keep this file's specific-before-general order.
 */
router.get('/:id/scratchpad', (req, res) => {
    try {
        res.json(sessionEntryStore.readScratchpad(req.params.id));
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * WRITE THE SCRATCHPAD
 * PUT /api/session/:id/scratchpad
 *
 * PUT rather than POST because the body is the whole scratchpad: a flush of
 * `luca.state` is authoritative, and a key the script deleted has to disappear
 * here too. JSON cannot carry `undefined`, so an absent key is the only way a
 * deletion can be expressed over the wire — which is why `replace` defaults to
 * true. An explicit `replace: false` merges instead, for a caller that owns some
 * keys and must not clobber another's.
 *
 * Over budget answers 413 and writes nothing at all — see `sendStoreError`.
 */
router.put('/:id/scratchpad', (req, res) => {
    try {
        const { state, surface, replace } = req.body || {};
        if (!state || typeof state !== 'object' || Array.isArray(state)) {
            return res.status(400).json({ error: 'Body must be { state: { ... } }' });
        }
        res.json(sessionEntryStore.writeScratchpad(req.params.id, state, {
            surface,
            replace: replace !== false,
        }));
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * CLEAR THE SCRATCHPAD
 * DELETE /api/session/:id/scratchpad
 *
 * `{ keys: [...] }` drops those keys; an omitted body drops all of them. An
 * empty array drops nothing, which is the honest reading of "none named" and
 * keeps a client bug from wiping a session's working data.
 *
 * Read from the body rather than the query string to match `DELETE /:id/lease`,
 * and because a key is arbitrary text with no business being URL-encoded.
 */
router.delete('/:id/scratchpad', (req, res) => {
    try {
        const { keys } = req.body || {};
        res.json(sessionEntryStore.clearScratchpad(req.params.id, keys ?? null));
    } catch (error) {
        sendStoreError(res, error);
    }
});

/**
 * SESSION METADATA
 * GET /api/session/:id
 */
router.get('/:id', (req, res) => {
    try {
        const session = sessionEntryStore.getSession(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({ session, ...sessionEntryStore.storageStatus() });
    } catch (error) {
        sendStoreError(res, error);
    }
});

export default router;
