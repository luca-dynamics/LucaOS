import crypto from 'crypto';
import db from './db.js';

const MASTER_KEY_FORMAT_ERROR = 'Master Key must be 32 bytes (64 hex characters)';

const isBrowserWebHost = () =>
    typeof window !== 'undefined' &&
    !((typeof process !== 'undefined' && process.type === 'renderer') || window.process?.type === 'renderer') &&
    !window.electron &&
    !window.luca;

const classifyMasterKey = (masterKey) => {
    if (!masterKey) return { valid: false, status: 'missing', message: MASTER_KEY_FORMAT_ERROR };
    if (masterKey.length !== 64) return { valid: false, status: 'invalid length', message: MASTER_KEY_FORMAT_ERROR };
    if (!/^[0-9a-fA-F]{64}$/.test(masterKey)) return { valid: false, status: 'invalid hex', message: MASTER_KEY_FORMAT_ERROR };
    return { valid: true, status: 'valid', message: 'Master key is valid.' };
};

const publishWebSafeModeDiagnostic = (validation) => {
    if (!isBrowserWebHost()) return;

    window.__LUCA_WEB_SAFE_MODE__ = {
        ok: false,
        reason: 'invalid-master-key',
        message: validation.message,
        expectedKeyFormat: '64 hex characters / 32 bytes',
        keyStatus: validation.status,
        secureRuntimeAvailable: false,
        canMountWebUi: true,
        host: window.location?.host ?? 'browser',
        path: window.location?.pathname ?? '/',
    };
    window.__LUCA_CAPTURED_BOOT_ERRORS__ ??= [];
    window.__LUCA_CAPTURED_BOOT_ERRORS__.push(
        `handled: invalid-master-key (${validation.status})`,
    );
};

// --- Electron Safe Storage Check ---
let safeStorage = null;
try {
    // In Electron, we can use the safeStorage API which hooks into the system Keychain/DPAPI
    if (typeof window !== 'undefined' && window.electron && window.electron.safeStorage) {
        safeStorage = window.electron.safeStorage;
    }
} catch {
    console.warn('[VAULT] Electron safeStorage not available, using software fallback.');
}

// Master Key: MUST be set via LUCA_VAULT_KEY env var in production.
// Falls back to a randomly generated ephemeral key outside browser-only hosts.
let MASTER_KEY_HEX = typeof process !== 'undefined' ? process.env?.LUCA_VAULT_KEY : undefined;
if (!MASTER_KEY_HEX && !isBrowserWebHost()) {
    MASTER_KEY_HEX = crypto.randomBytes(32).toString('hex');
    console.warn('[VAULT] WARNING: LUCA_VAULT_KEY not set — using ephemeral random key. Encrypted data will NOT survive restarts. Set LUCA_VAULT_KEY in your environment for persistence.');
}

export class SecureVault {
    constructor(masterKey = null) {
        const validation = classifyMasterKey(masterKey || MASTER_KEY_HEX);
        this.webSafeMode = isBrowserWebHost() && !validation.valid;
        this.disabledReason = validation.valid ? null : validation.message;

        if (!validation.valid) {
            if (this.webSafeMode) {
                publishWebSafeModeDiagnostic(validation);
                this.key = null;
                return;
            }

            throw new Error(MASTER_KEY_FORMAT_ERROR);
        }

        this.key = Buffer.from(masterKey || MASTER_KEY_HEX, 'hex');
    }

    /**
     * ENCRYPT: Prioritizes Electron safeStorage (Keychain)
     */
    encrypt(text) {
        if (this.webSafeMode) {
            throw new Error('Secure vault unavailable in Web Safe Mode: invalid master key');
        }
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
            try {
                const encryptedBuffer = safeStorage.encryptString(text);
                return {
                    method: 'safeStorage',
                    data: encryptedBuffer.toString('base64')
                };
            } catch (e) {
                console.error('[VAULT] safeStorage encryption failed, falling back...', e);
            }
        }

        // --- Software Fallback (AES-256-GCM) ---
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return {
            method: 'aes-256-gcm',
            encrypted,
            iv: iv.toString('hex'),
            authTag
        };
    }

    /**
     * DECRYPT: Detects method used during encryption
     */
    decrypt(blob) {
        if (this.webSafeMode) {
            throw new Error('Secure vault unavailable in Web Safe Mode: invalid master key');
        }
        if (blob.method === 'safeStorage' && safeStorage) {
            try {
                return safeStorage.decryptString(Buffer.from(blob.data, 'base64'));
            } catch (e) {
                console.error('[VAULT] safeStorage decryption failed', e);
                throw new Error('Failed to decrypt from system Keychain');
            }
        }

        if (blob.method === 'aes-256-gcm') {
            const decipher = crypto.createDecipheriv(
                'aes-256-gcm', 
                this.key, 
                Buffer.from(blob.iv, 'hex')
            );
            decipher.setAuthTag(Buffer.from(blob.authTag, 'hex'));
            let decrypted = decipher.update(blob.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }

        throw new Error('Unknown encryption method or missing safeStorage provider');
    }

    // --- Vault Interface ---

    async store(site, username, password, metadata = {}) {
        try {
            const blob = this.encrypt(password);
            
            // Upsert into DB
            const stmt = db.prepare(`
                INSERT INTO credentials (site, username, encrypted_password, iv, auth_tag, metadata_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(site) DO UPDATE SET
                    username=excluded.username,
                    encrypted_password=excluded.encrypted_password,
                    iv=excluded.iv,
                    auth_tag=excluded.auth_tag,
                    metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
            `);
            
            // If using safeStorage, we store the base64 in encrypted_password and set iv to 'safeStorage'
            if (blob.method === 'safeStorage') {
                stmt.run(
                    site, 
                    username, 
                    blob.data, 
                    'safeStorage', 
                    '', 
                    JSON.stringify(metadata), 
                    Date.now()
                );
            } else {
                stmt.run(
                    site, 
                    username, 
                    blob.encrypted, 
                    blob.iv, 
                    blob.authTag, 
                    JSON.stringify(metadata), 
                    Date.now()
                );
            }

            console.log(`[VAULT] SECURELY STORED credentials for: ${site} via ${blob.method}`);
            return { success: true };
        } catch (_error) {
            console.error('[VAULT] Store failed:', _error);
            return { success: false, error: _error.message };
        }
    }

    async retrieve(site) {
        try {
            const row = db.prepare('SELECT * FROM credentials WHERE site = ?').get(site);
            if (!row) {
                return { success: false, error: 'Not found' };
            }

            let password;
            if (row.iv === 'safeStorage') {
                password = this.decrypt({ method: 'safeStorage', data: row.encrypted_password });
            } else {
                password = this.decrypt({ 
                    method: 'aes-256-gcm', 
                    encrypted: row.encrypted_password, 
                    iv: row.iv, 
                    authTag: row.auth_tag 
                });
            }

            return {
                success: true,
                site: row.site,
                username: row.username,
                password,
                metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
            };
        } catch (error) {
            console.error(`[VAULT] Retrieve failed for ${site}:`, error);
            return { success: false, error: error.message };
        }
    }

    async list() {
        try {
            const rows = db.prepare('SELECT site, username, metadata_json, updated_at FROM credentials').all();
            return rows.map(r => ({
                site: r.site,
                username: r.username,
                metadata: r.metadata_json ? JSON.parse(r.metadata_json) : {},
                updated_at: r.updated_at
            }));
        } catch {
            return [];
        }
    }

    async delete(site) {
        try {
            const res = db.prepare('DELETE FROM credentials WHERE site = ?').run(site);
            return { success: res.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async hasCredentials(site) {
        if (this.webSafeMode) return false;
        const row = db.prepare('SELECT 1 FROM credentials WHERE site = ?').get(site);
        return !!row;
    }

    /**
     * [2050 ALIEN TECH]: DNA Signature Export
     * Exports a public header for neural teleportation verification.
     */
    async exportPublicHeader() {
        if (this.webSafeMode) {
            return JSON.stringify({ vault: 'luca-secure-vault', available: false, reason: 'invalid-master-key' });
        }

        // High-entropy signature derived from the master key
        const signature = crypto.createHmac('sha256', this.key)
            .update('LUCA_NEURAL_TELEPORT_V1')
            .digest('hex');
        return `SIG-${signature.substring(0, 32)}...L-DNA`;
    }
}

export const secureVault = new SecureVault();
