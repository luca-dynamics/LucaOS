/**
 * Twitter API Routes
 * Exposes Twitter service functionality via REST endpoints
 */

import express from 'express';
import { twitterService } from '../../services/twitterService.js';

const router = express.Router();

/**
 * GET /api/twitter/status
 * Check Twitter connection status
 */
router.get('/status', (req, res) => {
    const status = twitterService.getStatus();
    res.json(status);
});

/**
 * GET /api/twitter/auth/url
 * Get the Twitter login URL for internal browser
 */
router.get('/auth/url', (req, res) => {
    res.json({ url: 'https://x.com/i/flow/login' });
});

/**
 * POST /api/twitter/login
 * Start a visible browser session for user login
 */
router.post('/login', async (req, res) => {
    try {
        // Start login in background (don't await - it waits for user)
        twitterService.startLoginSession().then(result => {
            console.log('[TWITTER API] Login session completed:', result);
        }).catch(err => {
            console.error('[TWITTER API] Login session error:', err);
        });
        
        res.json({ 
            success: true, 
            message: 'Login browser opened. Please authenticate in the browser window.' 
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/logout
 * Clear saved session
 */
router.post('/logout', async (req, res) => {
    try {
        const result = await twitterService.logout();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/post
 * Post a new tweet
 * Body: { text: string, imagePath?: string }
 */
router.post('/post', async (req, res) => {
    const { text, imagePath } = req.body;
    
    if (!text) {
        return res.status(400).json({ success: false, error: 'Tweet text is required' });
    }
    
    try {
        const result = await twitterService.postTweet(text, imagePath);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/twitter/timeline
 * Read home timeline
 * Query: count (optional, default 10)
 */
router.get('/timeline', async (req, res) => {
    const count = parseInt(req.query.count) || 10;
    
    try {
        const result = await twitterService.readTimeline(count);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/like
 * Like a tweet
 * Body: { tweetUrl: string }
 */
router.post('/like', async (req, res) => {
    const { tweetUrl } = req.body;
    
    if (!tweetUrl) {
        return res.status(400).json({ success: false, error: 'Tweet URL is required' });
    }
    
    try {
        const result = await twitterService.likeTweet(tweetUrl);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/retweet
 * Retweet a tweet
 * Body: { tweetUrl: string }
 */
router.post('/retweet', async (req, res) => {
    const { tweetUrl } = req.body;
    if (!tweetUrl) return res.status(400).json({ success: false, error: 'Tweet URL is required' });
    try {
        const result = await twitterService.retweet(tweetUrl);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/quote
 * Quote tweet
 * Body: { tweetUrl: string, text: string }
 */
router.post('/quote', async (req, res) => {
    const { tweetUrl, text } = req.body;
    if (!tweetUrl || !text) return res.status(400).json({ success: false, error: 'Tweet URL and text are required' });
    try {
        const result = await twitterService.quoteTweet(tweetUrl, text);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/follow
 * Follow a user
 * Body: { username: string }
 */
router.post('/follow', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username is required' });
    try {
        const result = await twitterService.followUser(username);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/unfollow
 * Unfollow a user
 * Body: { username: string }
 */
router.post('/unfollow', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username is required' });
    try {
        const result = await twitterService.unfollowUser(username);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/twitter/dm
 * Send a DM
 * Body: { username: string, message: string }
 */
router.post('/dm', async (req, res) => {
    const { username, message } = req.body;
    if (!username || !message) return res.status(400).json({ success: false, error: 'Username and message are required' });
    try {
        const result = await twitterService.sendDM(username, message);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/twitter/search
 * Search tweets
 * Query: q (query string), count (optional)
 */
router.get('/search', async (req, res) => {
    const { q, count } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Search query (q) is required' });
    try {
        const result = await twitterService.searchTweets(q, parseInt(count) || 10);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/twitter/trending
 * Get trending topics
 */
router.get('/trending', async (req, res) => {
    try {
        const result = await twitterService.getTrending();
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
