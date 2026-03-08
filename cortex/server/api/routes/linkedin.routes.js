/**
 * LinkedIn API Routes
 */

import express from 'express';
import { linkedinService } from '../../services/linkedinService.js';

const router = express.Router();

router.get('/status', (req, res) => {
    res.json(linkedinService.getStatus());
});

router.post('/login', async (req, res) => {
    try {
        linkedinService.startLoginSession().then(result => {
            console.log('[LINKEDIN API] Login session completed:', result);
        }).catch(err => {
            console.error('[LINKEDIN API] Login session error:', err);
        });
        
        res.json({ success: true, message: 'Login browser opened.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const result = await linkedinService.logout();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/post', async (req, res) => {
    const { content, imagePath } = req.body;
    
    if (!content) {
        return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    try {
        const result = await linkedinService.createPost(content, imagePath);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/feed', async (req, res) => {
    const count = parseInt(req.query.count) || 10;
    
    try {
        const result = await linkedinService.readFeed(count);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/like', async (req, res) => {
    const { postUrl } = req.body;
    
    if (!postUrl) {
        return res.status(400).json({ success: false, error: 'Post URL is required' });
    }
    
    try {
        const result = await linkedinService.likePost(postUrl);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/comment', async (req, res) => {
    const { postUrl, comment } = req.body;
    
    if (!postUrl || !comment) {
        return res.status(400).json({ success: false, error: 'Post URL and comment are required' });
    }
    
    try {
        const result = await linkedinService.commentOnPost(postUrl, comment);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/connect', async (req, res) => {
    const { profileUrl, message } = req.body;
    if (!profileUrl) return res.status(400).json({ success: false, error: 'Profile URL is required' });
    try {
        const result = await linkedinService.sendConnectionRequest(profileUrl, message);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/jobs', async (req, res) => {
    const { keywords, location } = req.query;
    if (!keywords) return res.status(400).json({ success: false, error: 'Keywords are required' });
    try {
        const result = await linkedinService.searchJobs(keywords, location || '');
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/message', async (req, res) => {
    const { profileUrl, message } = req.body;
    if (!profileUrl || !message) return res.status(400).json({ success: false, error: 'Profile URL and message are required' });
    try {
        const result = await linkedinService.sendMessage(profileUrl, message);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/messages', async (req, res) => {
    try {
        const result = await linkedinService.readMessages();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/profile', async (req, res) => {
    const { profileUrl } = req.query;
    if (!profileUrl) return res.status(400).json({ success: false, error: 'Profile URL is required' });
    try {
        const result = await linkedinService.viewProfile(profileUrl);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
