import express from 'express';
import { sandboxService } from '../../services/sandboxService.js';

const router = express.Router();

// Stateful Node.js execution
router.post('/execute', async (req, res) => {
    const { script } = req.body;

    if (!script) {
        return res.status(400).json({ error: "Missing script content." });
    }

    try {
        const resultJSON = await sandboxService.executeNode(script);

        try {
            const parsed = typeof resultJSON === 'string' ? JSON.parse(resultJSON) : resultJSON;
            res.json(parsed);
        } catch (parseError) {
             res.json({ result: resultJSON, error: null });
        }
        
    } catch (error) {
        console.error("Node.js Execution Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Optionally manually reset the Node.js sandbox
router.post('/reset', (req, res) => {
    try {
        sandboxService.reset(); // This resets both Python and Node
        res.json({ success: true, message: "Sandbox environments reset." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
