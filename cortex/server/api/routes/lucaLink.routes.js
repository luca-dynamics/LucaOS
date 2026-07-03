import express from 'express';
import { socketService } from '../../services/socketService.js';
import { lucaLinkManager } from '../../../../src/services/lucaLinkManager.server.js';
import { WS_PORT } from '../../config/constants.js';

const router = express.Router();

/**
 * POST /api/luca-link/start
 * Start the Luca Link socket server (on-demand)
 */
router.post('/start', (req, res) => {
    try {
        if (socketService.isRunning()) {
            return res.json({ success: true, message: 'Luca Link already running', status: 'running' });
        }

        socketService.initialize();
        res.json({ success: true, message: 'Luca Link server started', status: 'running' });
    } catch (error) {
        console.error('[LUCA_LINK] Failed to start:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/luca-link/stop
 * Stop the Luca Link socket server
 */
router.post('/stop', (req, res) => {
    try {
        if (!socketService.isRunning()) {
            return res.json({ success: true, message: 'Luca Link already stopped', status: 'stopped' });
        }

        socketService.shutdown();
        res.json({ success: true, message: 'Luca Link server stopped', status: 'stopped' });
    } catch (error) {
        console.error('[LUCA_LINK] Failed to stop:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/luca-link/pairing-token
 * Mint a short-lived pairing token (5 min) the mobile companion must present.
 * Requires X-LUCA-TOKEN like every non-public API route.
 */
router.post('/pairing-token', (req, res) => {
    try {
        if (!socketService.isRunning()) {
            socketService.initialize();
        }
        const token = lucaLinkManager.generateToken();
        res.json({ success: true, token, wsPort: WS_PORT });
    } catch (error) {
        console.error('[LUCA_LINK] Failed to mint pairing token:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/luca-link/status
 * Get the current status of the Luca Link socket server
 */
router.get('/status', (req, res) => {
    const isRunning = socketService.isRunning();
    res.json({
        status: isRunning ? 'running' : 'stopped',
        port: isRunning ? WS_PORT : null
    });
});

export default router;
