import { beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasService } from "./canvasService";

/**
 * The canvas service's contract — especially the semantics that exist because
 * version numbers lie when you let streaming edits bump them.
 */

let svc: CanvasService;
beforeEach(() => {
  svc = new CanvasService();
});

describe("CanvasService", () => {
  it("opens an item, makes it active, and starts at v1", () => {
    const id = svc.open({ title: "Plan", kind: "markdown", content: "# Hi" });
    const active = svc.getActiveItem();
    expect(active?.id).toBe(id);
    expect(active?.version).toBe(1);
    expect(active?.content).toBe("# Hi");
  });

  it("update() touches content but NEVER the version — streaming is not a revision", () => {
    const id = svc.open({ title: "Plan", kind: "markdown" });
    for (let i = 0; i < 50; i++) svc.update(id, { content: `draft ${i}` });
    const item = svc.getActiveItem();
    expect(item?.content).toBe("draft 49");
    expect(item?.version).toBe(1); // fifty keystrokes, still v1
  });

  it("commit() bumps the version — a deliberate pass", () => {
    const id = svc.open({ title: "Plan", kind: "markdown" });
    svc.commit(id);
    svc.commit(id);
    expect(svc.getActiveItem()?.version).toBe(3); // v1 -> v2 -> v3
  });

  it("beginEditing/endEditing drives the command bar's editing scope", () => {
    const id = svc.open({ title: "Strategy Sprint Plan v7", kind: "markdown" });
    expect(svc.getEditingScope()).toBeNull();

    svc.beginEditing(id);
    expect(svc.getEditingScope()).toBe("Strategy Sprint Plan v7");

    svc.endEditing();
    expect(svc.getEditingScope()).toBeNull();
  });

  it("supports many items and switches the active one", () => {
    const a = svc.open({ title: "Doc", kind: "markdown" });
    const b = svc.open({ title: "Script", kind: "code", language: "typescript" });
    expect(svc.getActiveItem()?.id).toBe(b);
    svc.setActive(a);
    expect(svc.getActiveItem()?.id).toBe(a);
    expect(svc.getItems()).toHaveLength(2);
  });

  it("closing the active item falls back to another, and clears its edit scope", () => {
    const a = svc.open({ title: "Doc", kind: "markdown" });
    const b = svc.open({ title: "Script", kind: "code" });
    svc.beginEditing(b);
    svc.close(b);
    expect(svc.getActiveItem()?.id).toBe(a);
    expect(svc.getEditingScope()).toBeNull(); // editing scope died with the item
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const off = svc.subscribe(listener);
    const id = svc.open({ title: "Doc", kind: "markdown" });
    svc.update(id, { content: "x" });
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    svc.update(id, { content: "y" });
    expect(listener).toHaveBeenCalledTimes(2); // no further calls
  });
});
