import express from 'express';
import db from '../../../../src/services/db.js';
import SecureVault from '../../services/secureVault.js';

const router = express.Router();
const vault = SecureVault;

// --- ADMIN ENROLLMENT ENDPOINT (HARDENED) ---
router.post('/enroll', async (req, res) => {
    const { name, vector } = req.body;
    if (!name || !vector || !Array.isArray(vector)) {
        return res.status(400).json({ error: 'Name and Biometric Vector required' });
    }

    try {
        // 1. Store Vector in Secure Vault (Encrypted at rest)
        await vault.store('admin_face_vector', vector);

        // 2. Update DB
        const existing = db.prepare('SELECT id FROM user_profile LIMIT 1').get();

        if (existing) {
            db.prepare('UPDATE user_profile SET name = ?, face_reference_path = ?, created_at = ? WHERE id = ?')
                .run(name, 'vault:admin_face_vector', Date.now(), existing.id);
        } else {
            db.prepare('INSERT INTO user_profile (name, face_reference_path, created_at) VALUES (?, ?, ?)')
                .run(name, 'vault:admin_face_vector', Date.now());
        }

        console.log(`[ADMIN] Enrolled biometric profile for: ${name}`);
        res.json({ success: true, method: 'descriptor-only' });
    } catch (e) {
        console.error('[ADMIN] Enrollment failed:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- BIOMETRIC VERIFICATION ENDPOINT ---
router.post('/verify', async (req, res) => {
    const { vector } = req.body;
    if (!vector || !Array.isArray(vector)) {
        return res.status(400).json({ error: 'Live Biometric Vector required' });
    }

    try {
        // 1. Retrieve Reference Vector from Vault
        const referenceVector = await vault.retrieve('admin_face_vector');
        if (!referenceVector) {
            return res.status(404).json({ error: 'No reference profile found' });
        }

        // 2. Calculate Similarity (Cosine Similarity for normalized vectors)
        let dotProduct = 0;
        for (let i = 0; i < vector.length; i++) {
            dotProduct += vector[i] * referenceVector[i];
        }

        const threshold = 0.85; // MediaPipe landmark similarity threshold
        const isMatch = dotProduct >= threshold;

        console.log(`[ADMIN] Identity verification: ${isMatch ? 'MATCH' : 'NO_MATCH'} (Score: ${dotProduct.toFixed(4)})`);
        res.json({ success: true, match: isMatch, score: dotProduct });
    } catch (e) {
        console.error('[ADMIN] Verification failed:', e);
        res.status(500).json({ error: e.message });
    }
});

// Voice enrollment follows the same vector-only pattern
router.post('/enroll-voice', async (req, res) => {
    const { vector } = req.body;
    if (!vector || !Array.isArray(vector)) {
        return res.status(400).json({ error: 'Voice Biometric Vector required' });
    }

    try {
        await vault.store('admin_voice_vector', vector);
        
        const existing = db.prepare('SELECT id FROM user_profile LIMIT 1').get();
        if (existing) {
            db.prepare('UPDATE user_profile SET voice_reference_path = ? WHERE id = ?')
                .run('vault:admin_voice_vector', existing.id);
        }

        res.json({ success: true, method: 'voice-descriptor-only' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/verify-voice', async (req, res) => {
    const { vector } = req.body;
    try {
        const referenceVector = await vault.retrieve('admin_voice_vector');
        if (!referenceVector) return res.status(404).json({ error: 'No voice profile' });

        let dotProduct = 0;
        for (let i = 0; i < vector.length; i++) {
            dotProduct += vector[i] * referenceVector[i];
        }

        res.json({ success: true, match: dotProduct >= 0.8 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
