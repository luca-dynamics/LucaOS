/**
 * 🔐 Secure Vault
 *
 * Stores sensitive credentials encrypted at rest.
 * Supports Phase 16.3 Elite Key Rotation.
 *
 * A logical key is not a filename. Callers use keys like
 * `setting:brain:geminiApiKey` (the renderer's settings path) and arbitrary site
 * names typed by the user, neither of which is safe to concatenate into a path:
 * on Windows `:` is the alternate-data-stream separator, so that write fails with
 * ENOENT, and `nul` names the null device no matter the extension — a write that
 * silently succeeds and reads back nothing. `encodeVaultKey` maps a key to a
 * portable filename and `decodeVaultKey` inverts it, so `list()` still returns
 * the keys callers passed in (forexAccountManager retrieves by them).
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { SECURITY_DIR } from '../config/constants.js';

/**
 * Characters `encodeURIComponent` leaves alone but a filename cannot afford:
 * `*` is illegal on Windows, and the rest are legal but awkward enough in shells
 * and globs that escaping them costs nothing.
 */
const RESIDUAL_UNSAFE = /[!'()*~]/g;

/** Windows device names, which resolve to the device with any extension attached. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const percentEscape = (ch) =>
  `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;

/**
 * Map a logical vault key to a filesystem-safe name.
 *
 * `encodeURIComponent` does the work — it escapes `:`, `/`, `\`, `?`, `|`, `"`,
 * `<`, `>`, control characters and `%` itself, and encodes non-ASCII as UTF-8, so
 * the whole thing round-trips through `decodeURIComponent`. A no-op for keys that
 * were already safe, which keeps existing `.enc` files readable.
 */
export function encodeVaultKey(key) {
  const escaped = encodeURIComponent(String(key)).replace(RESIDUAL_UNSAFE, percentEscape);
  // Escaping the first character is enough to stop a device name resolving as one,
  // and decodeVaultKey reverses it like any other escape.
  return RESERVED_NAMES.test(escaped)
    ? percentEscape(escaped[0]) + escaped.slice(1)
    : escaped;
}

/**
 * Inverse of `encodeVaultKey`. Falls back to the raw name for anything that is not
 * valid percent-encoding, so one stray file in the directory cannot break `list()`.
 */
export function decodeVaultKey(name) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** The extension every vault entry carries on disk. */
export const VAULT_FILE_EXT = '.enc';

/**
 * Recover the logical key from a vault filename.
 *
 * Strips the extension by length, not by `replace('.enc', '')` — the latter cuts
 * the *first* occurrence anywhere in the name, so a key like `x.enclosure` came
 * back as `xlosure.enc`.
 */
export function vaultKeyFromFileName(fileName) {
  const base = fileName.endsWith(VAULT_FILE_EXT)
    ? fileName.slice(0, -VAULT_FILE_EXT.length)
    : fileName;
  return decodeVaultKey(base);
}

export class SecureVault {
  /**
   * @param {{ dir?: string }} [options] `dir` overrides the vault directory, so
   *   tests can round-trip against a temp dir instead of the user's home.
   */
  constructor({ dir = SECURITY_DIR } = {}) {
    this.vaultDir = dir;
    this.ensureVaultDir();
    this._masterKey = process.env.VAULT_KEY || 'luca-vault-secret-key-change-in-production';
  }

  /** Absolute path of the file backing a logical key. */
  _pathFor(key) {
    return path.join(this.vaultDir, `${encodeVaultKey(key)}${VAULT_FILE_EXT}`);
  }

  async ensureVaultDir() {
    try {
      await fs.mkdir(this.vaultDir, { recursive: true });
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
    await fs.writeFile(this._pathFor(key), JSON.stringify(encrypted), 'utf8');
    return true;
  }

  /**
   * Retrieve data from vault
   */
  async retrieve(key) {
    try {
      const fileData = await fs.readFile(this._pathFor(key), 'utf8');
      const encrypted = JSON.parse(fileData);
      return this.decrypt(encrypted);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key) {
    try {
      await fs.unlink(this._pathFor(key));
      return true;
    } catch {
      return true;
    }
  }

  async list() {
    try {
      const files = await fs.readdir(this.vaultDir);
      return files
        .filter(f => f.endsWith(VAULT_FILE_EXT))
        .map(vaultKeyFromFileName);
    } catch {
      return [];
    }
  }
}

export default new SecureVault();
