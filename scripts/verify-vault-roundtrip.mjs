/**
 * Proves the Secure Vault can actually store and retrieve the keys the app uses.
 *
 * Why this is a script and not a vitest file: `vite.config.ts` aliases `fs`,
 * `path` and `crypto` to `src/mocks/node_polyfills.js`, so under vitest the
 * vault's encryption and path handling are polyfills and a round trip would
 * prove nothing about the filesystem. The pure key -> filename mapping is unit
 * tested in `cortex/server/services/secureVault.test.ts`; this covers the part
 * only real Node can answer.
 *
 * The bug it guards: `store` used to concatenate the logical key straight into a
 * path, so `setting:brain:geminiApiKey` — the key `credentialResolver` derives
 * for every provider — failed with ENOENT on Windows, where `:` is the
 * alternate-data-stream separator. No provider key entered in Settings could
 * ever be persisted, which is why the vault directory contained no `.enc` files.
 *
 * Runs against a temp directory. Never touches the user's vault, and prints key
 * names and booleans only — never a stored value.
 *
 *   node scripts/verify-vault-roundtrip.mjs
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SecureVault } from "../cortex/server/services/secureVault.js";

/** The keys that matter, plus the ones a user could plausibly type as a site. */
const KEYS = [
  "setting:brain:geminiApiKey",
  "setting:brain:openRouterApiKey",
  "setting:voice:deepgramApiKey",
  "setting:iot:haToken",
  "admin_face_vector",
  "forex-account-1",
  "https://example.com/login",
  "100% legit",
  "spaced out",
  "café-münchen",
  "nul",
  "x.enclosure",
];

let failures = 0;

const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "luca-vault-verify-"));
console.log(`[verify-vault] temp vault: ${dir}\n`);

try {
  const vault = new SecureVault({ dir });
  await vault.ensureVaultDir();

  console.log("store -> retrieve, one entry per key shape:");
  for (const [i, key] of KEYS.entries()) {
    // A distinct, non-secret marker per key. Shaped like the credentials route
    // stores them, so `credentialResolver`'s `secured.password` read is covered.
    const payload = { username: key, password: `marker-${i}`, metadata: { i } };
    let stored = false;
    try {
      stored = await vault.store(key, payload);
    } catch (error) {
      check(key, false, `store threw ${error.code ?? ""} ${error.message}`);
      continue;
    }
    const back = await vault.retrieve(key);
    const ok =
      stored === true &&
      back !== null &&
      back.password === payload.password &&
      back.username === key &&
      back.metadata?.i === i;
    check(key, ok, ok ? "" : `retrieved ${back === null ? "null" : "a mismatch"}`);
  }

  console.log("\nlist() returns the logical keys, not filenames:");
  const listed = await vault.list();
  for (const key of KEYS) {
    check(key, listed.includes(key), listed.includes(key) ? "" : "missing from list()");
  }

  console.log("\nfilenames on disk are portable:");
  const files = await fs.readdir(dir);
  const illegal = files.filter((f) => /[<>:"/\\|?*]/.test(f));
  check("no forbidden character in any filename", illegal.length === 0, illegal.join(", "));
  check(
    `one file per key (${files.length} of ${KEYS.length})`,
    files.length === KEYS.length,
  );

  console.log("\ndelete() removes the right entry:");
  await vault.delete("setting:brain:geminiApiKey");
  check(
    "deleted key is gone",
    (await vault.retrieve("setting:brain:geminiApiKey")) === null,
  );
  check(
    "its neighbour survives",
    (await vault.retrieve("setting:brain:openRouterApiKey")) !== null,
  );

  console.log("\nretrieve() of an absent key is null, not a throw:");
  check("absent key", (await vault.retrieve("never:written")) === null);
} finally {
  await fs.rm(dir, { recursive: true, force: true });
  console.log(`\n[verify-vault] temp vault removed`);
}

if (failures > 0) {
  console.error(`\n[verify-vault] ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n[verify-vault] all checks passed");
