import express from 'express';
import { PersonaManager } from '../../../../services/PersonaManager.js';

const router = express.Router();
const manager = PersonaManager.getInstance();

// GET all persona settings
router.get('/', (req, res) => {
    try {
        const config = manager.getRawConfig();
        if (!config) {
            return res.status(500).json({ error: "Persona configuration not loaded." });
        }
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST update persona settings
router.post('/', (req, res) => {
    try {
        const newConfig = req.body;
        
        // Basic validation: Check if personas object exists
        if (!newConfig.personas) {
             return res.status(400).json({ error: "Invalid configuration format. Missing 'personas' object." });
        }

        // Save via Manager (which writes to disk)
        manager.saveConfig(newConfig);
        
        // Reload to ensure memory state is fresh
        manager.loadConfig();

        res.json({ success: true, message: "Persona settings saved." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET list of available personas (metadata only)
router.get('/list', (req, res) => {
    try {
        const config = manager.getRawConfig();
        if (!config || !config.personas) return res.json([]);
        
        const list = Object.keys(config.personas).map(key => ({
            id: key,
            ...config.personas[key]
        }));
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
