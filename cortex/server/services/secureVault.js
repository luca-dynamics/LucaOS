/**
 * 🔐 Secure Vault
 * 
 * Stores sensitive credentials encrypted at rest.
 * Supports Phase 16.3 Elite Key Rotation.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { SECURITY_DIR } from '../config/constants.js';

const VAULT_DIR = SECURITY_DIR;

export class SecureVault {
  constructor() {
    this.ensureVaultDir();
    this._masterKey = process.env.VAULT_KEY || 'luca-vault-secret-key-change-in-production';
  }

  async ensureVaultDir() {
    try {
      await fs.mkdir(VAULT_DIR, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('[SecureVault] Failed to create vault directory:', err);
      }
    }
  }

  /**
   * Derive a 32-byte key from the master secret
   */
  _deriveKey(masterKey) {
    return crypto.scryptSync(masterKey, 'luca-salt-2025', 32);
  }

  /**
   * Encrypt data
   */
  encrypt(data, customKey = null) {
    const algorithm = 'aes-256-cbc';
    const key = this._deriveKey(customKey || this._masterKey);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted, customKey = null) {
    const algorithm = 'aes-256-cbc';
    const key = this._deriveKey(customKey || this._masterKey);
    const iv = Buffer.from(encrypted.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * 🔄 Elite Key Rotation
   * Decrypts all files with old key and re-encrypts with new key.
   */
  async rotate(newKey) {
    console.log('[SecureVault] Starting Elite Key Rotation...');
    const keys = await this.list();
    
    for (const key of keys) {
      const data = await this.retrieve(key);
      // Re-store with the new master key (temporarily set)
      const oldMaster = this._masterKey;
      this._masterKey = newKey;
      await this.store(key, data);
      this._masterKey = oldMaster; // Restore until loop is done or config updated
    }

    this._masterKey = newKey;
    console.log('[SecureVault] Key Rotation Complete. All entries updated.');
    return true;
  }

  /**
   * Store data in vault
   */
  async store(key, data) {
    const encrypted = this.encrypt(data);
    const filePath = path.join(VAULT_DIR, `${key}.enc`);
    await fs.writeFile(filePath, JSON.stringify(encrypted), 'utf8');
    return true;
  }

  /**
   * Retrieve data from vault
   */
  async retrieve(key) {
    try {
      const filePath = path.join(VAULT_DIR, `${key}.enc`);
      const fileData = await fs.readFile(filePath, 'utf8');
      const encrypted = JSON.parse(fileData);
      return this.decrypt(encrypted);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key) {
    try {
      const filePath = path.join(VAULT_DIR, `${key}.enc`);
      await fs.unlink(filePath);
      return true;
    } catch {
      return true;
    }
  }

  async list() {
    try {
      const files = await fs.readdir(VAULT_DIR);
      return files
        .filter(f => f.endsWith('.enc'))
        .map(f => f.replace('.enc', ''));
    } catch {
      return [];
    }
  }
}

export default new SecureVault();
