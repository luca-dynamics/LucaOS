/**
 * Authentication + secure-token helpers for the relay hub.
 *
 * Every check here FAILS CLOSED: if the operator has not configured the
 * relevant secret/allowlist, the check denies. An unconfigured relay must not
 * be an open remote-command surface — the previous behaviour (unauthenticated
 * pairing mint + unauthenticated bot webhooks + Math.random tokens) is exactly
 * what this module removes.
 */

import crypto from "node:crypto";

/** CSPRNG pairing token (replaces Math.random, which is predictable). */
export function generateToken() {
  return "RELAY-" + crypto.randomBytes(24).toString("hex");
}

/** CSPRNG guest session id (gates access to a live desktop stream). */
export function generateSessionId() {
  return "GUEST-" + crypto.randomBytes(9).toString("hex").toUpperCase();
}

/** Constant-time string compare; false on any length/'' mismatch. */
export function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Pairing-token minting must be authenticated with a shared secret that only
 * the owner's desktop knows. Without LUCA_RELAY_PAIRING_SECRET set, minting is
 * disabled entirely (fail closed) rather than open to the public.
 */
export function isPairingAuthorized(req) {
  const secret = process.env.LUCA_RELAY_PAIRING_SECRET;
  if (!secret) return { ok: false, status: 503, reason: "pairing_disabled" };
  const provided = req.get("x-relay-secret") || "";
  if (!timingSafeEqualStr(provided, secret)) {
    return { ok: false, status: 401, reason: "invalid_relay_secret" };
  }
  return { ok: true };
}

/** Verify Telegram's webhook secret-token header (set when registering the webhook). */
export function verifyTelegramSecret(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed
  const provided = req.get("x-telegram-bot-api-secret-token") || "";
  return timingSafeEqualStr(provided, secret);
}

// Fixed 12-byte SPKI/DER prefix for an Ed25519 public key; prepending it to the
// 32-byte raw key yields a key crypto.createPublicKey can import.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Verify a Discord interaction's Ed25519 signature over (timestamp + rawBody)
 * using the application's public key. Requires req.rawBody (captured by the
 * express.json verify hook). Fails closed if the key is unset.
 */
export function verifyDiscordSignature(req) {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKeyHex) return false; // fail closed
  const signature = req.get("x-signature-ed25519");
  const timestamp = req.get("x-signature-timestamp");
  if (!signature || !timestamp || !req.rawBody) return false;
  try {
    const der = Buffer.concat([
      ED25519_SPKI_PREFIX,
      Buffer.from(publicKeyHex, "hex"),
    ]);
    const key = crypto.createPublicKey({
      key: der,
      format: "der",
      type: "spki",
    });
    const message = Buffer.concat([Buffer.from(timestamp), req.rawBody]);
    return crypto.verify(null, message, key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function parseIdList(envVal) {
  return new Set(
    String(envVal || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Only forward Telegram messages from explicitly allowlisted chats (fail closed if empty). */
export function isTelegramChatAllowed(chatId) {
  const allow = parseIdList(process.env.TELEGRAM_ALLOWED_CHAT_IDS);
  return allow.size > 0 && allow.has(String(chatId));
}

/** Only forward Discord interactions from explicitly allowlisted users (fail closed if empty). */
export function isDiscordUserAllowed(userId) {
  const allow = parseIdList(process.env.DISCORD_ALLOWED_USER_IDS);
  return allow.size > 0 && allow.has(String(userId));
}
