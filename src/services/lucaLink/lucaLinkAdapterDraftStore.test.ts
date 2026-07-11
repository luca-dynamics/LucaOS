import { describe, expect, it } from "vitest";
import { LucaLinkAdapterDraftStore } from "./lucaLinkAdapterDraftStore";

const NOW = 1_700_000_000_000;

describe("LucaLinkAdapterDraftStore", () => {
  it("owns adapter draft registry state and delegates draft lifecycle", () => {
    const store = new LucaLinkAdapterDraftStore();
    const draft = store.createFromBlueprint({
      id: "display",
      strategyKind: "web-display-bridge",
      title: "Display bridge",
    });

    expect(draft.generatedTextOnly).toBe(true);
    expect(store.list()).toHaveLength(1);
    expect(store.get(draft.id)?.kind).toBe("web-display-config");
    expect(store.summarize().total).toBe(1);

    const cancelled = store.cancel(draft.id, NOW);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.updatedAt).toBe(NOW);

    store.clear();
    expect(store.list()).toEqual([]);
  });
});
