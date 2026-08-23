# ADR-0018: The core owns the Secure Vault; the renderer reaches it over the API

## Status

Accepted

## Context

LucaOS has had a Secure Vault for as long as it has had a Settings screen. It has
an encryption service, a master key on disk, a typed renderer client
(`src/services/secureVault.ts`), an IPC surface (`preload.cjs`), a proxy in the
Electron main process, and a consumer in the core
(`credentialResolver.getApiKey`). Every piece existed. **The wire between them did
not, and no key entered in Settings had ever reached the core.**

That is a strong claim, so here is the evidence rather than the inference. The
path a provider key takes, as it stood:

```
Settings UI → settingsService.saveSettings()
  → secureVault.store("setting:brain:openaiApiKey", …)   [1] result discarded
  → window.luca.vault → ipcRenderer "vault-store"
  → main.cjs fetch POST /api/credentials/store            [2] no X-LUCA-TOKEN → 401
  → …past the 401, [3] no such route existed
  → { success: false }                                    ← discarded at [1]
then unconditionally: localStorage.brain.openaiApiKey = "[SECURED]"
```

and on the core's side of the same wire:

```
llmGateway → credentialResolver.getApiKey("openai")
  → secureVault.retrieve("setting:brain:openaiApiKey")
  → fs path …/security/setting:brain:openaiApiKey.enc     [4] not a legal NTFS name
  → throws → caught → falls through to process.env
```

Four independent breaks, each verified in the code rather than deduced:

1. **`settingsService` threw away the result and redacted anyway.** `"[SECURED]"`
   is a sentinel meaning *the real value is in the vault*. The load path clears any
   `"[SECURED]"` it cannot resolve. So writing the sentinel after a failed store is
   what destroyed the key: it worked for the rest of the session, and the next
   reload blanked the field. The settings-migration path had the same shape, where
   it could destroy a key that was already working from `.env`.
2. **The main-process proxies sent no auth token.** All five vault handlers sent
   only `Content-Type`, and `authMiddleware` is mounted on `/api`. Every vault
   write 401'd — silently, because of [1].
3. **`/api/credentials/*` did not exist.** Confirmed against the `ROUTE_GROUPS`
   table, both `/api` catch-alls, all of `cortex/server/api/`, the secondary
   `src/cortex/` tree, and a repo-wide glob. The proxies had been calling an
   endpoint that was never written.
4. **A logical key was concatenated straight into a path.** On Windows `:` is the
   alternate-data-stream separator and two colons is invalid syntax, so
   `setting:brain:geminiApiKey.enc` cannot be created. Corroborated by the vault
   directory itself: `~/.luca/security/` contained **only** `luca_secret.key`. No
   `.enc` file had ever been written by this application.

The net effect is one sentence: **only `getApiKey`'s `process.env` branch has ever
resolved a credential, for any provider.** The vault branch had never returned a
value. `vision.routes.js` already told users to *"add an API key … in Settings
(stored in the Secure Vault)"* — advice that could not work, in a file that had no
way to know.

This surfaced while planning [RFC-0006](../04-rfcs/0006-core-resident-turn-loop.md)
Stage 2's next routing change, in answer to a plainer question: *is the model
provider system solid yet?* The registry, the provider hub, and the settings
surface are elaborate. The one wire that must work was severed. Fixing routing on
top of that would have added a fifth provider that also could not be given a key.

## Decision

**The core owns the Secure Vault. The renderer asks the core for it over the API.
The Electron main process is a proxy that adds a token, and nothing more.**

The core holds the master key and writes the encrypted files, so the core is the
only writer, and it serves what it owns at `/api/credentials/*`. Five routes,
matching exactly the five operations `preload.cjs` already exposed:
`POST /store`, `GET /retrieve`, `GET /list`, `DELETE /delete`, `GET /has`.

Three sub-decisions carry the weight:

**A logical key is not a filename.** The vault percent-encodes a key on the way to
disk and decodes it on the way back, so `setting:brain:geminiApiKey` becomes
`setting%3Abrain%3AgeminiApiKey.enc`. Windows reserved characters, control
characters, and the reserved device names (`con`, `nul`, `com1`…) are all handled
at that boundary. The encoding is a **byte-for-byte no-op for every key in use
today** (`admin_face_vector`, forex account ids), so nothing is migrated and no
existing file is renamed — Invariant 7 is satisfied by the encoding being
identity-on-the-existing-set rather than by a migration step. `list()` decodes,
because callers retrieve by the keys `list()` returns.

**A failed write is reported, never redacted.** `saveSettings` writes `"[SECURED]"`
only when the vault confirms it took the value; otherwise it persists an empty
field, collects the key name in a `vaultFailures` list, and returns
`{ ok, vaultFailures }` to its caller. Nothing new is persisted in plaintext, the
value stays live in memory for the session, and the failure is a value the UI can
act on rather than a log line nobody reads. The load path's **migration** branch —
which finds a plaintext key already in `localStorage` from an older version and
tries to move it into the vault — resolves the same tension the other way, and
deliberately: on failure it leaves the plaintext exactly where it already was.
Redacting there would swap a key that currently works for a sentinel the vault
cannot honour, and the branch above it would clear that sentinel to `""` on the
next load. The asymmetry is the point — on save, writing plaintext would be a new
leak; on migration, it is a leak that already exists and destroying the key does
not close it.

**Everything on this path fails closed, including the proxy.** A vault error
answers with a generic message — never a path, never a stack. `GET /has` answers
`false` when the vault cannot be read, never `true` on a guess. And the main
process coerces what it forwards: `vault-has` returns `body === true` and
`vault-list` returns `Array.isArray(body) ? body : []`, because a 401 or a warming
503 answers with a JSON *object* — truthy, and therefore read by
`hasCredentials()` as "yes, there is a key" precisely when the caller was not
allowed to ask.

Three narrower choices worth recording:

- The renderer's vault client is 3-arg (`site, username, password`); the core's is
  2-arg (`store(key, data)`). The route bridges them by storing
  `{ username, password, metadata, updatedAt }` as the data under `site` — which is
  what `credentialResolver` already read
  (`secured.password || secured.apiKey || secured.value`). **`getApiKey` needed no
  change to benefit**: the shape had been agreed all along, only the transport was
  missing.
- The route group is **tier 1** in the fast-listen boot order
  ([ADR-0006](0006-fast-listen-boot.md)). Settings load during boot, and a warming
  `503` on this path reads to the user as *your API key vanished* — after which the
  load path would clear the field.
- **No path here may end in `/status`, `/health` or `/handshake`.**
  `authMiddleware` decides what is public with `req.path.endsWith(p)`, so a route
  named `/api/credentials/status` would be reachable with no token at all. A test
  derives that suffix list from `authMiddleware`'s own source and asserts none of
  the five registered paths ends with any of them, so the trap stays closed as both
  files change.
- **A wrong token answers `401`, not `500`.** Found while driving these routes over
  a real socket: `securityManager.validateToken` passed both buffers straight to
  `crypto.timingSafeEqual`, which throws `RangeError` when their lengths differ.
  Nothing on the `/api` path catches it and the server installs no error handler, so
  a one-character token reached express's default handler and was answered with a
  stack trace and absolute filesystem paths — to an unauthenticated caller, on every
  `/api` route including ones that do not exist. A length comparison ahead of
  `timingSafeEqual` closes it: a wrong length is simply a wrong token, and comparing
  lengths first reveals only the length, which is not secret. This bug predates the
  change and is fixed here rather than filed, because these routes are the most
  sensitive thing on the API and that middleware is what stands in front of them.

Nothing on this path logs a request or response body. They carry plaintext
secrets; the log gets the operation and the key name.

## Consequences

### Positive

- **The Secure Vault can hold the keys the app actually uses.**
  `npm run verify:vault` round-trips every key shape the app produces — including
  `setting:brain:geminiApiKey`, the one `credentialResolver` derives for every
  provider — through store, retrieve, list and delete against a real filesystem.
  That check could not have passed before this change, in any of its four steps.
- **Invariant 8 gains a real gate where it previously had a broken one.** Provider
  credentials live encrypted, in one place, owned by one process, reachable only
  with the core's token. What worked before this change was a plaintext
  `OPENAI_API_KEY=` line in a `.env` file — the only route by which the core has
  ever seen a credential, and one a user without a terminal does not have.
- **A failure is loud.** `saveSettings` reports which keys could not be secured.
  The previous behavior — appear to save, delete the key on reload — is the exact
  "silent fallback" pattern [Data and Storage](../02-specification/10-data-and-storage.md)
  forbids, applied to a secret.
- **Documentation that already existed becomes true.** `vision.routes.js`'s
  instruction to add a key in Settings works as written, without an edit.
- **RFC-0006 Stage 2 stops depending on a `.env` file.** Its first exit clause —
  the core completing a real provider call — becomes reachable through the app's
  own UI, which is the only path a user has.
- **One definition of "where the token comes from."** The main process's
  `get-secure-token` handler and all five vault proxies now read through one
  helper, per call rather than at module load, because the core may write the token
  file after the main process starts.
- **The API's token check fails closed and discloses nothing.** Every malformed
  token shape — one character, double length, a prefix of the real token, 64
  multibyte characters, a trailing newline — now answers `401 Unauthorized` with no
  stack and no path. `npm run verify:auth` covers all of them; run against the
  previous implementation, the same script reports 22 failures.

### Negative

- **Secrets now cross a process boundary that they previously never reached.** They
  travel as JSON over a loopback HTTP socket, authenticated by a token in a file.
  Mitigations are real but partial: bound to `127.0.0.1`, token on every call,
  `Cache-Control: no-store`, no bodies logged. The honest cost is that
  **`luca_secret.key`'s file permissions are now the security boundary for every
  credential in the vault** — any local process that can read that file can ask the
  core for all of them. That is a strictly larger exposure than a write path that
  failed, and it is accepted because a vault nobody can write to protects nothing.
- **A filename leaks its key name.** `setting%3Abrain%3AopenaiApiKey.enc` tells
  anyone who can list the directory which providers are configured. Contents are
  encrypted; names are not, and `list()` depends on that.
- **The renderer still has two things called the vault.**
  `src/services/secureVault.ts` (IPC → core, wired by this change) and
  `src/services/secureVault.js` (a SQLite `credentials` table, used by
  `cryptoService.js` for wallet keys). This change makes the first one real and
  leaves the second untouched, so "the vault" remains ambiguous in the renderer.
  Named here so the next reader finds it in a record instead of a surprise.
- **`vaultFailures` is honest at the API boundary and still invisible to the user.**
  `saveSettings` returns the failing key names; the Settings UI does not yet read
  the return value. So the data-loss bug is fixed — nothing is destroyed, nothing
  is persisted in plaintext — but a failed write is currently reported to a caller
  that discards it. Surfacing it is a UI change, not part of this decision.
- **The length limits are policy invented here**, not derived from a spec: 200
  characters for a key, 8 KiB for a value. The key limit exists because
  percent-encoding lengthens a name and Windows still caps a path near 260
  characters, so the effective limit is lower than the number suggests.
- **`authMiddleware`'s `endsWith` matcher is still wrong.** The token *comparison*
  is fixed above; the public-path *matcher* is not. This change routes around it and
  pins that with a test. `/api/vision/status` remains publicly reachable and still
  leaks the configured model id.
- **Neither real behaviour can be covered by the test suite.** `vite.config.ts`
  aliases `fs`, `path` and `crypto` to a browser polyfill, so a vault round-trip
  under vitest would be testing the polyfill — which is precisely how a key that
  could never be written passed for working code. The same alias hides the token
  bug: the polyfill exports no `timingSafeEqual`, so the assertion would fail on a
  `TypeError` instead of the `RangeError` actually being fixed. The unit tests cover
  the pure key → filename mapping and the route contracts; the two real proofs live
  in `scripts/verify-vault-roundtrip.mjs` (`npm run verify:vault`) and
  `scripts/verify-api-auth.mjs` (`npm run verify:auth`), beside the existing
  `verify:web:*` scripts, and have to be run deliberately. Two verifications outside
  `npm test` are two verifications that will eventually be skipped.

## Alternatives considered

- **Let the renderer own the vault and write the files itself.** Rejected: the
  renderer is a browser context with no filesystem and no master key, and in
  Electron it is the least trusted process in the app. The consumer is also in the
  core — `credentialResolver` runs there — so renderer ownership would mean the
  core asking the renderer for a credential during a model call.
- **Let the Electron main process own the vault.** Superficially attractive: it
  already has `fs`, the paths module, and the token. Rejected for two reasons —
  two writers of one encrypted store is a corruption bug waiting for a race, and
  the web build (`npm run build:web`) has no main process at all, so the vault
  would exist only in the desktop app. Keeping the core as owner means one
  implementation serves both.
- **Sanitize the key instead of encoding it** — replace `:` with `_`. Rejected as
  lossy: `setting:brain:x` and `setting_brain_x` would collide in the same
  directory, and `list()` could not reconstruct the logical key that
  `forexAccountManager` retrieves by.
- **Rename the settings fields to be filename-safe.** Rejected: those names are a
  persisted contract and appear throughout the renderer's settings shape
  (Invariant 7). The problem is at the disk boundary, so the fix belongs at the
  disk boundary.
- **Store credentials in the OS keychain** (DPAPI / Keychain / libsecret via a
  native module). Not rejected on merit — for a desktop app it is the better
  long-term answer, and it would remove the "file permissions are the boundary"
  cost above. Rejected for *this* change: it adds a native module to
  `electron-rebuild`, has no web-build story, and would mean changing the vault
  format in the same commit that first makes writing to it work. It deserves its
  own ADR and its own migration.
- **Fall back to `localStorage` when the vault write fails**, so the key is never
  lost. Rejected outright: that stores a plaintext provider key where any renderer
  script can read it, to work around a failure the user can simply retry. A
  reported failure beats a working key held unsafely.
- **Add `/api/credentials/status` as a health probe.** Rejected: `authMiddleware`'s
  `endsWith` matcher would publish it.
- **Keep the vault broken and standardize on `.env`.** This is the status quo, and
  it is what the code effectively did. Rejected because it makes a provider key a
  developer artifact: a user with no terminal cannot give Luca a key, and every
  Settings screen that offers to take one is lying.

## Related

- [Invariant 8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
  (the invariant this change was mainly about)
- [Invariant 4 — Provider Abstraction](../01-constitution/01-the-eight-invariants.md#invariant-4--provider-abstraction)
  (a provider layer that cannot be given a credential is abstract in the wrong
  sense)
- [Invariant 7 — Backward Compatibility Where Practical](../01-constitution/01-the-eight-invariants.md#invariant-7--backward-compatibility-where-practical)
  (the filename encoding is a no-op on every key already on disk)
- [Safety and Permissions](../02-specification/07-safety-and-permissions.md)
- [Data and Storage](../02-specification/10-data-and-storage.md) (a silent fallback
  is a bug, not graceful degradation)
- [Provider Abstraction](../02-specification/04-provider-abstraction.md)
- [ADR-0006: Fast-listen boot](0006-fast-listen-boot.md) (why this route group is
  tier 1)
- [ADR-0017: Shared wire modules, per-edge clients](0017-shared-provider-wire.md)
  (the same Stage 2 work, one layer up)
- [RFC-0006: Core-resident turn loop](../04-rfcs/0006-core-resident-turn-loop.md)
  (Stage 2; this change is what lets its first exit clause be tested through the
  app)
