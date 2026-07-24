import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  generateToken,
  generateSessionId,
  timingSafeEqualStr,
  isPairingAuthorized,
  verifyTelegramSecret,
  verifyDiscordSignature,
  isTelegramChatAllowed,
  isDiscordUserAllowed,
} from "./auth.js";

// Minimal Express-req stub: case-insensitive .get() plus optional rawBody.
function fakeReq(headers = {}, rawBody) {
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return { get: (h) => lower[String(h).toLowerCase()], rawBody };
}

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("tokens are CSPRNG, prefixed, and unique", () => {
  const a = generateToken();
  const b = generateToken();
  assert.match(a, /^RELAY-[0-9a-f]{48}$/);
  assert.notEqual(a, b);
  assert.match(generateSessionId(), /^GUEST-[0-9A-F]{18}$/);
});

test("timingSafeEqualStr rejects mismatches and empty", () => {
  assert.equal(timingSafeEqualStr("abc", "abc"), true);
  assert.equal(timingSafeEqualStr("abc", "abd"), false);
  assert.equal(timingSafeEqualStr("abc", "abcd"), false);
  assert.equal(timingSafeEqualStr("", ""), false);
  assert.equal(timingSafeEqualStr(undefined, undefined), false);
});

test("pairing mint fails closed when no secret configured", () => {
  withEnv({ LUCA_RELAY_PAIRING_SECRET: undefined }, () => {
    const res = isPairingAuthorized(fakeReq({ "x-relay-secret": "anything" }));
    assert.equal(res.ok, false);
    assert.equal(res.status, 503);
  });
});

test("pairing mint requires the correct shared secret", () => {
  withEnv({ LUCA_RELAY_PAIRING_SECRET: "s3cret" }, () => {
    assert.equal(isPairingAuthorized(fakeReq({ "x-relay-secret": "wrong" })).status, 401);
    assert.equal(isPairingAuthorized(fakeReq({})).status, 401);
    assert.equal(isPairingAuthorized(fakeReq({ "x-relay-secret": "s3cret" })).ok, true);
  });
});

test("telegram webhook secret fails closed and matches", () => {
  withEnv({ TELEGRAM_WEBHOOK_SECRET: undefined }, () => {
    assert.equal(verifyTelegramSecret(fakeReq({ "x-telegram-bot-api-secret-token": "x" })), false);
  });
  withEnv({ TELEGRAM_WEBHOOK_SECRET: "hook-secret" }, () => {
    assert.equal(verifyTelegramSecret(fakeReq({ "x-telegram-bot-api-secret-token": "hook-secret" })), true);
    assert.equal(verifyTelegramSecret(fakeReq({ "x-telegram-bot-api-secret-token": "nope" })), false);
    assert.equal(verifyTelegramSecret(fakeReq({})), false);
  });
});

test("id allowlists fail closed when unset and gate exact ids", () => {
  withEnv({ TELEGRAM_ALLOWED_CHAT_IDS: undefined }, () => {
    assert.equal(isTelegramChatAllowed("123"), false);
  });
  withEnv({ TELEGRAM_ALLOWED_CHAT_IDS: "123, 456" }, () => {
    assert.equal(isTelegramChatAllowed("123"), true);
    assert.equal(isTelegramChatAllowed(456), true);
    assert.equal(isTelegramChatAllowed("789"), false);
  });
  withEnv({ DISCORD_ALLOWED_USER_IDS: "u1" }, () => {
    assert.equal(isDiscordUserAllowed("u1"), true);
    assert.equal(isDiscordUserAllowed("u2"), false);
    assert.equal(isDiscordUserAllowed(null), false);
  });
});

test("discord signature verifies a genuine Ed25519 signature and rejects tampering", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPubHex = publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("hex");

  const timestamp = "1700000000";
  const body = Buffer.from(JSON.stringify({ type: 2, data: { name: "screen" } }));
  const signature = crypto
    .sign(null, Buffer.concat([Buffer.from(timestamp), body]), privateKey)
    .toString("hex");

  withEnv({ DISCORD_PUBLIC_KEY: rawPubHex }, () => {
    const good = fakeReq(
      { "x-signature-ed25519": signature, "x-signature-timestamp": timestamp },
      body,
    );
    assert.equal(verifyDiscordSignature(good), true);

    // Tampered body must fail.
    const tampered = fakeReq(
      { "x-signature-ed25519": signature, "x-signature-timestamp": timestamp },
      Buffer.from(JSON.stringify({ type: 2, data: { name: "wipe" } })),
    );
    assert.equal(verifyDiscordSignature(tampered), false);

    // Missing headers fail.
    assert.equal(verifyDiscordSignature(fakeReq({}, body)), false);
  });

  // Fails closed with no public key configured.
  withEnv({ DISCORD_PUBLIC_KEY: undefined }, () => {
    assert.equal(
      verifyDiscordSignature(
        fakeReq({ "x-signature-ed25519": signature, "x-signature-timestamp": timestamp }, body),
      ),
      false,
    );
  });
});
