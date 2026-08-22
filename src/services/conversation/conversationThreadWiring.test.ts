// vitest aliases node:fs to a browser polyfill whose reads return "", which
// would make every `not.toContain` here pass vacuously. getBuiltinModule
// reaches the real fs (same pattern as lucaLinkSecurityInvariants.test.ts).
const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";
import { LEGACY_CHAT_KEY } from "./conversationThreadService";

/**
 * "New" must not destroy.
 *
 * Before threads existed, `onNewSession` was wired straight to
 * `handleClearChat` — a `window.confirm("WARNING: PURGE LUCA LOGS?")` and a
 * `localStorage.removeItem`. The only way to start a fresh thought was to
 * annihilate the previous one, which is a side effect on the user's world that
 * is neither proportionate nor revocable.
 *
 * That is exactly the kind of regression that reads fine in review — the two
 * handlers are one token apart at the call site — and is unrecoverable at
 * runtime. So it is pinned in source, not left to memory.
 */

const read = (path: string) => readFileSync(path, "utf8");

describe("conversation thread wiring", () => {
  it("never points onNewSession at the purge", () => {
    const app = read("src/App.tsx");
    const wirings = [...app.matchAll(/onNewSession=\{([^}]+)\}/g)].map((m) =>
      m[1].trim(),
    );

    // Two call sites today: the workspace sidebar and the app menu. If a third
    // appears, it has to be deliberate about which handler it takes.
    expect(wirings.length).toBeGreaterThanOrEqual(2);
    expect(wirings).not.toContain("handleClearChat");
    for (const wiring of wirings) expect(wiring).toBe("newThread");
  });

  it("keeps the purge reachable, separately labelled", () => {
    // Relocating "New" must not quietly delete the ability to wipe. A purge is
    // a legitimate action — it just is not what a new chat does.
    const app = read("src/App.tsx");
    expect(app).toContain("handleClearChat={handleClearChat}");
  });

  it("leaves chat storage entirely to the thread service", () => {
    // The controller used to read and write the flat history key by hand. Two
    // owners of one key is how a migration ends up half-applied.
    const controller = read("src/hooks/app/useChatController.ts");
    expect(controller).not.toContain(LEGACY_CHAT_KEY);
    expect(controller).not.toContain("CHAT_STORAGE_KEY");
    expect(controller).toContain("conversationThreadService");
  });

  it("clears conversations through the service so the legacy key goes too", () => {
    // `load()` treats a missing thread store as "not migrated yet", so wiping
    // the threads without also removing the pre-threads key would resurrect on
    // the next launch precisely what the user just deleted.
    const dataTab = read("src/components/settings/SettingsDataTab.tsx");
    expect(dataTab).toContain("conversationThreadService.clearAllThreads()");
    expect(dataTab).not.toContain(LEGACY_CHAT_KEY);
  });

  it("names the legacy key in one place only", () => {
    const service = read("src/services/conversation/conversationThreadService.ts");
    expect(service).toContain(`export const LEGACY_CHAT_KEY = "${LEGACY_CHAT_KEY}"`);
    for (const path of [
      "src/App.tsx",
      "src/services/conversationService.ts",
      "src/components/settings/SettingsDataTab.tsx",
      "src/hooks/app/useChatController.ts",
    ]) {
      expect(read(path)).not.toContain(LEGACY_CHAT_KEY);
    }
  });
});
