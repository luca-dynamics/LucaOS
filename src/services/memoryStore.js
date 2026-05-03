import db from './db.js';
import fs from 'fs';



import { MEMORY_FILE } from '../../cortex/server/config/constants.js';

export const memoryStore = {

    // Migration: Load legacy JSON and insert into SQLite
    migrateFromJson: () => {
        if (fs.existsSync(MEMORY_FILE)) {
            console.log('[MEMORY_STORE] Found legacy memory.json. Migrating to SQLite...');
            try {
                const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
                const memories = JSON.parse(raw);

                if (Array.isArray(memories)) {
                    const insert = db.prepare(`
                        INSERT INTO memories (content, type, created_at, metadata_json)
                        VALUES (@content, @type, @created_at, @metadata_json)
                    `);

                    const insertMany = db.transaction((items) => {
                        for (const item of items) {
                            // Check if already exists (simple duplicate check by content key)
                            const exists = db.prepare('SELECT id FROM memories WHERE content LIKE ?').get(`${item.key}:%`);
                            if (!exists) {
                                insert.run({
                                    content: `${item.key}: ${item.value}`,
                                    type: item.category === 'FACT' ? 'semantic' : 'episodic',
                                    created_at: item.timestamp || Date.now(),
                                    metadata_json: JSON.stringify({
                                        category: item.category,
                                        confidence: item.confidence,
                                        original_id: item.id
                                    })
                                });
                            }
                        }
                    });

                    insertMany(memories);
                    console.log(`[MEMORY_STORE] Migrated ${memories.length} memories.`);

                    // Rename legacy file
                    fs.renameSync(MEMORY_FILE, `${MEMORY_FILE}.bak`);
                }
            } catch (e) {
                console.error('[MEMORY_STORE] Migration failed:', e);
            }
        }
    },

    // Get all memories (formatted as MemoryNode for frontend compatibility)
    getAll: () => {
        const rows = db.prepare('SELECT * FROM memories ORDER BY created_at DESC').all();
        return rows.map(row => {
            const meta = row.metadata_json ? JSON.parse(row.metadata_json) : {};
            const [key, ...valParts] = row.content.split(':');
            const value = valParts.join(':').trim();

            return {
                id: row.id.toString(),
                key: key.trim(),
                value: value,
                category: meta.category || 'FACT',
                timestamp: row.created_at,
                confidence: meta.confidence || 1.0
            };
        });
    },

    // Save a single memory
    add: (memory) => {
        const stmt = db.prepare(`
            INSERT INTO memories (content, type, created_at, metadata_json)
            VALUES (?, ?, ?, ?)
        `);

        const content = `${memory.key}: ${memory.value}`;
        const meta = {
            category: memory.category,
            confidence: memory.confidence,
            importance: memory.importance,
            tenantId: memory.tenantId,
            expiresAt: memory.expiresAt,
        };

        return stmt.run(
            content,
            memory.category === 'FACT' ? 'semantic' : 'episodic',
            memory.timestamp || Date.now(),
            JSON.stringify(meta)
        );
    },

    reconcile: () => {
        const rows = db.prepare(`
            SELECT id, content, type, created_at, metadata_json
            FROM memories
            ORDER BY created_at DESC, id DESC
        `).all();

        const nodes = rows.map((row) => {
            const meta = row.metadata_json ? JSON.parse(row.metadata_json) : {};
            const [rawKey, ...rawValueParts] = row.content.split(':');
            return {
                id: row.id,
                row,
                key: rawKey.trim(),
                value: rawValueParts.join(':').trim(),
                category: meta.category || 'FACT',
                confidence: typeof meta.confidence === 'number' ? meta.confidence : 0.7,
                importance: typeof meta.importance === 'number' ? meta.importance : 0,
                tenantId: meta.tenantId,
                expiresAt: meta.expiresAt,
                timestamp: row.created_at,
            };
        });

        const removedIds = [];
        const mergedPairs = [];
        const survivors = [];

        for (const node of nodes) {
            let mergedInto = null;

            for (const survivor of survivors) {
                const similarity = computeMemorySimilarity(node, survivor);
                const sameKeyCategory =
                    survivor.key.trim().toLowerCase() === node.key.trim().toLowerCase() &&
                    String(survivor.category).trim().toLowerCase() === String(node.category).trim().toLowerCase();

                if (sameKeyCategory || similarity >= 0.92) {
                    mergedInto = survivor;
                    mergedPairs.push({
                        kept: survivor.id,
                        removed: node.id,
                        similarity,
                        sameKeyCategory,
                    });
                    mergeMemoryNodes(survivor, node);
                    removedIds.push(node.id);
                    break;
                }
            }

            if (!mergedInto) {
                survivors.push({ ...node });
            }
        }

        const updateStmt = db.prepare(`
            UPDATE memories
            SET content = ?, created_at = ?, metadata_json = ?
            WHERE id = ?
        `);
        const deleteStmt = db.prepare('DELETE FROM memories WHERE id = ?');
        const tx = db.transaction((mergedNodes, ids) => {
            for (const node of mergedNodes) {
                updateStmt.run(
                    `${node.key}: ${node.value}`,
                    node.timestamp,
                    JSON.stringify({
                        category: node.category,
                        confidence: node.confidence,
                        importance: node.importance,
                        tenantId: node.tenantId,
                        expiresAt: node.expiresAt,
                    }),
                    node.id,
                );
            }

            for (const id of ids) deleteStmt.run(id);
        });

        tx(survivors, removedIds);

        return {
            success: true,
            totalMemoriesScanned: rows.length,
            duplicatesRemoved: removedIds.length,
            remainingMemories: rows.length - removedIds.length,
            mode: 'semantic_merge_and_latest_key_category_preservation',
            exactOrNearDuplicatesRemoved: mergedPairs.filter((pair) => !pair.sameKeyCategory).length,
            supersededKeyCategoryEntriesRemoved: mergedPairs.filter((pair) => pair.sameKeyCategory).length,
        };
    },

    // Wipe all memory data (Factory Reset)
    wipe: () => {
        db.prepare('DELETE FROM memories').run();
        db.prepare('DELETE FROM entities').run();
        db.prepare('DELETE FROM relationships').run();
        console.log('[MEMORY_STORE] All memories wiped.');
    },

    // Bulk Save (Overwrite/Sync from Frontend)
    // NOTE: In a real DB, we wouldn't wipe and replace, but for now we maintain compatibility
    // with the frontend's "save all" behavior, but we'll try to be smarter.
    sync: (memories) => {
        // For now, we will just add new ones that don't exist, 
        // or update existing ones. This is a simplified sync.
        const upsert = db.prepare(`
            INSERT INTO memories (content, type, created_at, metadata_json)
            VALUES (@content, @type, @created_at, @metadata_json)
        `);

        const syncTx = db.transaction((items) => {
            for (const item of items) {
                // We use the content (Key: Value) as a pseudo-unique identifier for now
                // Ideally we should use the ID, but the frontend generates random UUIDs
                const content = `${item.key}: ${item.value}`;

                // Check if exact content exists
                const exists = db.prepare('SELECT id FROM memories WHERE content = ?').get(content);

                if (!exists) {
                    upsert.run({
                        content,
                        type: item.category === 'FACT' ? 'semantic' : 'episodic',
                        created_at: item.timestamp || Date.now(),
                        metadata_json: JSON.stringify({
                            category: item.category,
                            confidence: item.confidence
                        })
                    });
                }
            }
        });

        syncTx(memories);
    },

    // Phase 7: Full Text Search (FTS5) implementation (Unified Memory & Log Index)
    searchByText: (query, limit = 50) => {
        try {
            // 1. Search Memories (Facts/Knowledge)
            const memoryRows = db.prepare(`
                SELECT m.*, bm.rank 
                FROM memories_fts bm
                JOIN memories m ON m.id = bm.rowid
                WHERE memories_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            `).all(query, limit);

            // 2. Search Entities (Logs/Events)
            const entityRows = db.prepare(`
                SELECT e.*, ef.rank 
                FROM entities_fts ef
                JOIN entities e ON e.id = ef.rowid
                WHERE entities_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            `).all(query, limit);

            const results = [
                ...memoryRows.map(row => {
                    const meta = row.metadata_json ? JSON.parse(row.metadata_json) : {};
                    const [key, ...valParts] = row.content.split(':');
                    return {
                        id: `mem_${row.id}`,
                        source: 'MEMORY',
                        key: key.trim(),
                        value: valParts.join(':').trim(),
                        category: meta.category || 'FACT',
                        timestamp: row.created_at,
                        score: 1.0 - (row.rank || 0)
                    };
                }),
                ...entityRows.map(row => {
                    return {
                        id: `ent_${row.id}`,
                        source: row.type || 'ENTITY',
                        key: row.name,
                        value: row.description,
                        category: row.type || 'LOG',
                        timestamp: row.last_updated,
                        score: 1.0 - (row.rank || 0)
                    };
                })
            ];

            // Sort by score and limit
            return results.sort((a, b) => b.score - a.score).slice(0, limit);
        } catch (e) {
            console.error('[MEMORY_STORE] FTS5 search failed, falling back to LIKE:', e);
            const rows = db.prepare('SELECT * FROM memories WHERE content LIKE ? LIMIT ?').all(`%${query}%`, limit);
            return rows.map(row => ({
                id: row.id.toString(),
                key: row.content.split(':')[0].trim(),
                value: row.content.substring(row.content.indexOf(':') + 1).trim(),
                category: 'FACT',
                timestamp: row.created_at,
                confidence: 0.5
            }));
        }
    },

    // Search with Vector (In-memory Cosine Similarity for now)
    searchByVector: (targetEmbedding, limit = 5) => {
        const rows = db.prepare('SELECT * FROM memories WHERE embedding_json IS NOT NULL').all();

        const results = rows.map(row => {
            const embedding = JSON.parse(row.embedding_json);
            return {
                ...row,
                similarity: cosineSimilarity(targetEmbedding, embedding)
            };
        });

        // Sort by similarity desc
        results.sort((a, b) => b.similarity - a.similarity);

        // Filter and map to format
        return results
            .filter(r => r.similarity > 0.4)
            .slice(0, limit)
            .map(row => {
                const meta = row.metadata_json ? JSON.parse(row.metadata_json) : {};
                const [key, ...valParts] = row.content.split(':');
                return {
                    id: row.id.toString(),
                    key: key.trim(),
                    value: valParts.join(':').trim(),
                    category: meta.category || 'FACT',
                    timestamp: row.created_at,
                    confidence: row.similarity
                };
            });
    },

    // Save Vector (Called by vector-save endpoint)
    addVector: (data) => {
        const { content, embedding, metadata } = data;

        // Check if memory exists by content (or we could use ID if we synced them better)
        // For now, we treat vector-save as an UPSERT on the memory
        const exists = db.prepare('SELECT id FROM memories WHERE content = ?').get(content);

        if (exists) {
            db.prepare('UPDATE memories SET embedding_json = ? WHERE id = ?').run(JSON.stringify(embedding), exists.id);
        } else {
            db.prepare(`
                INSERT INTO memories (content, type, created_at, embedding_json, metadata_json)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                content,
                'semantic',
                Date.now(),
                JSON.stringify(embedding),
                JSON.stringify(metadata)
            );
        }
    },
    // --- Knowledge Graph Methods ---

    addEntity: (name, type = 'concept', description = '') => {
        const stmt = db.prepare(`
            INSERT INTO entities (name, type, description, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                last_updated = excluded.last_updated,
                description = COALESCE(excluded.description, entities.description)
        `);
        return stmt.run(name, type, description, Date.now());
    },

    addRelationship: (sourceName, relation, targetName, context = {}) => {
        const getEntity = db.prepare('SELECT id FROM entities WHERE name = ?');
        let source = getEntity.get(sourceName);
        let target = getEntity.get(targetName);

        // Auto-create entities if missing
        if (!source) {
            memoryStore.addEntity(sourceName);
            source = getEntity.get(sourceName);
        }
        if (!target) {
            memoryStore.addEntity(targetName);
            target = getEntity.get(targetName);
        }

        const stmt = db.prepare(`
            INSERT INTO relationships (source_id, target_id, relation, created_at, valid_until, context_event_id, weight)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id, target_id, relation) DO UPDATE SET
                weight = excluded.weight,
                created_at = excluded.created_at, -- Update timestamp on re-affirmation
                context_event_id = excluded.context_event_id
        `);

        return stmt.run(
            source.id, 
            target.id, 
            relation, 
            context.timestamp || Date.now(),
            context.validUntil || null,
            context.eventId || null,
            context.weight || 1.0
        );
    },

    getGraph: () => {
        const nodes = db.prepare('SELECT id, name, type FROM entities').all();
        const edges = db.prepare(`
            SELECT r.id, s.name as source, t.name as target, r.relation, r.created_at, r.context_event_id
            FROM relationships r
            JOIN entities s ON r.source_id = s.id
            JOIN entities t ON r.target_id = t.id
        `).all();

        return { nodes, edges };
    },

    /**
     * LANGGRAPH LAYER: Persist Execution Trace
     * Creates an Event Node and links it to the previous event (if any)
     */
    logExecutionEvent: (toolName, args, result, sessionId, previousEventId = null) => {
        const timestamp = Date.now();
        // const eventId = `evt_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
        const eventName = `EXEC_${toolName}_${timestamp}`;

        // 1. Create the Event Node
        memoryStore.addEntity(eventName, 'EVENT', JSON.stringify({
            tool: toolName,
            args: args,
            result: result.substring(0, 200), // Truncate for summary
            sessionId: sessionId
        }));

        // 2. Link to Session (Context)
        if (sessionId) {
            memoryStore.addRelationship(sessionId, 'CONTAINS_EVENT', eventName, { timestamp });
        }

        // 3. Link to Previous Event (Temporal Chain)
        if (previousEventId) {
            // We assume previousEventId is the NAME of the previous node
            memoryStore.addRelationship(previousEventId, 'NEXT_STEP', eventName, { timestamp });
        }

        return eventName;
    }
};

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

function normalizeMemoryText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenSet(text) {
    const normalized = normalizeMemoryText(text);
    if (!normalized) return new Set();
    return new Set(normalized.split(' ').filter(Boolean));
}

function jaccardSimilarity(a, b) {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) {
        if (b.has(token)) intersection += 1;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function computeMemorySimilarity(memoryA, memoryB) {
    const categoryA = String(memoryA.category || '').toLowerCase();
    const categoryB = String(memoryB.category || '').toLowerCase();
    if (categoryA !== categoryB) return 0;

    const keyA = normalizeMemoryText(memoryA.key);
    const keyB = normalizeMemoryText(memoryB.key);
    const valueA = normalizeMemoryText(memoryA.value);
    const valueB = normalizeMemoryText(memoryB.value);

    if (keyA && keyA === keyB && valueA && valueA === valueB) return 1;
    if (valueA && valueB && (valueA.includes(valueB) || valueB.includes(valueA))) {
        return keyA === keyB ? 0.98 : 0.93;
    }

    const keyScore = keyA === keyB ? 1 : jaccardSimilarity(tokenSet(keyA), tokenSet(keyB));
    const valueScore = jaccardSimilarity(tokenSet(valueA), tokenSet(valueB));
    return (keyScore * 0.45) + (valueScore * 0.55);
}

function mergeMemoryNodes(primaryCandidate, secondaryCandidate) {
    let primary = primaryCandidate;
    let secondary = secondaryCandidate;

    if (secondary.confidence > primary.confidence) {
        primary = secondaryCandidate;
        secondary = primaryCandidate;
    } else if (
        secondary.confidence === primary.confidence &&
        secondary.timestamp > primary.timestamp
    ) {
        primary = secondaryCandidate;
        secondary = primaryCandidate;
    }

    let mergedValue = primary.value;
    if (primary.value !== secondary.value) {
        if (primary.value.length < 100 && secondary.value.length < 100) {
            if (primary.value.toLowerCase().includes(secondary.value.toLowerCase())) {
                mergedValue = primary.value;
            } else if (secondary.value.toLowerCase().includes(primary.value.toLowerCase())) {
                mergedValue = secondary.value;
            } else {
                mergedValue = `${primary.value} | ${secondary.value}`;
            }
        } else {
            mergedValue = `${primary.value}\n\n[Also noted: ${secondary.value}]`;
        }
    }

    primaryCandidate.key = primary.key;
    primaryCandidate.value = mergedValue;
    primaryCandidate.category = primary.category;
    primaryCandidate.timestamp = Math.max(primary.timestamp, secondary.timestamp);
    primaryCandidate.confidence = Math.max(primary.confidence, secondary.confidence);
    primaryCandidate.importance = Math.max(primary.importance || 0, secondary.importance || 0);
    primaryCandidate.tenantId = primary.tenantId || secondary.tenantId;
    primaryCandidate.expiresAt = primary.expiresAt || secondary.expiresAt;
}
