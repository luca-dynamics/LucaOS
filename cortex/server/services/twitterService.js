import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getLucaBrowserProfilePath, getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'twitter');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');
const TWITTER_URL = 'https://x.com';

class TwitterService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.status = 'OFFLINE';
        this.lastError = null;
        this.startTime = 0;
        this.usingChromeProfile = false;
        
        // Ensure profile directory exists
        if (!fs.existsSync(PROFILE_DIR)) {
            fs.mkdirSync(PROFILE_DIR, { recursive: true });
        }
    }

    /**
     * Check if Chrome profile with Twitter/X sessions is available
     */
    hasChromeProfile() {
        const chromePath = getLucaBrowserProfilePath();
        if (!chromePath) return false;
        
        // High-fidelity check for Twitter/X data
        const markers = [
            path.join(chromePath, 'IndexedDB', 'https_twitter.com_0.indexeddb.leveldb'),
            path.join(chromePath, 'IndexedDB', 'https_x.com_0.indexeddb.leveldb')
        ];

        return fs.existsSync(markers[0]) || fs.existsSync(markers[1]);
    }

    /**
     * Get current service status
     */
    getStatus() {
        const importStatus = getImportStatus();
        return {
            status: this.status,
            hasSession: fs.existsSync(COOKIES_FILE) || this.hasChromeProfile(),
            hasChromeProfile: this.hasChromeProfile(),
            chromeImportDate: importStatus.imported ? importStatus.lastSync : null,
            usingChromeProfile: this.usingChromeProfile,
            lastError: this.lastError,
            uptime: this.startTime > 0 ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Load saved cookies into the browser context
     */
    async loadCookies() {
        if (fs.existsSync(COOKIES_FILE)) {
            try {
                const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
                if (this.context && cookies.length > 0) {
                    await this.context.addCookies(cookies);
                    console.log(`[TWITTER] Loaded ${cookies.length} cookies`);
                    return true;
                }
            } catch (e) {
                console.error('[TWITTER] Failed to load cookies:', e.message);
            }
        }
        return false;
    }

    /**
     * Save current cookies to disk
     */
    async saveCookies() {
        if (this.context) {
            try {
                const cookies = await this.context.cookies();
                fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
                console.log(`[TWITTER] Saved ${cookies.length} cookies`);
            } catch (e) {
                console.error('[TWITTER] Failed to save cookies:', e.message);
            }
        }
    }

    /**
     * Initialize browser for login (visible mode)
     * Returns when user closes browser or completes login
     */
    async startLoginSession() {
        try {
            this.status = 'LOGGING_IN';
            
            this.page = await socialBrowserEngine.getPage('twitter', { headless: false });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            await this.page.goto(TWITTER_URL, { waitUntil: 'domcontentloaded' });
            
            console.log('[TWITTER] Login browser opened. Waiting for user to authenticate...');
            
            // Wait for login completion (detect home timeline)
            await this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 300000 }); // 5 min timeout
            
            // Save cookies after successful login
            await this.saveCookies();
            this.status = 'READY';
            this.startTime = Date.now();
            
            console.log('[TWITTER] Login successful!');
            return { success: true };
            
        } catch (e) {
            this.lastError = e.message;
            if (e.message.includes('timeout')) {
                this.status = 'LOGIN_TIMEOUT';
            } else {
                this.status = 'ERROR';
            }
            console.error('[TWITTER] Login failed:', e.message);
            await this.cleanup();
            return { success: false, error: e.message };
        }
    }

    /**
     * Initialize headless browser with saved session
     * Priority: 1) Imported Chrome profile 2) Saved Twitter cookies
     */
    async initHeadless() {
        if (this.status === 'READY' && this.page && !this.page.isClosed()) {
            return true; // Already initialized
        }
        
        const hasChromeProfile = this.hasChromeProfile();
        const hasLocalCookies = fs.existsSync(COOKIES_FILE);
        
        if (!hasChromeProfile && !hasLocalCookies) {
            this.status = 'NO_SESSION';
            return false;
        }
        
        try {
            this.status = 'CONNECTING';
            
            this.page = await socialBrowserEngine.getPage('twitter', { headless: true });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }
            
            // Navigate and verify session
            await this.page.goto(TWITTER_URL, { waitUntil: 'domcontentloaded' });
            
            // Check if we're logged in
            try {
                await this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });
                this.status = 'READY';
                this.startTime = Date.now();
                console.log(`[TWITTER] Headless session ready (Chrome Profile: ${this.usingChromeProfile})`);
                return true;
            } catch {
                // Session expired or not logged in
                this.status = hasChromeProfile ? 'CHROME_NOT_LOGGED_IN' : 'SESSION_EXPIRED';
                console.warn(`[TWITTER] Not logged in. Status: ${this.status}`);
                await this.cleanup();
                return false;
            }
            
        } catch (e) {
            this.lastError = e.message;
            this.status = 'ERROR';
            console.error('[TWITTER] Headless init failed:', e.message);
            await this.cleanup();
            return false;
        }
    }

    /**
     * Post a tweet
     */
    async postTweet(text, imagePath = null) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready. Please login first.' };
        }
        
        try {
            // Navigate to compose
            await this.page.goto('https://x.com/compose/tweet', { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
            
            // Type the tweet
            await this.page.click('[data-testid="tweetTextarea_0"]');
            await this.page.keyboard.type(text, { delay: 50 });
            
            // Handle image if provided
            if (imagePath && fs.existsSync(imagePath)) {
                const fileInput = await this.page.$('input[type="file"][accept*="image"]');
                if (fileInput) {
                    await fileInput.setInputFiles(imagePath);
                    await this.page.waitForTimeout(2000); // Wait for upload
                }
            }
            
            // Click post button
            await this.page.click('[data-testid="tweetButton"]');
            await this.page.waitForTimeout(3000); // Wait for post
            
            console.log('[TWITTER] Tweet posted successfully');
            return { success: true, message: 'Tweet posted!' };
            
        } catch (e) {
            console.error('[TWITTER] Post failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Read home timeline
     */
    async readTimeline(count = 10) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready. Please login first.' };
        }
        
        try {
            await this.page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
            
            // Scroll to load more tweets
            for (let i = 0; i < 3; i++) {
                socialBrowserEngine.keepAlive();
                await this.page.evaluate(() => window.scrollBy(0, 500));
                await this.page.waitForTimeout(500);
            }
            
            // Extract tweets
            const tweets = await this.page.evaluate((maxCount) => {
                const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
                const results = [];
                
                for (let i = 0; i < Math.min(tweetElements.length, maxCount); i++) {
                    const tweet = tweetElements[i];
                    try {
                        const userElement = tweet.querySelector('[data-testid="User-Name"]');
                        const textElement = tweet.querySelector('[data-testid="tweetText"]');
                        const timeElement = tweet.querySelector('time');
                        
                        results.push({
                            author: userElement?.innerText?.split('\n')[0] || 'Unknown',
                            handle: userElement?.innerText?.split('\n')[1] || '',
                            text: textElement?.innerText || '',
                            time: timeElement?.getAttribute('datetime') || '',
                            hasMedia: !!tweet.querySelector('[data-testid="tweetPhoto"]')
                        });
                    } catch {
                        // Skip malformed tweets
                    }
                }
                
                return results;
            }, count);
            
            console.log(`[TWITTER] Read ${tweets.length} tweets`);
            return { success: true, tweets };
            
        } catch (e) {
            console.error('[TWITTER] Timeline read failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Like a tweet by navigating to it or finding it in timeline
     */
    async likeTweet(tweetUrl) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            await this.page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="like"]', { timeout: 10000 });
            await this.page.click('[data-testid="like"]');
            await this.page.waitForTimeout(1000);
            
            console.log('[TWITTER] Tweet liked');
            return { success: true, message: 'Tweet liked!' };
            
        } catch (e) {
            console.error('[TWITTER] Like failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Reply to a tweet
     */
    async replyToTweet(tweetUrl, replyText) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            await this.page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="reply"]', { timeout: 10000 });
            await this.page.click('[data-testid="reply"]');
            
            await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 5000 });
            await this.page.click('[data-testid="tweetTextarea_0"]');
            await this.page.keyboard.type(replyText, { delay: 50 });
            
            await this.page.click('[data-testid="tweetButton"]');
            await this.page.waitForTimeout(3000);
            
            console.log('[TWITTER] Reply posted');
            return { success: true, message: 'Reply posted!' };
            
        } catch (e) {
            console.error('[TWITTER] Reply failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Retweet a tweet
     */
    async retweet(tweetUrl) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            await this.page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="retweet"]', { timeout: 10000 });
            await this.page.click('[data-testid="retweet"]');
            
            await this.page.waitForSelector('[data-testid="retweetConfirm"]', { timeout: 5000 });
            await this.page.click('[data-testid="retweetConfirm"]');
            await this.page.waitForTimeout(1000);
            
            console.log('[TWITTER] Retweeted successfully');
            return { success: true, message: 'Retweeted!' };
            
        } catch (e) {
            console.error('[TWITTER] Retweet failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Quote tweet with comment
     */
    async quoteTweet(tweetUrl, text) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            await this.page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="retweet"]', { timeout: 10000 });
            await this.page.click('[data-testid="retweet"]');
            
            // Choose "Quote" from the menu
            await this.page.waitForSelector('a[href*="/compose/tweet"]', { timeout: 5000 });
            await this.page.click('a[href*="/compose/tweet"]');
            
            await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 5000 });
            await this.page.click('[data-testid="tweetTextarea_0"]');
            await this.page.keyboard.type(text, { delay: 50 });
            
            await this.page.click('[data-testid="tweetButton"]');
            await this.page.waitForTimeout(3000);
            
            console.log('[TWITTER] Quote tweet posted');
            return { success: true, message: 'Quote tweet posted!' };
            
        } catch (e) {
            console.error('[TWITTER] Quote tweet failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Follow a user
     */
    async followUser(username) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            const handle = username.startsWith('@') ? username.substring(1) : username;
            await this.page.goto(`https://x.com/${handle}`, { waitUntil: 'domcontentloaded' });
            
            // Look for follow button - try multiple possible selectors
            const followSelector = '[data-testid$="-follow"]';
            await this.page.waitForSelector(followSelector, { timeout: 10000 });
            
            const btnText = await this.page.innerText(followSelector);
            if (btnText.toLowerCase().includes('following')) {
                return { success: true, message: 'Already following user.' };
            }
            
            await this.page.click(followSelector);
            await this.page.waitForTimeout(1000);
            
            console.log(`[TWITTER] Followed @${handle}`);
            return { success: true, message: `Followed @${handle}!` };
            
        } catch (e) {
            console.error('[TWITTER] Follow failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Unfollow a user
     */
    async unfollowUser(username) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            const handle = username.startsWith('@') ? username.substring(1) : username;
            await this.page.goto(`https://x.com/${handle}`, { waitUntil: 'domcontentloaded' });
            
            const followSelector = '[data-testid$="-unfollow"], [data-testid$="-follow"]';
            await this.page.waitForSelector(followSelector, { timeout: 10000 });
            
            const btnText = await this.page.innerText(followSelector);
            if (!btnText.toLowerCase().includes('following')) {
                return { success: true, message: 'Not following user.' };
            }
            
            await this.page.click(followSelector);
            // Wait for confirmation dialog if it appears
            try {
                await this.page.waitForSelector('[data-testid="confirmationSheetConfirm"]', { timeout: 3000 });
                await this.page.click('[data-testid="confirmationSheetConfirm"]');
            } catch {
                // No confirmation sheet
            }
            
            await this.page.waitForTimeout(1000);
            
            console.log(`[TWITTER] Unfollowed @${handle}`);
            return { success: true, message: `Unfollowed @${handle}!` };
            
        } catch (e) {
            console.error('[TWITTER] Unfollow failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Send a Direct Message
     */
    async sendDM(username, message) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            const handle = username.startsWith('@') ? username.substring(1) : username;
            await this.page.goto(`https://x.com/messages/compose?recipient_id=${handle}`, { waitUntil: 'domcontentloaded' });
            
            // Note: recipient_id can be a handle for some URLs or requires a numerical ID
            // If the above doesn't work, we navigate to profile and click message icon
            try {
                await this.page.waitForSelector('[data-testid="dmCompoundMessageTextarea"]', { timeout: 5000 });
            } catch {
                await this.page.goto(`https://x.com/${handle}`, { waitUntil: 'domcontentloaded' });
                await this.page.waitForSelector('[data-testid="sendDMFromProfile"]', { timeout: 5000 });
                await this.page.click('[data-testid="sendDMFromProfile"]');
                await this.page.waitForSelector('[data-testid="dmCompoundMessageTextarea"]', { timeout: 5000 });
            }
            
            await this.page.fill('[data-testid="dmCompoundMessageTextarea"]', message);
            await this.page.click('[data-testid="dmComposerSendButton"]');
            await this.page.waitForTimeout(1000);
            return { success: true, message: `DM sent to @${handle}!` };
            
        } catch (e) {
            console.error('[TWITTER] DM failed:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Search tweets
     */
    async searchTweets(query, count = 10) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=top`;
            await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
            
            // Extract tweets (reuse timeline logic)
            const tweets = await this.page.evaluate((maxCount) => {
                const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
                const results = [];
                for (let i = 0; i < Math.min(tweetElements.length, maxCount); i++) {
                    const tweet = tweetElements[i];
                    try {
                        const userElement = tweet.querySelector('[data-testid="User-Name"]');
                        const textElement = tweet.querySelector('[data-testid="tweetText"]');
                        results.push({
                            author: userElement?.innerText?.split('\n')[0] || 'Unknown',
                            handle: userElement?.innerText?.split('\n')[1] || '',
                            text: textElement?.innerText || ''
                        });
                    } catch {
                        // Skip malformed tweets
                    }
                }
                return results;
            }, count);
            
            return { success: true, results: tweets };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get trending topics
     */
    async getTrending() {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Twitter session not ready.' };
        }
        
        try {
            await this.page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[data-testid="trend"]', { timeout: 10000 });
            
            const trends = await this.page.evaluate(() => {
                const trendElements = document.querySelectorAll('[data-testid="trend"]');
                return Array.from(trendElements).map(el => el.innerText.replace(/\n/g, ' '));
            });
            
            return { success: true, trends };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Ensure browser is ready
     */
    async ensureReady() {
        socialBrowserEngine.keepAlive();
        if (this.status === 'READY' && this.page && !this.page.isClosed()) {
            return true;
        }
        return await this.initHeadless();
    }

    /**
     * Logout and clear session
     */
    async logout() {
        try {
            if (fs.existsSync(COOKIES_FILE)) {
                fs.unlinkSync(COOKIES_FILE);
            }
            await this.cleanup();
            this.status = 'OFFLINE';
            console.log('[TWITTER] Logged out');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Cleanup browser resources
     */
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close().catch(() => {});
                this.page = null;
            }
        } catch {
            // Ignore
        }
    }
}

export const twitterService = new TwitterService();
