/**
 * @vitest-environment jsdom
 *
 * The data-loss regression: what `saveSettings` persists when the Secure Vault
 * write fails.
 *
 * Before the credential bridge, `saveSettings` ignored the result of
 * `secureVault.store` and redacted the localStorage copy to "[SECURED]"
 * unconditionally. Since the vault write could not succeed at all — no
 * `/api/credentials/*` route existed, the IPC proxies sent no auth token, and the
 * logical key was concatenated straight into a Windows path — every provider key
 * typed in Settings took this path: it worked for the rest of the session, and
 * then the load path saw a "[SECURED]" sentinel it could not resolve and cleared
 * the field. The key was gone, with nothing anywhere reporting why.
 *
 * These tests pin the contract that replaces it: "[SECURED]" is written only when
 * the vault actually took the value, a failure is reported to the caller, and a
 * failed write persists neither the sentinel nor the plaintext.
 *
 * jsdom, because the assertion is about the object handed to `localStorage`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import type {
  SecureVaultListEntry,
  SecureVaultRetrieveResult,
  SecureVaultStoreResult,
} from "./secureVault";

/** Distinctive enough that finding it in a payload is proof, not a coincidence. */
const SECRET = "sk-live-CANARY-must-never-reach-localstorage";

// Typed to `SecureVaultLike`'s real signatures — a type-only import, so nothing is
// loaded at runtime and the hoisted factory below stays hoistable. Without the
// signatures, an inferred `Promise<{ success: boolean }>` rejects the very thing
// these tests exist to simulate: a store that answers `{ success: false, error }`.
const vault = vi.hoisted(() => ({
  store: vi.fn<
    (
      site: string,
      username: string,
      password: string,
    ) => Promise<SecureVaultStoreResult>
  >(async () => ({ success: true })),
  retrieve: vi.fn<(site: string) => Promise<SecureVaultRetrieveResult>>(
    async () => ({ success: false, error: "Not found" }),
  ),
  delete: vi.fn<(site: string) => Promise<SecureVaultStoreResult>>(async () => ({
    success: true,
  })),
  hasCredentials: vi.fn<(site: string) => Promise<boolean>>(async () => false),
  list: vi.fn<() => Promise<SecureVaultListEntry[]>>(async () => []),
  exportPublicHeader: vi.fn<() => Promise<string>>(async () => "{}"),
}));

vi.mock("./secureVault", () => ({ secureVault: vault, default: vault }));

const { settingsService } = await import("./settingsService");

const STORAGE_KEY = "LUCA_SETTINGS_V1";

/**
 * Spied only to describe a failure. The assertions read storage back rather than
 * inspecting this, because `settingsService` writes through the bare global
 * `localStorage`, and a spy installed on `window.localStorage` records nothing if
 * the two are not the same object under this environment.
 */
const setItem = vi.spyOn(Storage.prototype, "setItem");

/** The settings object as it was actually written to storage. */
const persisted = () => {
  const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
  expect(
    raw,
    `nothing stored at ${STORAGE_KEY}. setItem keys seen: ` +
      JSON.stringify(setItem.mock.calls.map(([key]) => String(key))),
  ).toBeTruthy();
  return JSON.parse(raw as string);
};

const saveBrain = (brain: Record<string, string>) =>
  settingsService.saveSettings({ brain } as never);

beforeEach(async () => {
  // The service is a singleton whose settings accumulate across saves, so clear
  // the fields under test first. An empty string never reaches the vault.
  vault.store.mockResolvedValue({ success: true });
  await saveBrain({ geminiApiKey: "", anthropicApiKey: "", openaiApiKey: "" });
  vi.clearAllMocks();
  vault.store.mockResolvedValue({ success: true });
});

describe("saveSettings — vault write succeeded", () => {
  it("stores the key under its settings path and redacts the persisted copy", async () => {
    const result = await saveBrain({ openaiApiKey: SECRET });

    expect(vault.store).toHaveBeenCalledWith(
      "setting:brain:openaiApiKey",
      "openaiApiKey",
      SECRET,
    );
    expect(result).toEqual({ ok: true, vaultFailures: [] });
    expect(persisted().brain.openaiApiKey).toBe("[SECURED]");
  });

  it("puts the plaintext nowhere in the persisted payload", async () => {
    await saveBrain({ openaiApiKey: SECRET });
    expect(JSON.stringify(persisted())).not.toContain(SECRET);
  });
});

describe("saveSettings — vault write failed", () => {
  beforeEach(() => {
    vault.store.mockResolvedValue({
      success: false,
      error: "Vault IPC not available",
    });
  });

  it("reports the failure instead of appearing to save", async () => {
    const result = await saveBrain({ openaiApiKey: SECRET });

    expect(result.ok).toBe(false);
    expect(result.vaultFailures).toEqual(["brain.openaiApiKey"]);
  });

  it("does not write the [SECURED] sentinel — that is what deleted the key", async () => {
    await saveBrain({ openaiApiKey: SECRET });

    // The sentinel is a claim that the vault holds the value. The load path
    // clears any "[SECURED]" it cannot resolve, so writing it after a failed
    // store is what silently destroyed the key on the next reload.
    expect(persisted().brain.openaiApiKey).not.toBe("[SECURED]");
  });

  it("does not fall back to plaintext on disk either", async () => {
    await saveBrain({ openaiApiKey: SECRET });

    expect(persisted().brain.openaiApiKey).toBe("");
    expect(JSON.stringify(persisted())).not.toContain(SECRET);
  });

  it("keeps the value live in memory, so the session still works", async () => {
    await saveBrain({ openaiApiKey: SECRET });

    // Nothing was persisted, but the user's key is not lost mid-session: the
    // caller can report that it needs re-entering.
    expect(settingsService.get("brain").openaiApiKey).toBe(SECRET);
  });

  it("reports only the keys that actually failed", async () => {
    vault.store.mockImplementation(async (key: string) =>
      key.includes("openai")
        ? { success: false, error: "Vault IPC not available" }
        : { success: true },
    );

    const result = await saveBrain({
      geminiApiKey: `gemini-${SECRET}`,
      openaiApiKey: `openai-${SECRET}`,
    });

    expect(result.vaultFailures).toEqual(["brain.openaiApiKey"]);
    const saved = persisted().brain;
    expect(saved.geminiApiKey).toBe("[SECURED]");
    expect(saved.openaiApiKey).toBe("");
  });
});

describe("saveSettings — nothing to secure", () => {
  it("does not re-store a value that is already in the vault", async () => {
    // "[SECURED]" is what the load path leaves in the field when the real value
    // lives in the vault. Storing it would overwrite the key with the sentinel.
    const result = await saveBrain({ anthropicApiKey: "[SECURED]" });

    expect(vault.store).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(persisted().brain.anthropicApiKey).toBe("[SECURED]");
  });

  it("does not store an empty field", async () => {
    const result = await saveBrain({ geminiApiKey: "" });

    expect(vault.store).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
