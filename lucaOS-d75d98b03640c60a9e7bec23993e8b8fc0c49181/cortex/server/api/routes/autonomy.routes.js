import express from 'express';
import { goalScheduler } from '../../services/goalScheduler.js';

const router = express.Router();

/**
 * GOD MODE: START AUTONOMY
 * Enables background goal execution
 */
router.post('/start', (req, res) => {
    try {
        const { settings } = req.body;
        goalScheduler.startAutonomy(settings);
        res.json({ success: true, status: goalScheduler.getStatus() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GOD MODE: STOP AUTONOMY
 * Disables all background execution
 */
router.post('/stop', (req, res) => {
    try {
        goalScheduler.stopAutonomy();
        res.json({ success: true, status: goalScheduler.getStatus() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * CHECK STATUS
 */
router.get('/status', (req, res) => {
    try {
        res.json(goalScheduler.getStatus());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
