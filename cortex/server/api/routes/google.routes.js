import express from 'express';
import { googleService } from '../../services/googleService.js';

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const status = await googleService.getStatus();
        res.json(status);
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: e.message });
    }
});

router.get('/auth/url', (req, res) => {
    try {
        const url = googleService.getAuthUrl();
        res.json({ url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    console.log('[GOOGLE] Auth Callback received. Code:', code ? 'PRESENT' : 'MISSING');
    if (!code) {
        return res.status(400).send('<h1>Auth Error</h1><p>Missing authorization code.</p>');
    }
    try {
        console.log('[GOOGLE] Handling callback...');
        await googleService.handleCallback(code);
        console.log('[GOOGLE] Callback handled successfully.');
        res.send('<h1>Authentication Successful</h1><p>You can close this window now and return to Luca.</p><script>setTimeout(() => window.close(), 3000)</script>');
    } catch (e) {
        console.error('[GOOGLE] Callback Error:', e.message);
        res.status(500).send(`<h1>Auth Error</h1><p>${e.message}</p>`);
    }
});

router.post('/execute', async (req, res) => {
    const { tool, args } = req.body;
    try {
        const result = await googleService.executeTool(tool, args);
        res.json({ result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
