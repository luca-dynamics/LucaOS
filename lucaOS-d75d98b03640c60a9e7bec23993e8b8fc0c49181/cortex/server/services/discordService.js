import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getLucaBrowserProfilePath, getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'discord');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');
const DISCORD_URL = 'https://discord.com/channels/@me';

class DiscordService {
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
        
        // High-fidelity check for Discord data
        const marker = path.join(chromePath, 'IndexedDB', 'https_discord.com_0.indexeddb.leveldb');
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
                console.error('[DISCORD] Failed to load cookies:', e.message);
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
                console.error('[DISCORD] Failed to save cookies:', e.message);
            }
        }
    }

    async startLoginSession() {
        try {
            this.status = 'LOGGING_IN';
            
            this.page = await socialBrowserEngine.getPage('discord', { headless: false });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            await this.page.goto(DISCORD_URL, { waitUntil: 'domcontentloaded' });
            
            // Wait for successful login (detect DM list or server list)
            await this.page.waitForSelector('[class*="privateChannels"]', { timeout: 300000 });
            
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
            
            this.page = await socialBrowserEngine.getPage('discord', { headless: true });
            this.context = this.page.context();
            this.browser = this.context.browser();
            
            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }
            
            await this.page.goto(DISCORD_URL, { waitUntil: 'domcontentloaded' });
            
            try {
                await this.page.waitForSelector('[class*="privateChannels"]', { timeout: 10000 });
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

    async sendMessage(channelId, message) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Discord session not ready.' };
        }
        
        try {
            // Navigate to channel
            await this.page.goto(`https://discord.com/channels/@me/${channelId}`, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[class*="textArea"]', { timeout: 10000 });
            
            // Type and send message
            const textArea = await this.page.$('[class*="textArea"] [role="textbox"]');
            if (textArea) {
                await textArea.fill(message);
                await this.page.keyboard.press('Enter');
                await this.page.waitForTimeout(1000);
            }
            
            return { success: true, message: 'Message sent!' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async readMessages(channelId, count = 20) {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Discord session not ready.' };
        }
        
        try {
            await this.page.goto(`https://discord.com/channels/@me/${channelId}`, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[class*="message-"]', { timeout: 10000 });
            
            const messages = await this.page.evaluate((maxCount) => {
                const messageElements = document.querySelectorAll('[class*="message-"]');
                const results = [];
                
                const startIdx = Math.max(0, messageElements.length - maxCount);
                for (let i = startIdx; i < messageElements.length; i++) {
                    const msg = messageElements[i];
                    try {
                        const author = msg.querySelector('[class*="username"]')?.innerText || 'Unknown';
                        const content = msg.querySelector('[class*="messageContent"]')?.innerText || '';
                        const timestamp = msg.querySelector('time')?.getAttribute('datetime') || '';
                        
                        if (content) {
                            results.push({ author, content, timestamp });
                        }
                    } catch {
                        // Skip malformed messages
                    }
                }
                
                return results;
            }, count);
            
            return { success: true, messages };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async listServers() {
        if (!await this.ensureReady()) {
            return { success: false, error: 'Discord session not ready.' };
        }
        
        try {
            await this.page.goto(DISCORD_URL, { waitUntil: 'domcontentloaded' });
            await this.page.waitForSelector('[class*="guilds"]', { timeout: 10000 });
            
            const servers = await this.page.evaluate(() => {
                const serverElements = document.querySelectorAll('[class*="guilds"] [class*="listItem"]');
                const results = [];
                
                serverElements.forEach((server, index) => {
                    if (index === 0) return; // Skip home button
                    const name = server.querySelector('[class*="blobContainer"] img')?.alt || 
                                 server.innerText?.trim() || 'Unknown';
                    results.push({ name, index });
                });
                
                return results;
            });
            
            return { success: true, servers };
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

export const discordService = new DiscordService();
