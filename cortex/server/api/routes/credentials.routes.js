/**
 * 🔑 Credentials — the Secure Vault, served to the app that owns it.
 *
 * The renderer has always called `window.luca.vault.*`, the preload has always
 * forwarded to `ipcMain`, and `platforms/electron/main.cjs` has always proxied
 * those calls to `/api/credentials/*` on this server. That endpoint did not exist,
 * so every write failed and `settingsService` — which ignored the result —
 * redacted the key out of localStorage anyway. Net effect: a provider key typed
 * in Settings survived until the next reload and never reached the core at all,
 * which is why `credentialResolver` has only ever resolved keys from `.env`.
 *
 * This is the missing half. The core owns the vault (it holds the master key and
 * the encrypted files), so the core serves it; the main process is a proxy and
 * nothing more.
 *
 * Security notes, all load-bearing:
 *
 * - **Nothing here logs a request or response body.** These carry plaintext
 *   secrets. Log the operation and the key name, never the value.
 * - **No path may end in `/status`, `/health` or `/handshake`.** `authMiddleware`
 *   decides what is public with `req.path.endsWith(p)`, so a route named
 *   `/api/credentials/status` would be reachable with no token at all. There is a
 *   test asserting this file never grows one.
 * - **Fail closed.** A vault error answers `{ success: false }` with a generic
 *   message — never a path, never a stack.
 */

import express from 'express';
import vault from '../../services/secureVault.js';

const router = express.Router();

/**
 * A logical key becomes a filename, so it cannot be unbounded: percent-encoding
 * can triple the length of non-ASCII, and Windows still caps a path near 260
 * characters. Rejecting early gives a clear error instead of an ENAMETOOLONG.
 */
const MAX_SITE_LENGTH = 200;

/** Values are secrets, not payloads. A megabyte of "API key" is a mistake. */
const MAX_SECRET_LENGTH = 8192;

const readSite = (value) => (typeof value === 'string' ? value.trim() : '');

/** Validate the key. Returns an error string, or null when the site is usable. */
const siteError = (site) => {
  if (!site) return 'A site identifier is required';
  if (site.length > MAX_SITE_LENGTH) {
    return `Site identifier exceeds ${MAX_SITE_LENGTH} characters`;
  }
  return null;
};

/** Responses carry secrets: keep them out of every cache between here and there. */
const noStore = (res) => res.set('Cache-Control', 'no-store');

router.post('/store', async (req, res) => {
  const site = readSite(req.body?.site);
  const invalid = siteError(site);
  if (invalid) return res.status(400).json({ success: false, error: invalid });

  const { username, password, metadata } = req.body ?? {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ success: false, error: 'A value is required' });
  }
  if (password.length > MAX_SECRET_LENGTH) {
    return res
      .status(413)
      .json({ success: false, error: `Value exceeds ${MAX_SECRET_LENGTH} characters` });
  }

  try {
    // Stored as an object so `credentialResolver.getApiKey` finds it: it reads
    // `secured.password || secured.apiKey || secured.value` off whatever the
    // vault returns.
    await vault.store(site, {
      username: typeof username === 'string' ? username : '',
      password,
      metadata: metadata ?? {},
      updatedAt: Date.now(),
    });
    console.log(`[CREDENTIALS] Stored '${site}'`);
    return noStore(res).json({ success: true, site });
  } catch (error) {
    console.error(`[CREDENTIALS] Store failed for '${site}':`, error.code ?? error.name);
    return res.status(500).json({ success: false, error: 'Vault write failed' });
  }
});

router.get('/retrieve', async (req, res) => {
  const site = readSite(req.query?.site);
  const invalid = siteError(site);
  if (invalid) return res.status(400).json({ success: false, error: invalid });

  try {
    const data = await vault.retrieve(site);
    if (data === null || data === undefined) {
      // Absent is not an error, and must not read as one: the settings load path
      // distinguishes "vault has nothing" from "vault broke".
      return noStore(res).json({ success: false, error: 'Not found', site });
    }
    // Tolerate an entry written as a bare string by an older caller.
    const record = typeof data === 'object' ? data : { password: data };
    return noStore(res).json({
      success: true,
      site,
      username: record.username ?? '',
      password: record.password ?? record.apiKey ?? record.value ?? '',
      metadata: record.metadata ?? {},
    });
  } catch (error) {
    console.error(`[CREDENTIALS] Retrieve failed for '${site}':`, error.code ?? error.name);
    return res.status(500).json({ success: false, error: 'Vault read failed' });
  }
});

router.get('/list', async (_req, res) => {
  try {
    // Key names only, and deliberately nothing else. `SecureVaultListEntry`
    // (src/services/secureVault.ts) declares `username`, `metadata` and
    // `updated_at` as optional; filling them in would mean decrypting every
    // entry to answer a listing question — touching every secret in the vault
    // for a question about names. The one required field is `site`.
    const sites = await vault.list();
    return noStore(res).json(sites.map((site) => ({ site })));
  } catch (error) {
    console.error('[CREDENTIALS] List failed:', error.code ?? error.name);
    return res.status(500).json([]);
  }
});

router.delete('/delete', async (req, res) => {
  const site = readSite(req.body?.site);
  const invalid = siteError(site);
  if (invalid) return res.status(400).json({ success: false, error: invalid });

  try {
    await vault.delete(site);
    console.log(`[CREDENTIALS] Deleted '${site}'`);
    return res.json({ success: true, site });
  } catch (error) {
    console.error(`[CREDENTIALS] Delete failed for '${site}':`, error.code ?? error.name);
    return res.status(500).json({ success: false, error: 'Vault delete failed' });
  }
});

router.get('/has', async (req, res) => {
  const site = readSite(req.query?.site);
  if (siteError(site)) return noStore(res).json(false);

  try {
    const data = await vault.retrieve(site);
    return noStore(res).json(data !== null && data !== undefined);
  } catch (error) {
    // Fail closed: an unreadable vault reports "no key", never "yes" on a guess.
    console.error(`[CREDENTIALS] Presence check failed for '${site}':`, error.code ?? error.name);
    return noStore(res).json(false);
  }
});

export default router;
