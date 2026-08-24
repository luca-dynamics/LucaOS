import { describe, expect, it } from "vitest";
import {
  ConversationThreadService,
  LEGACY_CHAT_KEY,
  UNTITLED_THREAD_TITLE,
  deriveThreadTitle,
} from "./conversationThreadService";
import { Sender, type Message } from "../../types";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  has(key: string): boolean {
    return this.values.has(key);
  }
}

const message = (
  text: string,
  sender: Sender = Sender.USER,
  timestamp = 1_700_000_000_000,
): Message => ({ id: `m:${text}:${timestamp}`, text, sender, timestamp });

describe("deriveThreadTitle", () => {
  it("names a thread after the first thing the user said", () => {
    expect(
      deriveThreadTitle([
        message("Booting. Standing by.", Sender.SYSTEM),
        message("Draft the Q3 investor update"),
        message("On it.", Sender.LUCA),
      ]),
    ).toBe("Draft the Q3 investor update");
  });

  it("does not name a thread after Luca's own opening line", () => {
    // Every thread would look identical if it did.
    expect(deriveThreadTitle([message("Good morning.", Sender.LUCA)])).toBe(
      UNTITLED_THREAD_TITLE,
    );
    expect(deriveThreadTitle([])).toBe(UNTITLED_THREAD_TITLE);
  });

  it("skips hidden and blank user messages", () => {
    const hidden: Message = { ...message("[SYSTEM INSTRUCTION] ignore"), isHidden: true };
    expect(deriveThreadTitle([hidden, message("   "), message("Real ask")])).toBe(
      "Real ask",
    );
  });

  it("flattens newlines and truncates long asks on a word boundary", () => {
    const title = deriveThreadTitle([
      message("Walk me through\n  the whole deployment pipeline end to end please"),
    ]);
    expect(title).toBe("Walk me through the whole deployment pipeline…");
    expect(title.length).toBeLessThanOrEqual(49);
  });

  it("cuts a single unbroken word where it falls, having no boundary to find", () => {
    const title = deriveThreadTitle([message(`decrypt ${"z".repeat(80)}`)]);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(49);
  });
});

describe("ConversationThreadService", () => {
  it("starts one thread on a fresh install rather than reporting none", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    const active = service.ensureActiveThread();
    expect(active.title).toBe(UNTITLED_THREAD_TITLE);
    expect(active.messages).toEqual([]);
    expect(service.listThreads()).toHaveLength(1);
    expect(service.getActiveThreadId()).toBe(active.id);
  });

  it("keeps threads separate: a new one does not disturb the old one", () => {
    // The behaviour "New chat" replaces: it used to be a confirm-and-purge.
    const service = new ConversationThreadService(new MemoryStorage());
    const first = service.ensureActiveThread();
    service.saveMessages(first.id, [message("Deploy script fix")]);

    const second = service.createThread();
    expect(service.getActiveThreadId()).toBe(second.id);
    expect(service.getThread(first.id)?.messages).toHaveLength(1);

    service.setActiveThreadId(first.id);
    expect(service.getActiveThreadId()).toBe(first.id);
    expect(service.getThread(first.id)?.messages[0].text).toBe("Deploy script fix");
  });

  it("lists newest first, which is the order the rail renders", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    const first = service.createThread("First");
    const second = service.createThread("Second");
    expect(service.listThreads().map((thread) => thread.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("titles a thread from its messages, and a rename survives the next message", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    const thread = service.createThread();
    expect(service.saveMessages(thread.id, [message("Trip planning")])?.title).toBe(
      "Trip planning",
    );

    service.renameThread(thread.id, "  Iceland   2027 ");
    expect(service.getThread(thread.id)?.title).toBe("Iceland 2027");

    service.saveMessages(thread.id, [message("Trip planning"), message("Add Reykjavik")]);
    expect(service.getThread(thread.id)?.title).toBe("Iceland 2027");
  });

  it("ignores a blank rename instead of leaving a nameless thread", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    const thread = service.createThread("Keep me");
    service.renameThread(thread.id, "   ");
    expect(service.getThread(thread.id)?.title).toBe("Keep me");
  });

  it("leaves the composer pointing at a real thread after a delete", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    const first = service.createThread("First");
    const second = service.createThread("Second");

    const afterDeletingActive = service.deleteThread(second.id);
    expect(afterDeletingActive).toBe(first.id);

    // Deleting the last one produces a fresh thread rather than nothing.
    const afterDeletingLast = service.deleteThread(first.id);
    expect(service.listThreads()).toHaveLength(1);
    expect(service.listThreads()[0].id).toBe(afterDeletingLast);
    expect(service.listThreads()[0].title).toBe(UNTITLED_THREAD_TITLE);
  });

  it("does not change the active thread when a different one is deleted", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    const first = service.createThread("First");
    const second = service.createThread("Second");
    expect(service.deleteThread(first.id)).toBe(second.id);
  });

  it("returns undefined for ids it does not know", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    expect(service.getThread("nope")).toBeUndefined();
    expect(service.setActiveThreadId("nope")).toBeUndefined();
    expect(service.renameThread("nope", "New name")).toBeUndefined();
    expect(service.saveMessages("nope", [message("hi")])).toBeUndefined();
  });

  it("persists across instances, the way a reload sees it", () => {
    const store = new MemoryStorage();
    const first = new ConversationThreadService(store);
    const thread = first.createThread();
    first.saveMessages(thread.id, [message("Q3 investor update")]);

    const reloaded = new ConversationThreadService(store);
    expect(reloaded.listThreads()).toHaveLength(1);
    expect(reloaded.getActiveThreadId()).toBe(thread.id);
    expect(reloaded.getThread(thread.id)?.title).toBe("Q3 investor update");
  });

  describe("migration off LUCA_CHAT_HISTORY_V1", () => {
    it("adopts the legacy conversation as thread #1 and marks it active", () => {
      const store = new MemoryStorage();
      store.setItem(
        LEGACY_CHAT_KEY,
        JSON.stringify([
          message("Boot", Sender.SYSTEM, 1_700_000_000_000),
          message("Summarise the incident", Sender.USER, 1_700_000_100_000),
          message("Here it is.", Sender.LUCA, 1_700_000_200_000),
        ]),
      );

      const service = new ConversationThreadService(store);
      const threads = service.listThreads();
      expect(threads).toHaveLength(1);
      expect(threads[0].title).toBe("Summarise the incident");
      expect(threads[0].messages).toHaveLength(3);
      expect(service.getActiveThreadId()).toBe(threads[0].id);
      expect(threads[0].createdAt).toBe(new Date(1_700_000_000_000).toISOString());
      expect(threads[0].updatedAt).toBe(new Date(1_700_000_200_000).toISOString());
    });

    it("keeps the legacy key as the rollback path", () => {
      const store = new MemoryStorage();
      store.setItem(LEGACY_CHAT_KEY, JSON.stringify([message("Keep my history")]));
      new ConversationThreadService(store).listThreads();
      expect(store.has(LEGACY_CHAT_KEY)).toBe(true);
    });

    it("runs once — a later launch does not resurrect the legacy conversation", () => {
      const store = new MemoryStorage();
      store.setItem(LEGACY_CHAT_KEY, JSON.stringify([message("Old thread")]));

      const first = new ConversationThreadService(store);
      const migrated = first.listThreads()[0];
      first.deleteThread(migrated.id);

      const reloaded = new ConversationThreadService(store);
      expect(
        reloaded.listThreads().some((thread) => thread.title === "Old thread"),
      ).toBe(false);
    });

    it("does not invent a thread when there is nothing to migrate", () => {
      const store = new MemoryStorage();
      store.setItem(LEGACY_CHAT_KEY, JSON.stringify([]));
      expect(new ConversationThreadService(store).listThreads()).toEqual([]);
    });

    it("survives unreadable storage instead of throwing at first paint", () => {
      const legacyGarbage = new MemoryStorage();
      legacyGarbage.setItem(LEGACY_CHAT_KEY, "not json{{{");
      expect(new ConversationThreadService(legacyGarbage).listThreads()).toEqual([]);

      const threadGarbage = new MemoryStorage();
      threadGarbage.setItem("LUCA_CONVERSATION_THREADS_V1", "not json{{{");
      expect(new ConversationThreadService(threadGarbage).listThreads()).toEqual([]);

      const notAnArray = new MemoryStorage();
      notAnArray.setItem("LUCA_CONVERSATION_THREADS_V1", JSON.stringify({ a: 1 }));
      expect(new ConversationThreadService(notAnArray).listThreads()).toEqual([]);
    });

    it("drops entries that are not threads rather than rendering junk rows", () => {
      const store = new MemoryStorage();
      store.setItem(
        "LUCA_CONVERSATION_THREADS_V1",
        JSON.stringify([
          { id: "good", title: "Real", createdAt: "x", updatedAt: "x", messages: [] },
          { id: "bad-no-messages", title: "Broken" },
          null,
        ]),
      );
      const service = new ConversationThreadService(store);
      expect(service.listThreads().map((thread) => thread.id)).toEqual(["good"]);
    });
  });

  it("clears everything, including the legacy key, so the wipe survives a reload", () => {
    const store = new MemoryStorage();
    store.setItem(LEGACY_CHAT_KEY, JSON.stringify([message("Old thread")]));
    const service = new ConversationThreadService(store);
    service.listThreads();

    service.clearAllThreads();
    expect(service.listThreads()).toEqual([]);
    expect(store.has(LEGACY_CHAT_KEY)).toBe(false);
    expect(new ConversationThreadService(store).listThreads()).toEqual([]);
  });

  it("caps the archive and says so, rather than growing without bound", () => {
    const service = new ConversationThreadService(new MemoryStorage());
    for (let index = 0; index < 105; index += 1) service.createThread(`Thread ${index}`);
    const threads = service.listThreads();
    expect(threads).toHaveLength(100);
    expect(threads[0].title).toBe("Thread 104");
    expect(threads.some((thread) => thread.title === "Thread 0")).toBe(false);
  });

  it("reports a failed write loudly instead of pretending to have saved", () => {
    // CLAUDE.md: a silent fallback here is a bug, not graceful degradation.
    const fullDisk = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const service = new ConversationThreadService(fullDisk);
    const thread = service.createThread("Doomed");
    expect(service.isDegraded()).toBe(true);
    // Still usable for this session — the loss is on reload, not now.
    expect(service.getThread(thread.id)?.title).toBe("Doomed");
  });

  it("works with no storage at all (SSR / web build)", () => {
    const service = new ConversationThreadService(undefined);
    const thread = service.ensureActiveThread();
    service.saveMessages(thread.id, [message("In memory only")]);
    expect(service.getThread(thread.id)?.title).toBe("In memory only");
  });
});
