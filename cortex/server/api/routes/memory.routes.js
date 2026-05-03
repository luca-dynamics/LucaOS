import express from 'express';
import { memoryStore } from '../../../../src/services/memoryStore.js';

const router = express.Router();

// --- MEMORY SYNC ---
router.get('/load', (req, res) => {
    try {
        const memories = memoryStore.getAll();
        res.json(memories);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/save', (req, res) => {
    try {
        const memories = req.body;
        if (!Array.isArray(memories)) {
            return res.status(400).json({ error: "Expected array of memories" });
        }
        memoryStore.sync(memories);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/store', (req, res) => {
    try {
        const { key, value, category, importance, tenantId, expiresAt, confidence } = req.body || {};

        if (!key || typeof key !== 'string') {
            return res.status(400).json({ error: "Memory 'key' is required" });
        }

        if (typeof value !== 'string') {
            return res.status(400).json({ error: "Memory 'value' must be a string" });
        }

        const result = memoryStore.add({
            key,
            value,
            category: category || 'FACT',
            importance,
            tenantId,
            expiresAt,
            confidence: typeof confidence === 'number' ? confidence : 0.99,
            timestamp: Date.now(),
        });

        res.json({
            success: true,
            memory: {
                id: result.lastInsertRowid?.toString?.() || null,
                key,
                value,
                category: category || 'FACT',
                importance,
                tenantId,
                expiresAt,
                confidence: typeof confidence === 'number' ? confidence : 0.99,
            },
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/retrieve', (req, res) => {
    try {
        const { query, limit } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: "Memory 'query' is required" });
        }

        const results = memoryStore.searchByText(query, limit || 10);
        res.json({ success: true, results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/reconcile', (req, res) => {
    try {
        const result = memoryStore.reconcile();
        res.json({
            ...result,
            note: "Performed exact duplicate cleanup on persisted memories. This does not run full semantic synapse consolidation.",
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Wipe all memories (Factory Reset)
router.post('/wipe', (req, res) => {
    try {
        memoryStore.wipe();
        res.json({ success: true, message: "All memories wiped" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- TEXT SEARCH (FTS5) ---
router.post('/text-search', (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Query required" });
        }
        const results = memoryStore.searchByText(query, limit);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- VECTOR OPERATIONS ---
router.post('/vector-search', (req, res) => {
    try {
        const { embedding, limit } = req.body;
        if (!embedding || !Array.isArray(embedding)) {
            return res.status(400).json({ error: "Invalid embedding" });
        }
        const results = memoryStore.searchByVector(embedding, limit);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/vector-save', (req, res) => {
    try {
        memoryStore.addVector(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- GRAPH VISUALIZATION ---
router.get('/graph/visualize', (req, res) => {
    try {
        const graph = memoryStore.getGraph();
        res.json(graph);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LANGGRAPH EVENT LOGGING ---
router.post('/log-event', (req, res) => {
    try {
        const { toolName, args, result, sessionId, previousEventId } = req.body;
        const eventId = memoryStore.logExecutionEvent(toolName, args, result, sessionId, previousEventId);
        res.json({ success: true, eventId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
