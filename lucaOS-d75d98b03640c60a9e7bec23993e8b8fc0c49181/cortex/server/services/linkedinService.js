import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getLucaBrowserProfilePath, getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'linkedin');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');
const LINKEDIN_URL = 'https://www.linkedin.com';

class LinkedInService {
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
        
        // High-fidelity check for LinkedIn data
        const marker = path.join(chromePath, 'IndexedDB', 'https_www.linkedin.com_0.indexeddb.leveldb');
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
                console.error('[LINKEDIN] Failed to load cookies:', e.message);
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
                console.error('[LINKEDIN] Failed to save cookies:', e.message);
            }
        }
    }

    async startLoginSession() {
        try {
            this.status = 'LOGGING_IN';
            
            this.page = await socialBrowserEngine.getPage('linkedin', { headless: false });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            await this.page.goto(LINKEDIN_URL, { waitUntil: 'domcontentloaded' });
            
            // Wait for successful login (detect feed)
            await this.page.waitForSelector('.feed-shared-update-v2', { timeout: 300000 });
            
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
            
            this.page = await socialBrowserEngine.getPage('linkedin', { headless: true });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }
            
            await this.page.goto(`${LINKEDIN_URL}/feed/`, { waitUntil: 'domcontentloaded' });
            
            try {
                await this.page.waitForSelector('.feed-shared-update-v2', { timeout: 10000 });
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

    async createPost(content, imagePath = null) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(`${LINKEDIN_URL}/feed/`, { waitUntil: 'domcontentloaded' });
            
            // Click "Start a post" button
            await this.page.click('button[class*="share-box-feed-entry__trigger"]');
            await this.page.waitForTimeout(1000);
            
            // Type content
            const editor = await this.page.waitForSelector('.ql-editor[data-placeholder]', { timeout: 5000 });
            await editor.fill(content);
            
            // Handle image if provided
            if (imagePath && fs.existsSync(imagePath)) {
                const mediaButton = await this.page.$('button[aria-label="Add a photo"]');
                if (mediaButton) {
                    await mediaButton.click();
                    const fileInput = await this.page.$('input[type="file"]');
                    if (fileInput) {
                        await fileInput.setInputFiles(imagePath);
                        await this.page.waitForTimeout(2000);
                    }
                }
            }
            
            // Click Post button
            await this.page.click('button[class*="share-actions__primary-action"]');
            await this.page.waitForTimeout(3000);
            
            return { success: true, message: 'Post published!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async readFeed(count = 10) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(`${LINKEDIN_URL}/feed/`, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('.feed-shared-update-v2', { timeout: 10000 });
            
            // Scroll to load posts
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.scrollBy(0, 500));
                await this.page.waitForTimeout(500);
            }
            
            const posts = await this.page.evaluate((maxCount) => {
                const feedItems = document.querySelectorAll('.feed-shared-update-v2');
                const results = [];
                
                for (let i = 0; i < Math.min(feedItems.length, maxCount); i++) {
                    const post = feedItems[i];
                    try {
                        const author = post.querySelector('.update-components-actor__name span[aria-hidden="true"]')?.innerText || 'Unknown';
                        const headline = post.querySelector('.update-components-actor__description')?.innerText || '';
                        const content = post.querySelector('.feed-shared-update-v2__description')?.innerText || '';
                        const reactions = post.querySelector('.social-details-social-counts__reactions-count')?.innerText || '0';
                        
                        results.push({ 
                            author, 
                            headline: headline.substring(0, 100),
                            content: content.substring(0, 300), 
                            reactions 
                        });
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
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(postUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('button[aria-label*="Like"]', { timeout: 10000 });
            await this.page.click('button[aria-label*="Like"]');
            await this.page.waitForTimeout(1000);
            
            return { success: true, message: 'Post liked!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async commentOnPost(postUrl, comment) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(postUrl, { waitUntil: 'domcontentloaded' });
            
            // Click comment button to open comment box
            await this.page.click('button[aria-label*="Comment"]');
            await this.page.waitForTimeout(500);
            
            // Type comment
            const commentBox = await this.page.waitForSelector('.ql-editor[data-placeholder*="comment"]', { timeout: 5000 });
            await commentBox.fill(comment);
            
            // Submit
            await this.page.click('button[class*="comments-comment-box__submit-button"]');
            await this.page.waitForTimeout(2000);
            
            return { success: true, message: 'Comment posted!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Send connection request
     */
    async sendConnectionRequest(profileUrl, message = null) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
            
            const connectBtn = await this.page.waitForSelector('button:has-text("Connect")', { timeout: 10000 });
            await connectBtn.click();
            
            if (message) {
                await this.page.waitForSelector('button:has-text("Add a note")', { timeout: 5000 });
                await this.page.click('button:has-text("Add a note")');
                await this.page.fill('textarea[name="message"]', message);
                await this.page.click('button:has-text("Send")');
            } else {
                await this.page.waitForSelector('button:has-text("Send without a note")', { timeout: 5000 });
                await this.page.click('button:has-text("Send without a note")');
            }
            
            return { success: true, message: 'Connection request sent!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Search LinkedIn jobs
     */
    async searchJobs(keywords, location = '') {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
            await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('.job-card-container', { timeout: 10000 });
            
            const jobs = await this.page.evaluate(() => {
                const cards = document.querySelectorAll('.job-card-container');
                return Array.from(cards).slice(0, 10).map(c => ({
                    title: c.querySelector('.job-card-list__title')?.innerText || 'Unknown',
                    company: c.querySelector('.job-card-container__company-name')?.innerText || 'Unknown',
                    location: c.querySelector('.job-card-container__metadata-item')?.innerText || 'Unknown'
                }));
            });
            
            return { success: true, jobs };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Send LinkedIn message
     */
    async sendMessage(profileUrl, message) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
            const messageBtn = await this.page.waitForSelector('button:has-text("Message")', { timeout: 10000 });
            await messageBtn.click();
            
            const msgBox = await this.page.waitForSelector('.msg-form__contenteditable', { timeout: 10000 });
            await msgBox.fill(message);
            await this.page.click('button[type="submit"]');
            
            return { success: true, message: 'Message sent!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Read LinkedIn messages
     */
    async readMessages() {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('.msg-conversation-listitem', { timeout: 10000 });
            
            const messages = await this.page.evaluate(() => {
                const items = document.querySelectorAll('.msg-conversation-listitem');
                return Array.from(items).map(item => ({
                    sender: item.querySelector('.msg-conversation-listitem__participant-names')?.innerText || 'Unknown',
                    snippet: item.querySelector('.msg-conversation-listitem__subtitle')?.innerText || ''
                }));
            });
            
            return { success: true, messages };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * View LinkedIn profile
     */
    async viewProfile(profileUrl) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'LinkedIn session not ready.' };
        }
        
        try {
            await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
            
            const profile = await this.page.evaluate(() => {
                return {
                    name: document.querySelector('.text-heading-xlarge')?.innerText || 'Unknown',
                    headline: document.querySelector('.text-body-medium')?.innerText || '',
                    about: document.querySelector('.display-flex.ph5.pv3 span')?.innerText || ''
                };
            });
            
            return { success: true, profile };
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

export const linkedinService = new LinkedInService();
