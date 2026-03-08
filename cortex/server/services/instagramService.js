import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getLucaBrowserProfilePath, getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'instagram');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');
const INSTAGRAM_URL = 'https://www.instagram.com';

class InstagramService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.status = 'OFFLINE';
        this.lastError = null;
        this.startTime = 0;
        this.usingChromeProfile = false;
        
        if (!fs.existsSync(PROFILE_DIR)) {
            fs.mkdirSync(PROFILE_DIR, { recursive: true });
        }
    }

    hasChromeProfile() {
        const chromePath = getLucaBrowserProfilePath();
        if (!chromePath) return false;
        
        // High-fidelity check for Instagram data
        const marker = path.join(chromePath, 'IndexedDB', 'https_www.instagram.com_0.indexeddb.leveldb');
        return fs.existsSync(marker);
    }

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

    async loadCookies() {
        if (fs.existsSync(COOKIES_FILE)) {
            try {
                const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
                if (this.context && cookies.length > 0) {
                    await this.context.addCookies(cookies);
                    return true;
                }
            } catch (e) {
                console.error('[INSTAGRAM] Failed to load cookies:', e.message);
            }
        }
        return false;
    }

    async saveCookies() {
        if (this.context) {
            try {
                const cookies = await this.context.cookies();
                fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
            } catch (e) {
                console.error('[INSTAGRAM] Failed to save cookies:', e.message);
            }
        }
    }

    async startLoginSession() {
        try {
            this.status = 'LOGGING_IN';
            
            this.page = await socialBrowserEngine.getPage('instagram', { headless: false });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            await this.page.goto(INSTAGRAM_URL, { waitUntil: 'domcontentloaded' });
            
            // Wait for successful login (detect home feed)
            await this.page.waitForSelector('svg[aria-label="Home"]', { timeout: 300000 });
            
            await this.saveCookies();
            this.status = 'READY';
            this.startTime = Date.now();
            
            return { success: true };
        } catch (e) {
            this.lastError = e.message;
            this.status = e.message.includes('timeout') ? 'LOGIN_TIMEOUT' : 'ERROR';
            await this.cleanup();
            return { success: false, error: e.message };
        }
    }

    async initHeadless() {
        if (this.status === 'READY' && this.page) return true;
        
        const hasChromeProfile = this.hasChromeProfile();
        const hasLocalCookies = fs.existsSync(COOKIES_FILE);
        
        if (!hasChromeProfile && !hasLocalCookies) {
            this.status = 'NO_SESSION';
            return false;
        }
        
        try {
            this.status = 'CONNECTING';
            
            this.page = await socialBrowserEngine.getPage('instagram', { headless: true });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }
            
            await this.page.goto(INSTAGRAM_URL, { waitUntil: 'domcontentloaded' });
            
            try {
                await this.page.waitForSelector('svg[aria-label="Home"]', { timeout: 10000 });
                this.status = 'READY';
                this.startTime = Date.now();
                return true;
            } catch {
                this.status = hasChromeProfile ? 'CHROME_NOT_LOGGED_IN' : 'SESSION_EXPIRED';
                await this.cleanup();
                return false;
            }
        } catch (e) {
            this.lastError = e.message;
            this.status = 'ERROR';
            await this.cleanup();
            return false;
        }
    }

    async postContent(caption, imagePath = null) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            // Navigate to create post
            await this.page.click('svg[aria-label="New post"]');
            await this.page.waitForTimeout(1000);
            
            if (imagePath && fs.existsSync(imagePath)) {
                const fileInput = await this.page.$('input[type="file"]');
                if (fileInput) {
                    await fileInput.setInputFiles(imagePath);
                    await this.page.waitForTimeout(2000);
                }
            }
            
            // Click Next buttons and add caption
            await this.page.click('button:has-text("Next")');
            await this.page.waitForTimeout(500);
            await this.page.click('button:has-text("Next")');
            await this.page.waitForTimeout(500);
            
            // Add caption
            const captionArea = await this.page.$('textarea[aria-label="Write a caption..."]');
            if (captionArea) {
                await captionArea.fill(caption);
            }
            
            // Share
            await this.page.click('button:has-text("Share")');
            await this.page.waitForTimeout(3000);
            
            return { success: true, message: 'Post shared!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async readFeed(count = 10) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto(INSTAGRAM_URL, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('article', { timeout: 10000 });
            
            // Scroll to load posts
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.scrollBy(0, 500));
                await this.page.waitForTimeout(500);
            }
            
            const posts = await this.page.evaluate((maxCount) => {
                const articles = document.querySelectorAll('article');
                const results = [];
                
                for (let i = 0; i < Math.min(articles.length, maxCount); i++) {
                    const article = articles[i];
                    try {
                        const username = article.querySelector('a[role="link"] span')?.innerText || 'Unknown';
                        const caption = article.querySelector('span[class*="x1lliihq"]')?.innerText || '';
                        const likes = article.querySelector('section button span')?.innerText || '0';
                        
                        results.push({ username, caption: caption.substring(0, 200), likes });
                    } catch {
                        // Skip malformed posts
                    }
                }
                
                return results;
            }, count);
            
            return { success: true, posts };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async likePost(postUrl) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto(postUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('svg[aria-label="Like"]', { timeout: 10000 });
            await this.page.click('svg[aria-label="Like"]');
            await this.page.waitForTimeout(1000);
            
            return { success: true, message: 'Post liked!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async commentOnPost(postUrl, comment) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto(postUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('textarea[aria-label="Add a comment…"]', { timeout: 10000 });
            await this.page.fill('textarea[aria-label="Add a comment…"]', comment);
            await this.page.click('button:has-text("Post")');
            await this.page.waitForTimeout(2000);
            
            return { success: true, message: 'Comment posted!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Post to stories
     */
    async postStory(imagePath) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            // Note: Instagram web story posting is limited, often requires mobile emulation
            // We'll try to find the story upload button if available
            await this.page.goto(INSTAGRAM_URL, { waitUntil: 'domcontentloaded' });
            
            // Story posting usually requires a specific view or mobile UA
            // For now, we'll implement a placeholder that navigates to the intent
            await this.page.goto('https://www.instagram.com/create/story/', { waitUntil: 'domcontentloaded' });
            
            if (imagePath && fs.existsSync(imagePath)) {
                const fileInput = await this.page.$('input[type="file"]');
                if (fileInput) {
                    await fileInput.setInputFiles(imagePath);
                    await this.page.waitForTimeout(3000);
                    // Click share to story
                    await this.page.click('button:has-text("Add to your story")');
                    await this.page.waitForTimeout(2000);
                    return { success: true, message: 'Story posted!' };
                }
            }
            return { success: false, error: 'Story upload button not found or image missing' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get available stories from feed
     */
    async getStories() {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto(INSTAGRAM_URL, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('canvas[aria-label^="Story by"]', { timeout: 10000 });
            
            const stories = await this.page.evaluate(() => {
                const storyButtons = document.querySelectorAll('button[aria-label^="Story by"]');
                return Array.from(storyButtons).map(btn => btn.getAttribute('aria-label'));
            });
            
            return { success: true, stories };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Follow a user
     */
    async followUser(username) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto(`${INSTAGRAM_URL}/${username}/`, { waitUntil: 'domcontentloaded' });
            const followBtn = await this.page.waitForSelector('button:has-text("Follow")', { timeout: 10000 });
            
            if (followBtn) {
                await followBtn.click();
                await this.page.waitForTimeout(1000);
                return { success: true, message: `Following @${username}` };
            }
            return { success: true, message: 'Already following or button not found.' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Unfollow a user
     */
    async unfollowUser(username) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto(`${INSTAGRAM_URL}/${username}/`, { waitUntil: 'domcontentloaded' });
            const followingBtn = await this.page.waitForSelector('button:has-text("Following"), button:has-text("Requested")', { timeout: 10000 });
            
            if (followingBtn) {
                await followingBtn.click();
                await this.page.waitForSelector('button:has-text("Unfollow")', { timeout: 5000 });
                await this.page.click('button:has-text("Unfollow")');
                await this.page.waitForTimeout(1000);
                return { success: true, message: `Unfollowed @${username}` };
            }
            return { success: true, message: 'Not following user.' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Send a Direct Message
     */
    async sendDM(username, message) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            // Navigate to direct inbox
            await this.page.goto('https://www.instagram.com/direct/new/', { waitUntil: 'domcontentloaded' });
            
            // Search for user
            await this.page.waitForSelector('input[name="queryBox"]', { timeout: 10000 });
            await this.page.fill('input[name="queryBox"]', username);
            await this.page.waitForTimeout(2000);
            
            // Select first result
            await this.page.click(`span:has-text("${username}")`);
            await this.page.click('button:has-text("Chat")');
            
            // Send message
            await this.page.waitForSelector('div[role="textbox"]', { timeout: 10000 });
            await this.page.fill('div[role="textbox"]', message);
            await this.page.keyboard.press('Enter');
            
            return { success: true, message: 'DM sent!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Read DM inbox
     */
    async readDMs() {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('div[role="listitem"]', { timeout: 10000 });
            
            const chats = await this.page.evaluate(() => {
                const items = document.querySelectorAll('div[role="listitem"]');
                return Array.from(items).map(item => item.innerText.split('\n')[0]);
            });
            
            return { success: true, chats };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Explore content
     */
    async exploreContent() {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            await this.page.goto('https://www.instagram.com/explore/', { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('a[href^="/p/"]', { timeout: 10000 });
            
            const posts = await this.page.evaluate(() => {
                const links = document.querySelectorAll('a[href^="/p/"]');
                return Array.from(links).slice(0, 10).map(l => l.getAttribute('href'));
            });
            
            return { success: true, posts };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get profile statistics
     */
    async getProfileStats(username = 'me') {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Instagram session not ready.' };
        }
        
        try {
            const path = username === 'me' ? 'accounts/edit/' : `${username}/`;
            await this.page.goto(`${INSTAGRAM_URL}/${path}`, { waitUntil: 'domcontentloaded' });
            
            const stats = await this.page.evaluate(() => {
                const spans = document.querySelectorAll('header span');
                return {
                    posts: spans[0]?.innerText || '0',
                    followers: spans[1]?.innerText || '0',
                    following: spans[2]?.innerText || '0'
                };
            });
            
            return { success: true, stats };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async ensureReady() {
        socialBrowserEngine.keepAlive();
        if (this.status === 'READY' && this.page && !this.page.isClosed()) {
            return true;
        }
        return await this.initHeadless();
    }

    async logout() {
        try {
            if (fs.existsSync(COOKIES_FILE)) fs.unlinkSync(COOKIES_FILE);
            await this.cleanup();
            this.status = 'OFFLINE';
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

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

export const instagramService = new InstagramService();
