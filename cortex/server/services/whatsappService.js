import { socialBrowserEngine } from './socialBrowserEngine.js';
import fs from 'fs';
import path from 'path';
import { getImportStatus } from './chromeProfileService.js';
import { DATA_DIR } from '../config/constants.js';

const WHATSAPP_URL = 'https://web.whatsapp.com/';
const PROFILE_DIR = path.join(DATA_DIR, 'profiles', 'whatsapp');
const COOKIES_FILE = path.join(PROFILE_DIR, 'cookies.json');

class WhatsAppService {
    constructor() {
        this.page = null;
        this.context = null;
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

    /**
     * WhatsApp is excluded from Chrome Sync to prioritize the more reliable
     * Direct QR-Scanning flow.
     */
    hasChromeProfile() {
        return false;
    }

    async initialize() {
        if (this.status === 'READY') return;
        return await this.initHeadless();
    }

    async startLoginSession() {
        try {
            this.status = 'SCAN_QR';
            console.log('[WHATSAPP] Launching Luca Link browser for QR Scan...');

            this.page = await socialBrowserEngine.getPage('whatsapp', { headless: false });
            this.context = this.page.context();

            await this.page.goto(WHATSAPP_URL, { waitUntil: 'domcontentloaded' });

            // Detect QR code
            try {
                // Wait for the QR container
                await this.page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 30000 });
                
                // Extract the QR data ref which contains the code needed to generate the QR
                // WhatsApp Web renders a canvas, but often the parent container has a data-ref attribute
                // or we can just inform the status that QR is ready, but for Luca Link UI we need the raw string.
                // The canvas itself is hard to extract raw data from without OCR, but usually the `div[data-ref]` holds the string.
                
                // Method 1: Look for data-ref on the wrapper
                const qrData = await this.page.evaluate(() => {
                    const selector = document.querySelector('div[data-ref]');
                    return selector ? selector.getAttribute('data-ref') : null;
                });

                if (qrData) {
                    this.qr = qrData;
                    console.log('[WHATSAPP] QR Code extracted:', qrData.substring(0, 20) + '...');
                } else {
                    console.log('[WHATSAPP] QR Code visible but could not extract raw data-ref.');
                }
            } catch (e) {
                console.log('[WHATSAPP] QR not found or extraction failed:', e.message);
            }

            // Wait for main interface (sidebar/search)
            await this.page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 300000 });
            
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

    async initHeadless() {
        if (this.status === 'READY' && this.page && !this.page.isClosed()) return true;

        const hasChromeProfile = this.hasChromeProfile();
        try {
            this.status = 'CONNECTING';
            this.page = await socialBrowserEngine.getPage('whatsapp', { headless: true });
            this.context = this.page.context();

            if (!this.usingChromeProfile) {
                await this.loadCookies();
            }

            await this.page.goto(WHATSAPP_URL, { waitUntil: 'domcontentloaded' });

            try {
                // Verify session
                await this.page.waitForSelector('#pane-side, [data-testid="chat-list"]', { timeout: 20000 });
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
                console.error('[WHATSAPP] Failed to load cookies:', e.message);
            }
        }
    }

    async saveCookies() {
        if (this.context) {
            try {
                const cookies = await this.context.cookies();
                fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
            } catch (e) {
                console.error('[WHATSAPP] Failed to save cookies:', e.message);
            }
        }
    }

    async ensureReady() {
        socialBrowserEngine.keepAlive();
        if (this.status === 'READY' && this.page && !this.page.isClosed()) return true;
        return await this.initHeadless();
    }

    async sendMessage(contactName, message) {
        if (!await this.ensureReady()) return false;
        try {
            // Search for contact
            const searchBox = await this.page.waitForSelector('div[contenteditable="true"][data-tab="3"]');
            await searchBox.click();
            await searchBox.fill(contactName);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(1000);

            // Type and send
            const msgBox = await this.page.waitForSelector('div[contenteditable="true"][data-tab="10"]');
            await msgBox.fill(message);
            await this.page.keyboard.press('Enter');

            this.messageCount++;
            return true;
        } catch (e) {
            console.error('[WHATSAPP] Failed to send message:', e.message);
            return false;
        }
    }

    async getChats() {
        if (!await this.ensureReady()) return [];
        try {
            return await this.page.evaluate(() => {
                const chats = document.querySelectorAll('#pane-side [role="row"]');
                return Array.from(chats).map(chat => {
                    const name = chat.querySelector('span[title]')?.getAttribute('title');
                    const lastMsg = chat.querySelector('span[dir="ltr"]')?.innerText;
                    const timestamp = chat.querySelector('div.v_1V-')?.innerText; // Approximate selector
                    return { name, lastMsg, timestamp };
                }).filter(c => c.name);
            });
        } catch {
            return [];
        }
    }

    async getContacts() {
        if (!await this.ensureReady()) return [];
        try {
            // WhatsApp Web doesn't have a simple "contact list" like a database
            // We usually scrape the chat list as the primary set of "active" contacts
            return await this.getChats();
        } catch (e) {
            console.error('[WHATSAPP] Failed to get contacts:', e.message);
            return [];
        }
    }

    async getHistory(contactName, limit = 20) {
        if (!await this.ensureReady()) return [];
        try {
            if (!await this.searchAndOpenChat(contactName)) return [];

            // Wait for messages to load
            await this.page.waitForSelector('[data-testid="msg-container"]', { timeout: 5000 }).catch(() => {});

            return await this.page.evaluate((limit) => {
                const msgs = document.querySelectorAll('[data-testid="msg-container"]');
                return Array.from(msgs).slice(-limit).map(m => {
                    const text = m.querySelector('.selectable-text')?.innerText;
                    const isOut = m.closest('.message-out') !== null;
                    const time = m.querySelector('div[data-testid="msg-meta"]')?.innerText;
                    return {
                        body: text || "[Media/Unsupported]",
                        fromMe: isOut,
                        timestamp: time
                    };
                });
            }, limit);
        } catch (e) {
            console.error('[WHATSAPP] Failed to get history:', e.message);
            return [];
        }
    }

    async getAbout(contactName) {
        if (!await this.ensureReady()) return 'No bio available';
        try {
            if (!await this.searchAndOpenChat(contactName)) return null;

            // Click header to open profile info
            await this.page.click('header[data-testid="conversation-header"]');
            await this.page.waitForSelector('span[data-testid="contact-info-drawer-about-content"]', { timeout: 5000 });

            const about = await this.page.$eval('span[data-testid="contact-info-drawer-about-content"]', el => el.innerText);
            
            // Close drawer
            await this.page.click('button[aria-label="Close"]');
            
            return about;
        } catch (e) {
            console.error('[WHATSAPP] Failed to get about:', e.message);
            return 'Hidden';
        }
    }

    async getProfilePicUrl(contactName) {
        if (!await this.ensureReady()) return null;
        try {
            if (!await this.searchAndOpenChat(contactName)) return null;

            // Click header
            await this.page.click('header[data-testid="conversation-header"]');
            await this.page.waitForSelector('div[data-testid="profile-info-photo"] img', { timeout: 5000 });

            const src = await this.page.$eval('div[data-testid="profile-info-photo"] img', el => el.src);
            
            // Close drawer
            await this.page.click('button[aria-label="Close"]');
            
            return src;
        } catch (e) {
            console.error('[WHATSAPP] Failed to get profile pic:', e.message);
            return null;
        }
    }

    async getGroupParticipants(groupName) {
        if (!await this.ensureReady()) return [];
        try {
            if (!await this.searchAndOpenChat(groupName)) return [];

            // Open group info
            await this.page.click('header[data-testid="conversation-header"]');
            await this.page.waitForSelector('span[data-testid="contact-info-drawer-members-count"]', { timeout: 5000 }).catch(e => console.log('Group info load timed out', e.message));

            // Scroll down a bit in the drawer to see participants if needed
            return await this.page.evaluate(() => {
                const members = document.querySelectorAll('div[data-testid="cell-frame-container"]');
                return Array.from(members).map(m => {
                    const name = m.querySelector('span[title]')?.getAttribute('title');
                    const status = m.querySelector('span[data-testid="contact-info-drawer-participant-status"]')?.innerText;
                    return { name, status };
                }).filter(m => m.name);
            });
        } catch (e) {
            console.error('[WHATSAPP] Failed to get group participants:', e.message);
            return [];
        }
    }

    async searchAndOpenChat(contactName) {
        try {
            const searchBox = await this.page.waitForSelector('div[contenteditable="true"][data-tab="3"]', { timeout: 10000 });
            await searchBox.click();
            
            // Clear search box first
            await this.page.keyboard.down('Meta');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Meta');
            await this.page.keyboard.press('Backspace');
            
            await searchBox.fill(contactName);
            await this.page.waitForTimeout(1000);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(1000);
            return true;
        } catch (e) {
            console.error('[WHATSAPP] Failed to open chat:', contactName, e.message);
            return false;
        }
    }

    async logout() {
        if (fs.existsSync(COOKIES_FILE)) fs.unlinkSync(COOKIES_FILE);
        await this.cleanup();
        this.status = 'DISCONNECTED';
        
        // Also clear Playwright storage if it was used for non-Luca Link flow
        const authPath = path.join(DATA_DIR, '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
            } catch {
                // Ignore errors during auth path cleanup
            }
        }

        return { success: true };
    }

    async cleanup() {
        try {
            if (this.page) {
                await this.page.close().catch(e => console.log('Page close error', e.message));
                this.page = null;
            }
        } catch (e) {
            console.error('[WHATSAPP] Cleanup error:', e.message);
        }
    }

    // Adapt for routes that were written for wwebjs
    getClient() {
        return this;
    }
}

export const whatsappService = new WhatsAppService();
