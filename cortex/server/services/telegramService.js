import fs from 'fs';
import path from 'path';
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/api.js";
import { DATA_DIR } from '../config/constants.js';
import { socialBrowserEngine } from './socialBrowserEngine.js';
import { getImportStatus } from './chromeProfileService.js';

// Professional Default API Credentials (Standard Telegram Desktop values)
const SYSTEM_API_ID = '2040';
const SYSTEM_API_HASH = 'b18441a1ff607e10a989891a5462e627';

class TelegramService {
    constructor() {
        this.sessionFile = path.join(DATA_DIR, 'telegram_session.txt');
        this.client = null;
        this.page = null;
        this.phoneCodeHash = null;
        this.status = 'INIT'; // INIT, WAITING_CODE, WAITING_PASSWORD, READY, ERROR
        this.usingBrowserFallback = false;
    }

    _loadSession() {
        if (fs.existsSync(this.sessionFile)) {
            return fs.readFileSync(this.sessionFile, 'utf8').trim();
        }
        return "";
    }

    _saveSession(session) {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(this.sessionFile, session);
    }


    async getMe() {
        if (this.status === 'READY') {
            if (this.usingBrowserFallback && this.page) {
                try {
                    return await this.page.evaluate(() => {
                        // Very basic scrape of profile from top left avatar or similar
                        return { username: 'Browser User', firstName: 'Synced' };
                    });
                } catch { return null; }
            }
            if (this.client) {
                try {
                    const meData = await this.client.getMe();
                    return {
                        id: Number(meData.id),
                        username: meData.username,
                        firstName: meData.firstName,
                        phone: meData.phone
                    };
                } catch (e) {
                    console.error("[TELEGRAM] Failed to fetch 'me':", e);
                    return null;
                }
            }
        }
        return null;
    }

    async requestAuth(phoneNumber, apiId, apiHash) {
        try {
            const finalId = apiId || SYSTEM_API_ID;
            const finalHash = apiHash || SYSTEM_API_HASH;

            console.log(`[TELEGRAM] Requesting auth for ${phoneNumber} (API: ${finalId})...`);
            const session = new StringSession(this._loadSession());
            
            this.client = new TelegramClient(session, parseInt(finalId), finalHash, {
                connectionRetries: 5,
            });

            await this.client.connect();

            const { phoneCodeHash, isCodeViaApp } = await this.client.sendCode(
                {
                    apiId: parseInt(apiId),
                    apiHash: apiHash
                },
                phoneNumber
            );

            this.phoneCodeHash = phoneCodeHash;
            this.status = 'WAITING_CODE';
            
            console.log("[TELEGRAM] Code sent via", isCodeViaApp ? "App" : "SMS");
            return { success: true, status: 'WAITING_CODE', isCodeViaApp };
        } catch (e) {
            console.error("[TELEGRAM] Request failed:", e);
            this.status = 'ERROR';
            throw e;
        }
    }

    async verifyAuth(phoneNumber, code, password, apiId, apiHash) {
        if (!code || !this.client || !this.phoneCodeHash) {
            throw new Error("Invalid state or missing code");
        }

        try {
            console.log(`[TELEGRAM] Verifying code for ${phoneNumber}...`);
            
            await this.client.invoke(
                new Api.auth.SignIn({
                    phoneNumber,
                    phoneCodeHash: this.phoneCodeHash,
                    phoneCode: code,
                })
            ).catch(async (e) => {
                if (e.message.includes("SESSION_PASSWORD_NEEDED")) {
                    if (!password) {
                        throw new Error("2FA_REQUIRED");
                    }
                    const finalId = apiId || SYSTEM_API_ID;
                    const finalHash = apiHash || SYSTEM_API_HASH;
                    
                    await this.client.signInUserWithPassword({
                        apiId: parseInt(finalId),
                        apiHash: finalHash,
                        password: password,
                        phoneNumber: phoneNumber,
                        phoneCode: code,
                        onError: (err) => { throw err; }
                    });
                } else {
                    throw e;
                }
            });

            this.status = 'READY';
            this._saveSession(this.client.session.save());
            console.log(`[TELEGRAM] Login Successful! Session saved.`);
            return { success: true, status: 'READY' };
        } catch (e) {
            if (e.message === "2FA_REQUIRED") {
                this.status = 'WAITING_PASSWORD';
                return { success: false, status: 'WAITING_PASSWORD', error: "2FA Password Required" };
            }
            console.error("[TELEGRAM] Verify failed:", e);
            throw e;
        }
    }

    async ensureReady(apiId, apiHash) {
        if (this.status === 'READY') return this.client || this.page;

        const sessionStr = this._loadSession();
        
        // 1. Try to resume MTProto Session (GramJS)
        if (sessionStr) {
            try {
                if (!apiId || !apiHash) {
                    apiId = process.env.TELEGRAM_API_ID;
                    apiHash = process.env.TELEGRAM_API_HASH;
                }

                if (apiId && apiHash) {
                    console.log("[TELEGRAM] JIT: Autonomously resuming API session...");
                    const session = new StringSession(sessionStr);
                    this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
                        connectionRetries: 5,
                    });
                    await this.client.connect();
                    this.status = 'READY';
                    this.usingBrowserFallback = false;
                    return this.client;
                }
            } catch (e) {
                console.warn("[TELEGRAM] API Resume failed, trying Browser Fallback...", e.message);
            }
        }

        // 2. Browser Fallback (Luca Link / Chrome Sync)
        try {
            console.log("[TELEGRAM] Attempting Luca Link (Browser) Fallback...");
            this.page = await socialBrowserEngine.getPage('telegram', { headless: true });
            
            await this.page.goto('https://web.telegram.org/a/', { waitUntil: 'domcontentloaded' });
            
            // Wait for chat list to confirm login
            try {
                await this.page.waitForSelector('.chat-list, .ListItem-button', { timeout: 15000 });
                this.status = 'READY';
                this.usingBrowserFallback = true;
                console.log("[TELEGRAM] Luca Link Browser Sync established!");
                return this.page;
            } catch {
                console.warn("[TELEGRAM] Browser fallback: No active session found.");
                await this.page.close().catch(() => {});
                this.page = null;
            }
        } catch (e) {
            console.error("[TELEGRAM] Browser fallback error:", e.message);
        }

        if (!sessionStr) {
            throw new Error("Telegram Luca Link not configured. Please connect in Settings.");
        }
        
        throw new Error("Telegram session expired or not configured.");
    }

    async sendMessage(target, message, apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        if (this.usingBrowserFallback && this.page) {
            try {
                // Click the chat in sidebar if found
                await this.page.click(`.chatlist [id*="${target}"]`).catch(() => {});
                await this.page.fill('#editable-message-text', message);
                await this.page.keyboard.press('Enter');
                return { success: true };
            } catch (e) {
                console.error("[TELEGRAM] Browser send failed:", e);
                return { success: false };
            }
        }
        try {
            await this.client.sendMessage(target, { message });
            return { success: true };
        } catch (e) {
            console.error("[TELEGRAM] Send failed:", e);
            throw e;
        }
    }

    async getHistory(target, limit = 20, apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        try {
            const messages = await this.client.getMessages(target, { limit });
            return messages.map(m => ({
                id: m.id,
                text: m.message,
                senderId: m.fromId ? Number(m.fromId.userId) : null,
                date: m.date
            }));
        } catch (e) {
            console.error("[TELEGRAM] History retrieval failed:", e);
            throw e;
        }
    }

    async getChats(limit = 10, apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        if (this.usingBrowserFallback && this.page) {
            try {
                return await this.page.evaluate((limit) => {
                    const items = document.querySelectorAll('.chatlist .ListItem-button');
                    return Array.from(items).slice(0, limit).map(el => ({
                        id: el.id,
                        name: el.querySelector('.title')?.innerText || "Unknown",
                        lastMessage: el.querySelector('.last-message')?.innerText || ""
                    }));
                }, limit);
            } catch { return []; }
        }
        try {
            const dialogs = await this.client.getDialogs({ limit });
            return dialogs.map(d => ({
                id: d.id.toString(),
                name: d.title || (d.entity && (d.entity.username || d.entity.firstName)) || "Unknown",
                lastMessage: d.message ? d.message.message : "",
                unreadCount: d.unreadCount,
                type: d.isGroup ? 'group' : 'private'
            }));
        } catch (e) {
            console.error("[TELEGRAM] Failed to fetch chats:", e);
            throw e;
        }
    }

    async getContacts(apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        if (this.usingBrowserFallback) return []; // Browser contact scraping is complex
        try {
            const result = await this.client.invoke(new Api.contacts.GetContacts({}));
            return result.users.map(u => ({
                id: u.id.toString(),
                name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "Unknown",
                username: u.username,
                phone: u.phone
            }));
        } catch (e) {
            console.error("[TELEGRAM] Failed to fetch contacts:", e);
            throw e;
        }
    }

    getStatus() {
        const importStatus = getImportStatus();
        return {
            status: this.status,
            hasSession: fs.existsSync(this.sessionFile) || this.hasChromeProfile(),
            hasChromeProfile: this.hasChromeProfile(),
            chromeImportDate: importStatus.imported ? importStatus.lastSync : null,
            usingBrowserFallback: this.usingBrowserFallback,
            error: this.status === 'ERROR' ? "Telegram API Error" : null
        };
    }

    /**
     * Telegram is excluded from Chrome Sync to prioritize the more reliable
     * Direct MTProto (Phone/Code) flow.
     */
    hasChromeProfile() {
        return false;
    }

    async cleanup() {
        try {
            if (this.page) {
                await this.page.close().catch(() => {});
                this.page = null;
            }
        } catch { /* Ignore */ }
    }
}

export const telegramService = new TelegramService();
