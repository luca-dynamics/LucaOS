/**
 * Tests for the Secure Vault's key → filename mapping.
 *
 * Scope note: these cover the *pure* mapping, not a real store/retrieve round
 * trip. `vite.config.ts` aliases `crypto` and `path` to
 * `src/mocks/node_polyfills.js`, so `encrypt`/`_pathFor` cannot run for real
 * under vitest — a round-trip test here would be testing the polyfill. The real
 * filesystem round trip is proven by `scripts/verify-vault-roundtrip.mjs`
 * (`npm run verify:vault`), which runs under plain Node with real `fs`, `path`
 * and `crypto`.
 *
 * What is being guarded: a logical key is not a filename. Before this, `store`
 * concatenated the key straight into a path, so `setting:brain:geminiApiKey`
 * (the key `credentialResolver` uses for every provider) failed with ENOENT on
 * Windows — `:` is the alternate-data-stream separator. That is why the vault
 * directory has never contained a single `.enc` file.
 */

const { readFileSync } = process.getBuiltinModule("node:fs");

import { describe, expect, it } from "vitest";

import {
  VAULT_FILE_EXT,
  decodeVaultKey,
  encodeVaultKey,
  vaultKeyFromFileName,
} from "./secureVault.js";

/** Keys that must survive a trip through the filesystem unchanged in meaning. */
const HOSTILE_KEYS = [
  "setting:brain:geminiApiKey",
  "setting:brain:openRouterApiKey",
  "setting:voice:deepgramApiKey",
  "https://example.com/login",
  "back\\slash",
  "already%3Aescaped",
  "100% legit",
  'quote"mark',
  "star*wild",
  "question?mark",
  "pipe|char",
  "angle<brackets>",
  "spaced out key",
  "café-münchen",
  "中文キー",
  "nul",
  "NUL",
  "com1",
  "lpt9",
  "aux",
  "x.enclosure",
  "trailing.",
];

describe("encodeVaultKey", () => {
  it("escapes the colons that made every provider key unwritable", () => {
    expect(encodeVaultKey("setting:brain:geminiApiKey")).toBe(
      "setting%3Abrain%3AgeminiApiKey",
    );
  });

  it("leaves the keys already in use untouched, so no file needs renaming", () => {
    // The two admin vectors and the forex account keys are the only entries the
    // core writes today. If encoding renamed them, this change would need a
    // migration; it does not.
    for (const safe of [
      "admin_face_vector",
      "admin_voice_vector",
      "forex-account-1",
      "a.b_c-d",
      "PLAIN",
    ]) {
      expect(encodeVaultKey(safe)).toBe(safe);
    }
  });

  it("produces names with no character Windows forbids", () => {
    // < > : " / \ | ? * and control characters are the illegal set on NTFS.
    const forbidden = /[<>:"/\\|?*]/;
    for (const key of HOSTILE_KEYS) {
      expect(encodeVaultKey(key), `key ${JSON.stringify(key)}`).not.toMatch(
        forbidden,
      );
    }
  });

  it("defuses Windows device names, which resolve to the device with any extension", () => {
    // `nul.enc` opens the null device: the write appears to succeed and reads
    // back nothing. A site named "nul" is a plausible thing for a user to type.
    for (const device of ["con", "prn", "aux", "nul", "COM1", "lpt9", "NuL"]) {
      expect(encodeVaultKey(device)).not.toBe(device);
      expect(decodeVaultKey(encodeVaultKey(device))).toBe(device);
    }
  });

  it("does not mangle a name that merely starts with a device name", () => {
    expect(encodeVaultKey("console")).toBe("console");
    expect(encodeVaultKey("nullable")).toBe("nullable");
  });
});

describe("decodeVaultKey", () => {
  it("round-trips every hostile key", () => {
    for (const key of HOSTILE_KEYS) {
      expect(decodeVaultKey(encodeVaultKey(key)), `key ${JSON.stringify(key)}`).toBe(
        key,
      );
    }
  });

  it("returns a malformed name unchanged rather than throwing", () => {
    // One stray file in the vault directory must not break `list()`.
    expect(decodeVaultKey("%zz-not-encoding")).toBe("%zz-not-encoding");
    expect(decodeVaultKey("%")).toBe("%");
  });
});

describe("vaultKeyFromFileName", () => {
  it("strips the extension by length, not by first match", () => {
    // `'x.enclosure.enc'.replace('.enc', '')` returned 'xlosure.enc'.
    expect(vaultKeyFromFileName(`x.enclosure${VAULT_FILE_EXT}`)).toBe(
      "x.enclosure",
    );
    expect(vaultKeyFromFileName(`a${VAULT_FILE_EXT}${VAULT_FILE_EXT}`)).toBe(
      `a${VAULT_FILE_EXT}`,
    );
  });

  it("inverts encodeVaultKey for every hostile key, as list() relies on", () => {
    // forexAccountManager retrieves by the keys list() hands back, so the
    // filename -> key direction has to be exact.
    for (const key of HOSTILE_KEYS) {
      const fileName = `${encodeVaultKey(key)}${VAULT_FILE_EXT}`;
      expect(vaultKeyFromFileName(fileName), `key ${JSON.stringify(key)}`).toBe(key);
    }
  });
});

describe("SecureVault source", () => {
  const source = readFileSync(
    new URL("./secureVault.js", import.meta.url),
    "utf8",
  );

  it("routes every filesystem path through _pathFor", () => {
    // The bug this change fixes was a raw template literal in `store`. Any new
    // one would reintroduce it, so no path may be built outside _pathFor.
    const pathJoins = source.match(/path\.join\([^)]*\)/g) ?? [];
    expect(pathJoins).toHaveLength(1);
    expect(pathJoins[0]).toContain("encodeVaultKey");
  });

  it("takes its directory from the instance, not a module constant", () => {
    // An injectable dir is what lets the round-trip script run against a temp
    // directory instead of the user's home.
    expect(source).not.toContain("const VAULT_DIR");
    expect(source).toContain("this.vaultDir");
  });
});
