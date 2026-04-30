import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SECURITY_DIR } from '../config/constants.js';

const SECRET_FILE = path.join(SECURITY_DIR, 'luca_secret.key');

class SecurityManager {
    constructor() {
        this.token = null;
        this.godMode = false; // Default to Safe Mode
        this.initialize();
    }

    initialize() {
        if (!fs.existsSync(SECURITY_DIR)) {
            fs.mkdirSync(SECURITY_DIR, { recursive: true });
        }

        // Priority 1: Environment Variable (passed from Electron Main)
        if (process.env.LUCA_SECRET) {
            this.token = process.env.LUCA_SECRET;
            console.log('[SecurityManager] Master token initialized from environment.');
            return;
        }

        // Priority 2: Disk Cache
        if (fs.existsSync(SECRET_FILE)) {
            this.token = fs.readFileSync(SECRET_FILE, 'utf8').trim();
            console.log('[SecurityManager] Master token loaded from disk.');
        } else {
            this.generateNewToken();
        }
    }

    generateNewToken() {
        this.token = crypto.randomBytes(32).toString('hex'); // 64-char hex string
        fs.writeFileSync(SECRET_FILE, this.token, { mode: 0o600 });
        console.log('[SecurityManager] New master token generated and secured.');
    }

    validateToken(receivedToken) {
        if (!this.token || !receivedToken) return false;
        // Use timingSafeEqual to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(this.token),
            Buffer.from(receivedToken)
        );
    }

    setGodMode(enabled) {
        this.godMode = !!enabled;
        console.log(`[SecurityManager] God Mode is now: ${this.godMode ? 'ENABLED ⚠️' : 'DISABLED ✅'}`);
    }

    isGodMode() {
        return this.godMode;
    }

    getPublicToken() {
        // Only provide the token if requested via a secure internal channel (like IPC)
        // In this architecture, we expect the frontend to retrieve this via and IPC call to the main process
        return this.token;
    }
}

export const securityManager = new SecurityManager();
export default securityManager;
