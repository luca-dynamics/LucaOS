import * as naclModule from "tweetnacl";
import * as naclUtilModule from "tweetnacl-util";
import CryptoJS from "crypto-js";
import type { EncryptedMessage, KeyPair, SharedSecret } from "./types";

const nacl = (naclModule as any).default || naclModule;
const naclUtil = (naclUtilModule as any).default || naclUtilModule;

const { encodeBase64, decodeUTF8, decodeBase64 } = naclUtil;

/**
 * CryptoService - Handles all encryption, decryption, and signing for Luca Link
 *
 * Features:
 * - Diffie-Hellman key exchange
 * - AES-256-GCM encryption
 * - HMAC-SHA256 signing
 * - Nonce generation for replay protection
 * - Key rotation
 */
export class CryptoService {
  private static readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly NONCE_LENGTH = 24;

  /**
   * Generate a new key pair for Diffie-Hellman key exchange
   */
  static generateKeyPair(): KeyPair {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };
  }

  /**
   * Derive shared secret from public and private keys
   */
  static deriveSharedSecret(
    theirPublicKey: Uint8Array,
    mySecretKey: Uint8Array
  ): SharedSecret {
    // Use X25519 key agreement
    const shared = nacl.box.before(theirPublicKey, mySecretKey);

    return {
      key: shared,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.KEY_ROTATION_INTERVAL,
    };
  }

  /**
   * Generate a random nonce for replay protection
   */
  static generateNonce(): string {
    const nonce = nacl.randomBytes(this.NONCE_LENGTH);
    return encodeBase64(nonce);
  }

  /**
   * Encrypt a message using AES-256-GCM (Hardware Accelerated)
   */
  static async encrypt(
    message: string,
    sharedSecret: Uint8Array
  ): Promise<{ encrypted: string; iv: string }> {
    const crypto = (global as any).crypto || (global as any).window?.crypto;
    if (!crypto?.subtle) {
      throw new Error("Substrate Failure: WebCrypto not available.");
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey(
      "raw",
      sharedSecret,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    return {
      encrypted: Buffer.from(encrypted).toString("base64"),
      iv: Buffer.from(iv).toString("base64"),
    };
  }

  /**
   * Decrypt a message using AES-256-GCM
   */
  static async decrypt(
    encryptedData: string,
    iv: string,
    sharedSecret: Uint8Array
  ): Promise<string> {
    const crypto = (global as any).crypto || (global as any).window?.crypto;
    if (!crypto?.subtle) {
      throw new Error("Substrate Failure: WebCrypto not available.");
    }

    const ivBytes = Buffer.from(iv, "base64");
    const dataBytes = Buffer.from(encryptedData, "base64");
    
    const key = await crypto.subtle.importKey(
      "raw",
      sharedSecret,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      key,
      dataBytes
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Sign a message using HMAC-SHA256
   */
  static sign(message: string, sharedSecret: Uint8Array): string {
    const key = CryptoJS.lib.WordArray.create(sharedSecret as any);
    const signature = CryptoJS.HmacSHA256(message, key);
    return signature.toString(CryptoJS.enc.Base64);
  }

  /**
   * HMAC Verification
   */
  static verifySignature(
    message: string,
    signature: string,
    sharedSecret: Uint8Array
  ): boolean {
    const expectedSignature = this.sign(message, sharedSecret);
    return signature === expectedSignature;
  }

  /**
   * Generate an Ed25519 identity key pair
   */
  static generateIdentityKeyPair(): KeyPair {
    const keyPair = nacl.sign.keyPair();
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };
  }

  /**
   * Sign a payload using Ed25519
   */
  static signPayload(payload: any, secretKey: Uint8Array): string {
    const message = decodeUTF8(JSON.stringify(payload));
    const signature = nacl.sign.detached(message, secretKey);
    return encodeBase64(signature);
  }

  /**
   * Verify an Ed25519 signature
   */
  static verifyPayload(
    payload: any,
    signature: string,
    publicKey: Uint8Array
  ): boolean {
    try {
      const message = decodeUTF8(JSON.stringify(payload));
      const sig = decodeBase64(signature);
      return nacl.sign.detached.verify(message, sig, publicKey);
    } catch (e) {
      console.error("[CryptoService] Signature verification error:", e);
      return false;
    }
  }

  /**
   * Create an encrypted message with signature
   */
  static async createSecureMessage(
    payload: any,
    sharedSecret: Uint8Array
  ): Promise<EncryptedMessage> {
    const nonce = this.generateNonce();
    const timestamp = Date.now();

    // Serialize payload
    const message = JSON.stringify(payload);

    // Encrypt (Now async GCM)
    const { encrypted, iv } = await this.encrypt(message, sharedSecret);

    // Sign the encrypted data + metadata (Neural Signature)
    const dataToSign = `${encrypted}|${iv}|${timestamp}|${nonce}`;
    const signature = this.sign(dataToSign, sharedSecret);

    return {
      encrypted,
      iv,
      signature,
      timestamp,
      nonce,
    };
  }

  /**
   * Decrypt and verify a secure message
   */
  static async decryptSecureMessage(
    encryptedMessage: EncryptedMessage,
    sharedSecret: Uint8Array,
    maxAge: number = 60000 // 60 seconds default
  ): Promise<any> {
    const { encrypted, iv, signature, timestamp, nonce } = encryptedMessage;

    // Check message age (replay protection)
    const age = Date.now() - timestamp;
    if (age > maxAge) {
      throw new Error(`Neural Decay: Packet too old: ${age}ms (max: ${maxAge}ms)`);
    }

    // Verify signature (Integrity check)
    const dataToVerify = `${encrypted}|${iv}|${timestamp}|${nonce}`;
    if (!this.verifySignature(dataToVerify, signature, sharedSecret)) {
      throw new Error(
        "Neural Fracture: Signature mismatch - packet may have been intercepted."
      );
    }

    // Decrypt (Now async GCM)
    const decrypted = await this.decrypt(encrypted, iv, sharedSecret);

    // Parse JSON
    try {
      return JSON.parse(decrypted);
    } catch {
      throw new Error("Neural Corruption: Failed to parse decrypted packet.");
    }
  }

  /**
   * Check if a shared secret needs rotation
   */
  static needsRotation(sharedSecret: SharedSecret): boolean {
    return Date.now() >= sharedSecret.expiresAt;
  }

  /**
   * Convert Uint8Array to base64 string for storage
   */
  static encodeKey(key: Uint8Array): string {
    return encodeBase64(key);
  }

  /**
   * Convert base64 string back to Uint8Array
   */
  static decodeKey(encoded: string): Uint8Array {
    return decodeBase64(encoded);
  }

  /**
   * Securely store a shared secret (encrypts with a master key)
   * In production, use a proper key management service
   */
  static storeSecret(secret: Uint8Array, masterPassword: string): string {
    const key = CryptoJS.lib.WordArray.create(secret as any);
    const encrypted = CryptoJS.AES.encrypt(
      key.toString(CryptoJS.enc.Base64),
      masterPassword
    );
    return encrypted.toString();
  }

  /**
   * Retrieve and decrypt a stored secret
   */
  static retrieveSecret(encrypted: string, masterPassword: string): Uint8Array {
    const decrypted = CryptoJS.AES.decrypt(encrypted, masterPassword);
    const keyString = decrypted.toString(CryptoJS.enc.Utf8);
    return this.decodeKey(keyString);
  }
}
