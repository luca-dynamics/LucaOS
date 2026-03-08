/**
 * Instagram API Routes
 */

import express from 'express';
import { instagramService } from '../../services/instagramService.js';

const router = express.Router();

router.get('/status', (req, res) => {
    res.json(instagramService.getStatus());
});

router.post('/login', async (req, res) => {
    try {
        instagramService.startLoginSession().then(result => {
            console.log('[INSTAGRAM API] Login session completed:', result);
        }).catch(err => {
            console.error('[INSTAGRAM API] Login session error:', err);
        });
        
        res.json({ success: true, message: 'Login browser opened.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const result = await instagramService.logout();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/post', async (req, res) => {
    const { caption, imagePath } = req.body;
    
    if (!caption) {
        return res.status(400).json({ success: false, error: 'Caption is required' });
    }
    
    try {
        const result = await instagramService.postContent(caption, imagePath);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/feed', async (req, res) => {
    const count = parseInt(req.query.count) || 10;
    
    try {
        const result = await instagramService.readFeed(count);
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
        const result = await instagramService.likePost(postUrl);
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
        const result = await instagramService.commentOnPost(postUrl, comment);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/story', async (req, res) => {
    const { imagePath } = req.body;
    if (!imagePath) return res.status(400).json({ success: false, error: 'Image path is required' });
    try {
        const result = await instagramService.postStory(imagePath);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/stories', async (req, res) => {
    try {
        const result = await instagramService.getStories();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/follow', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username is required' });
    try {
        const result = await instagramService.followUser(username);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/unfollow', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username is required' });
    try {
        const result = await instagramService.unfollowUser(username);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/dm', async (req, res) => {
    const { username, message } = req.body;
    if (!username || !message) return res.status(400).json({ success: false, error: 'Username and message are required' });
    try {
        const result = await instagramService.sendDM(username, message);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/dms', async (req, res) => {
    try {
        const result = await instagramService.readDMs();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/explore', async (req, res) => {
    try {
        const result = await instagramService.exploreContent();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/stats', async (req, res) => {
    const { username } = req.query;
    try {
        const result = await instagramService.getProfileStats(username || 'me');
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
