import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getLucaBrowserProfilePath, getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'youtube');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');
const YOUTUBE_URL = 'https://www.youtube.com';

class YouTubeService {
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
        
        // High-fidelity check for YouTube data
        const marker = path.join(chromePath, 'IndexedDB', 'https_www.youtube.com_0.indexeddb.leveldb');
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
                console.error('[YOUTUBE] Failed to load cookies:', e.message);
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
                console.error('[YOUTUBE] Failed to save cookies:', e.message);
            }
        }
    }

    async startLoginSession() {
        try {
            this.status = 'LOGGING_IN';
            
            this.page = await socialBrowserEngine.getPage('youtube', { headless: false });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            await this.page.goto(`${YOUTUBE_URL}/account`, { waitUntil: 'domcontentloaded' });
            
            // Wait for successful login (detect avatar or account menu)
            await this.page.waitForSelector('#avatar-btn', { timeout: 300000 });
            
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
            
            this.page = await socialBrowserEngine.getPage('youtube', { headless: true });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }
            
            await this.page.goto(YOUTUBE_URL, { waitUntil: 'domcontentloaded' });
            
            try {
                // Check if logged in by looking for avatar
                await this.page.waitForSelector('#avatar-btn', { timeout: 10000 });
                this.status = 'READY';
                this.startTime = Date.now();
                return true;
            } catch {
                // Not logged in but can still browse
                this.status = 'READY_ANONYMOUS';
                this.startTime = Date.now();
                return true;
            }
        } catch (e) {
            this.lastError = e.message;
            this.status = 'ERROR';
            await this.cleanup();
            return false;
        }
    }

    async searchVideos(query, count = 10) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'YouTube session not ready.' };
        }
        
        try {
            await this.page.goto(`${YOUTUBE_URL}/results?search_query=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('ytd-video-renderer', { timeout: 10000 });
            
            const videos = await this.page.evaluate((maxCount) => {
                const videoElements = document.querySelectorAll('ytd-video-renderer');
                const results = [];
                
                for (let i = 0; i < Math.min(videoElements.length, maxCount); i++) {
                    const video = videoElements[i];
                    try {
                        const title = video.querySelector('#video-title')?.innerText || '';
                        const channel = video.querySelector('#channel-name a')?.innerText || '';
                        const views = video.querySelector('#metadata-line span')?.innerText || '';
                        const url = video.querySelector('#video-title')?.href || '';
                        
                        results.push({ title, channel, views, url });
                    } catch {
                        // Skip malformed videos
                    }
                }
                
                return results;
            }, count);
            
            return { success: true, videos };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getSubscriptions(count = 20) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'YouTube session not ready.' };
        }
        
        try {
            await this.page.goto(`${YOUTUBE_URL}/feed/subscriptions`, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('ytd-rich-item-renderer', { timeout: 10000 });
            
            // Scroll to load more
            for (let i = 0; i < 2; i++) {
                await this.page.evaluate(() => window.scrollBy(0, 500));
                await this.page.waitForTimeout(500);
            }
            
            const videos = await this.page.evaluate((maxCount) => {
                const videoElements = document.querySelectorAll('ytd-rich-item-renderer');
                const results = [];
                
                for (let i = 0; i < Math.min(videoElements.length, maxCount); i++) {
                    const video = videoElements[i];
                    try {
                        const title = video.querySelector('#video-title')?.innerText || '';
                        const channel = video.querySelector('#channel-name a')?.innerText || '';
                        const url = video.querySelector('#video-title-link')?.href || '';
                        
                        if (title) results.push({ title, channel, url });
                    } catch {
                        // Skip malformed videos
                    }
                }
                
                return results;
            }, count);
            
            return { success: true, videos };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async likeVideo(videoUrl) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'YouTube session not ready. Login required.' };
        }
        
        try {
            await this.page.goto(videoUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('like-button-view-model button', { timeout: 10000 });
            await this.page.click('like-button-view-model button');
            await this.page.waitForTimeout(1000);
            
            return { success: true, message: 'Video liked!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async commentOnVideo(videoUrl, comment) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'YouTube session not ready. Login required.' };
        }
        
        try {
            await this.page.goto(videoUrl, { waitUntil: 'domcontentloaded' });
            
            // Scroll to comments section
            await this.page.evaluate(() => window.scrollTo(0, 500));
            await this.page.waitForTimeout(2000);
            
            // Click on comment placeholder
            await this.page.click('#placeholder-area');
            await this.page.waitForSelector('#contenteditable-root', { timeout: 5000 });
            
            // Type comment
            await this.page.fill('#contenteditable-root', comment);
            
            // Submit
            await this.page.click('#submit-button');
            await this.page.waitForTimeout(2000);
            
            return { success: true, message: 'Comment posted!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async ensureReady() {
        socialBrowserEngine.keepAlive();
        if ((this.status === 'READY' || this.status === 'READY_ANONYMOUS') && this.page && !this.page.isClosed()) {
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

export const youtubeService = new YouTubeService();
