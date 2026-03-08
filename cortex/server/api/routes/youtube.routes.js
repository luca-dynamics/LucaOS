/**
 * YouTube API Routes
 */

import express from 'express';
import { youtubeService } from '../../services/youtubeService.js';

const router = express.Router();

router.get('/status', (req, res) => {
    res.json(youtubeService.getStatus());
});

router.post('/login', async (req, res) => {
    try {
        youtubeService.startLoginSession().then(result => {
            console.log('[YOUTUBE API] Login session completed:', result);
        }).catch(err => {
            console.error('[YOUTUBE API] Login session error:', err);
        });
        
        res.json({ success: true, message: 'Login browser opened.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const result = await youtubeService.logout();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/search', async (req, res) => {
    const { query, count } = req.query;
    
    if (!query) {
        return res.status(400).json({ success: false, error: 'Search query required' });
    }
    
    try {
        const result = await youtubeService.searchVideos(query, parseInt(count) || 10);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/subscriptions', async (req, res) => {
    const count = parseInt(req.query.count) || 20;
    
    try {
        const result = await youtubeService.getSubscriptions(count);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/like', async (req, res) => {
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
        return res.status(400).json({ success: false, error: 'Video URL required' });
    }
    
    try {
        const result = await youtubeService.likeVideo(videoUrl);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/comment', async (req, res) => {
    const { videoUrl, comment } = req.body;
    
    if (!videoUrl || !comment) {
        return res.status(400).json({ success: false, error: 'Video URL and comment required' });
    }
    
    try {
        const result = await youtubeService.commentOnVideo(videoUrl, comment);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
