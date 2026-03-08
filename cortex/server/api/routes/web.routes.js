import express from 'express';
import { webSurferService } from '../../services/webSurferService.js';
import { socketService } from '../../services/socketService.js';
import { goalStore } from '../../services/goalStore.js';

const router = express.Router();

router.get('/state', async (req, res) => {
    const { sessionId } = req.query;
    try {
        if (!sessionId) {
            // If no sessionId, return a default "idle" state or last known state
            return res.json({ state: { active: false, reasoning: "Waiting for goal..." } });
        }

        const state = goalStore.getState(sessionId);
        const goal = goalStore.getGoal(sessionId);
        
        // Map goalStore state to GhostBrowser expected format
        const responseData = {
            state: {
                ...state,
                active: goal ? (goal.status === 'IN_PROGRESS') : false,
                reasoning: state.memory && state.memory.length > 0 
                  ? state.memory[state.memory.length - 1].content 
                  : state.lastAction 
                    ? `Executing ${state.lastAction}...` 
                    : "Strategizing next steps...",
                iteration: state.step || 0,
                maxIterations: 20 // Default limit for safety visualization
            }
        };

        res.json(responseData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/reasoning', async (req, res) => {
    const { sessionId, reasoning } = req.body;
    try {
        if (!sessionId || !reasoning) {
            return res.status(400).json({ error: "sessionId and reasoning required" });
        }

        // Add to goalStore memory so it persists and shows up in poller
        goalStore.addMemory(sessionId, reasoning);
        
        // Also update the general state to reflect last action
        goalStore.updateState(sessionId, {
            lastAction: "VERIFICATION",
            lastUpdate: Date.now()
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/launch', async (req, res) => {
    const { url } = req.body;
    try {
        if (!url) return res.status(400).json({ error: "URL required" });
        
        // Trigger Frontend Mode Switch via Socket
        // We broadcast to 'desktop' room or all clients
        const io = socketService.getIO();
        if (io) {
            io.emit('ui:mode', { mode: 'BROWSER', url });
            res.json({ success: true, message: `Launched ${url} in Ghost Browser` });
        } else {
            res.status(503).json({ error: "Socket service not available" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/browse', async (req, res) => {
    const { url } = req.body;
    try {
        if (!url) return res.status(400).json({ error: "URL required" });
        const result = await webSurferService.browse(url);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/click', async (req, res) => {
    const { selector } = req.body;
    try {
        const result = await webSurferService.click(selector);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/type', async (req, res) => {
    const { selector, text } = req.body;
    try {
        const result = await webSurferService.type(selector, text);
        res.json(result);
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

export default router;
