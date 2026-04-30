/**
 * Discord API Routes
 */

import express from 'express';
import { discordService } from '../../services/discordService.js';

const router = express.Router();

router.get('/status', (req, res) => {
    res.json(discordService.getStatus());
});

router.post('/login', async (req, res) => {
    try {
        discordService.startLoginSession().then(result => {
            console.log('[DISCORD API] Login session completed:', result);
        }).catch(err => {
            console.error('[DISCORD API] Login session error:', err);
        });
        
        res.json({ success: true, message: 'Login browser opened.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const result = await discordService.logout();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/send', async (req, res) => {
    const { channelId, message } = req.body;
    
    if (!channelId || !message) {
        return res.status(400).json({ success: false, error: 'Channel ID and message required' });
    }
    
    try {
        const result = await discordService.sendMessage(channelId, message);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/messages', async (req, res) => {
    const { channelId, count } = req.query;
    
    if (!channelId) {
        return res.status(400).json({ success: false, error: 'Channel ID required' });
    }
    
    try {
        const result = await discordService.readMessages(channelId, parseInt(count) || 20);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/servers', async (req, res) => {
    try {
        const result = await discordService.listServers();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
