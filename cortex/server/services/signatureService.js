import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * SignatureService
 * Handles cryptographic signing and verification of LUCA Skills.
 * Uses RSA-SHA256 for integrity and authenticity.
 */
class SignatureService {
    constructor() {
        this.privateKey = null;
        this.publicKey = null;
        this.keyDir = path.join(process.env.HOME || '', '.luca', 'keys');
        this.privKeyPath = path.join(this.keyDir, 'skill_root.priv');
        this.pubKeyPath = path.join(this.keyDir, 'skill_root.pub');

        this.initializeKeys();
    }

    /**
     * Ensure we have a system root key for signing
     */
    initializeKeys() {
        if (!fs.existsSync(this.keyDir)) {
            fs.mkdirSync(this.keyDir, { recursive: true });
        }

        if (fs.existsSync(this.privKeyPath) && fs.existsSync(this.pubKeyPath)) {
            this.privateKey = fs.readFileSync(this.privKeyPath, 'utf8');
            this.publicKey = fs.readFileSync(this.pubKeyPath, 'utf8');
            console.log('[SIGNATURE] Root keys loaded from disk.');
        } else {
            console.log('[SIGNATURE] Generating new Root Keys...');
            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
            this.privateKey = privateKey;
            this.publicKey = publicKey;
            fs.writeFileSync(this.privKeyPath, privateKey);
            fs.writeFileSync(this.pubKeyPath, publicKey);
            console.log('[SIGNATURE] Root keys generated and saved.');
        }
    }

    /**
     * Sign skill payload (SKILL.md + main script)
     */
    signSkill(payload) {
        if (!this.privateKey) throw new Error('Private key not initialized');
        
        const sign = crypto.createSign('SHA256');
        sign.update(payload);
        sign.end();
        
        return sign.sign(this.privateKey, 'base64');
    }

    /**
     * Verify skill payload against a signature
     */
    verifySkill(payload, signature) {
        if (!this.publicKey) throw new Error('Public key not initialized');
        
        const verify = crypto.createVerify('SHA256');
        verify.update(payload);
        verify.end();
        
        try {
            return verify.verify(this.publicKey, signature, 'base64');
        } catch (e) {
            console.error('[SIGNATURE] Verification error:', e);
            return false;
        }
    }

    getPublicKey() {
        return this.publicKey || '';
    }
}

export const signatureService = new SignatureService();
