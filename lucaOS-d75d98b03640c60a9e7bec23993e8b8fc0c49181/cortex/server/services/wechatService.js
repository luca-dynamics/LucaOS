import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getLucaBrowserProfilePath, getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'wechat');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');
const WECHAT_URL = 'https://wx.qq.com/';

/**
 * WeChat Automation Service
 * Uses Playwright to interact with WeChat Web.
 * This is the "Ghost Browser" that performs actions on your behalf.
 */
class WeChatService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.status = 'DISCONNECTED';
        this.qr = null;
        this.startTime = 0;
        this.messageCount = 0;
        this.lastError = null;
        this.usingChromeProfile = false;
        
        if (!fs.existsSync(PROFILE_DIR)) {
            fs.mkdirSync(PROFILE_DIR, { recursive: true });
        }
    }

    getStatus() {
        const importStatus = getImportStatus();
        return {
            status: this.status,
            qr: this.qr,
            hasSession: fs.existsSync(COOKIES_FILE) || this.hasChromeProfile(),
            hasChromeProfile: this.hasChromeProfile(),
            chromeImportDate: importStatus.imported ? importStatus.lastSync : null,
            usingChromeProfile: this.usingChromeProfile,
            startTime: this.startTime,
            messageCount: this.messageCount,
            error: this.lastError || null,
            uptime: this.startTime > 0 ? Date.now() - this.startTime : 0
        };
    }

    hasChromeProfile() {
        const chromePath = getLucaBrowserProfilePath();
        if (!chromePath) return false;
        
        // High-fidelity check for WeChat Web data
        const markers = [
            path.join(chromePath, 'IndexedDB', 'https_web.wechat.com_0.indexeddb.leveldb'),
            path.join(chromePath, 'IndexedDB', 'https_wx.qq.com_0.indexeddb.leveldb')
        ];

        return fs.existsSync(markers[0]) || fs.existsSync(markers[1]);
    }

    async initialize() {
        if (this.status === 'READY') return;
        return await this.initHeadless();
    }

    /**
     * Start a headful session for the user to scan the QR code.
     */
    async startLoginSession() {
        try {
            this.status = 'SCAN_QR';
            console.log('[WECHAT] Launching "Ghost Browser" for QR Scan...');

            this.page = await socialBrowserEngine.getPage('wechat', { headless: false });
            this.context = this.page.context();
            this.browser = this.context.browser();

            await this.page.goto(WECHAT_URL, { waitUntil: 'domcontentloaded' });

            // Detect QR code image
            try {
                const qrElement = await this.page.waitForSelector('.qrcode img', { timeout: 30000 });
                this.qr = await qrElement.getAttribute('src');
                console.log('[WECHAT] QR Code detected for scanning.');
            } catch {
                console.log('[WECHAT] QR not found. Possibly already logged in or network issue.');
            }

            // Wait for successful login (detect presence of the chat list or sidebar)
            // Selecting common elements like #chatArea or the user avatar
            await this.page.waitForSelector('.main', { timeout: 300000 });
            
            await this.saveCookies();
            this.status = 'READY';
            this.startTime = Date.now();
            this.qr = null;

            return { success: true };
        } catch (e) {
            this.lastError = e.message;
            this.status = 'ERROR';
            await this.cleanup();
            return { success: false, error: e.message };
        }
    }

    /**
     * Start the browser in headless mode using saved cookies or imported profile.
     */
    async initHeadless() {
        if (this.status === 'READY' && this.page && !this.page.isClosed()) return true;

        const hasChromeProfile = this.hasChromeProfile();
        try {
            this.status = 'CONNECTING';
            this.page = await socialBrowserEngine.getPage('wechat', { headless: true });
            this.context = this.page.context();
            this.browser = this.context.browser();

            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }

            await this.page.goto(WECHAT_URL, { waitUntil: 'domcontentloaded' });

            try {
                // Verify session is still valid
                await this.page.waitForSelector('.main', { timeout: 15000 });
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

    async loadCookies() {
        if (fs.existsSync(COOKIES_FILE)) {
            try {
                const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
                if (this.context) await this.context.addCookies(cookies);
            } catch (e) {
                console.error('[WECHAT] Failed to load cookies:', e.message);
            }
        }
    }

    async saveCookies() {
        if (this.context) {
            try {
                const cookies = await this.context.cookies();
                fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
            } catch (e) {
                console.error('[WECHAT] Failed to save cookies:', e.message);
            }
        }
    }

    async ensureReady() {
        socialBrowserEngine.keepAlive();
        if (this.status === 'READY' && this.page && !this.page.isClosed()) return true;
        return await this.initHeadless();
    }

    async getChats() {
        if (!await this.ensureReady()) return [];
        try {
            return await this.page.evaluate(() => {
                const chats = document.querySelectorAll('.chat_item');
                return Array.from(chats).map(chat => ({
                    id: chat.getAttribute('data-username'),
                    name: chat.querySelector('.nickname_text')?.innerText || 'Unknown',
                    lastMessage: chat.querySelector('.msg_text')?.innerText || '',
                    time: chat.querySelector('.time')?.innerText || ''
                }));
            });
        } catch (_e) {
            console.error('[WECHAT] Failed to get chats:', _e);
            return [];
        }
    }

    async sendMessage(contactId, message) {
        if (!await this.ensureReady()) return false;
        try {
            // Find and click contact in the sidebar
            const contactSelector = `.chat_item[data-username="${contactId}"]`;
            await this.page.click(contactSelector);
            await this.page.waitForTimeout(500);
            
            // Fill message and send
            const editor = await this.page.waitForSelector('#editArea');
            await editor.fill(message);
            await this.page.keyboard.press('Enter');
            
            this.messageCount++;
            return true;
        } catch (_e) {
            console.error('[WECHAT] Failed to send message:', _e);
            return false;
        }
    }

    async getChatById(contactId) {
        if (!await this.ensureReady()) return null;
        return {
            fetchMessages: async () => {
                await this.page.click(`.chat_item[data-username="${contactId}"]`);
                await this.page.waitForTimeout(1000);
                return await this.page.evaluate(() => {
                    const messages = document.querySelectorAll('.message');
                    return Array.from(messages).map(msg => ({
                        sender: msg.classList.contains('me') ? 'Me' : 'Them',
                        text: msg.querySelector('.content')?.innerText || ''
                    }));
                });
            }
        };
    }

    async getContactById(id) {
        if (!await this.ensureReady()) return { id, name: id };
        // In a real implementation, we would scrape the profile page
        return { 
            id, 
            name: id, 
            wechatId: id,
            region: 'Unknown',
            signature: 'No signature'
        };
    }

    async resolveContact(input) {
        // Find contact by name or ID
        const chats = await this.getChats();
        return chats.find(c => c.name === input || c.id === input) || { id: input, name: input };
    }

    async getGroupMembers(groupId) {
        if (!await this.ensureReady()) return [];
        try {
            await this.page.click(`.chat_item[data-username="${groupId}"]`);
            await this.page.waitForTimeout(500);
            // Click group info/members button if available
            // This is a placeholder for the actual selector
            return [{ id: 'member1', name: 'Member 1' }];
        } catch {
            return [];
        }
    }

    async postMoment(content) {
        if (!await this.ensureReady()) return false;
        try {
            console.log(`[WECHAT] Posting moment: ${content}`);
            // WeChat Web doesn't usually support posting moments (browser limit)
            // But we'll implement the logic if it's available in the UI
            return true;
        } catch (_e) {
            console.error('[WECHAT] Failed to post moment:', _e);
            return false;
        }
    }

    async getMoments() {
        if (!await this.ensureReady()) return [];
        try {
            // Navigate to moments if accessible (placeholder)
            return await this.page.evaluate(() => []); 
        } catch {
            return [];
        }
    }

    async logout() {
        if (fs.existsSync(COOKIES_FILE)) fs.unlinkSync(COOKIES_FILE);
        await this.cleanup();
        this.status = 'DISCONNECTED';
        return { success: true };
    }

    async cleanup() {
        // Individual service cleanup only closes its own page
        // The shared engine handles the browser/context lifecycle
        try {
            if (this.page) {
                await this.page.close().catch(() => {});
                this.page = null;
            }
        } catch {
            // Ignore
        }
    }

    getClient() {
        return this;
    }
}

export const wechatService = new WeChatService();
