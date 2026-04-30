/**
 * Social Browser Engine
 * Centralizes Playwright browser management for all social services
 * to reduce overall RAM usage and provide a unified idle lifecycle.
 */

import { chromium } from 'playwright';
import { getLucaBrowserProfilePath } from './chromeProfileService.js';
import path from 'path';
import fs from 'fs';
import { DATA_DIR } from '../config/constants.js';

class SocialBrowserEngine {
    constructor() {
        this.browser = null;
        this.context = null;
        this.pages = new Map(); // serviceName -> page
        this.idleTimer = null;
        this.IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
        this.isInitializing = false;
    }

    /**
     * Get or create a page for a specific service
     */
    async getPage(serviceName, options = {}) {
        this.keepAlive();
        
        if (this.pages.has(serviceName)) {
            const page = this.pages.get(serviceName);
            if (!page.isClosed()) return page;
            this.pages.delete(serviceName);
        }

        const context = await this.ensureContext(options.headless !== false);
        const page = await context.newPage();
        this.pages.set(serviceName, page);
        return page;
    }

    /**
     * Ensure a browser context is available
     */
    async ensureContext(headless = true) {
        if (this.context) return this.context;
        
        if (this.isInitializing) {
            while (this.isInitializing) {
                await new Promise(r => setTimeout(r, 500));
            }
            if (this.context) return this.context;
        }

        this.isInitializing = true;
        try {
            const profilePath = getLucaBrowserProfilePath();
            
            if (profilePath) {
                // Point to the 'Partitions/luca' subdirectory where we import the session data
                const partitionProfilePath = path.join(profilePath, 'Partitions', 'luca');
                console.log(`[SocialEngine] Launching shared browser with profile: ${partitionProfilePath}`);
                this.context = await chromium.launchPersistentContext(partitionProfilePath, {
                    headless,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                    viewport: { width: 1280, height: 800 }
                });
            } else {
                console.log('[SocialEngine] Launching shared browser (no profile)');
                this.browser = await chromium.launch({
                    headless,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });
                this.context = await this.browser.newContext({
                    viewport: { width: 1280, height: 800 }
                });
            }
            
            return this.context;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Keep the browser engine alive by resetting the idle timer.
     * Call this during long-running operations to prevent shutdown.
     */
    keepAlive() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.shutdown(), this.IDLE_TIMEOUT);
    }

    /**
     * Shutdown the browser engine to free up RAM
     */
    async shutdown() {
        console.log('[SocialEngine] Checking for idle services...');
        
        // Load persistence settings from disk
        let persistence = {};
        try {
            const settingsFile = path.join(DATA_DIR, 'social-settings.json');
            if (fs.existsSync(settingsFile)) {
                persistence = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            }
        } catch (e) {
            console.warn('[SocialEngine] Failed to load persistence settings:', e.message);
        }

        try {
            const servicesToClose = [];
            for (const serviceName of this.pages.keys()) {
                // Only close if NOT marked as ALWAYS_ON
                if (persistence[serviceName] !== 'ALWAYS_ON') {
                    servicesToClose.push(serviceName);
                } else {
                    console.log(`[SocialEngine] Keeping ${serviceName} alive (Persistent Mode)`);
                }
            }

            if (servicesToClose.length === 0 && this.pages.size > 0) {
                console.log('[SocialEngine] No services to close. All active services are persistent.');
                this.keepAlive(); // Reset timer to check again later
                return;
            }

            for (const serviceName of servicesToClose) {
                await this.pages.get(serviceName).close().catch(() => {});
                this.pages.delete(serviceName);
                console.log(`[SocialEngine] Closed idle service: ${serviceName}`);
            }
            
            // Only close context and browser if NOTHING is left
            if (this.pages.size === 0) {
                console.log('[SocialEngine] All services closed. Shutting down browser core.');
                if (this.context) await this.context.close().catch(() => {});
                if (this.browser) await this.browser.close().catch(() => {});
                this.context = null;
                this.browser = null;
            }
        } catch (e) {
            console.error('[SocialEngine] Shutdown error:', e.message);
        } finally {
            if (this.idleTimer && this.pages.size === 0) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
            } else if (this.pages.size > 0) {
                // Some pages stayed open, reset timer
                this.keepAlive();
            }
        }
    }
}

export const socialBrowserEngine = new SocialBrowserEngine();
