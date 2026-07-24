/**
 * canvasService — what is on the workspace canvas.
 *
 * The canvas is LucaOS's artifact surface: the panel beside the thread where
 * Luca drafts things that outlive a chat bubble — documents, code, and
 * whatever kinds the renderer registry grows next. The AGENT is the primary
 * writer: it opens an item, streams edits into it, and commits a revision
 * when a coherent pass is done. The person reads, and (per kind) edits.
 *
 * Deliberate semantics, learned from watching version numbers lie:
 * - update() touches content and updatedAt only. Streaming keystrokes are not
 *   revisions.
 * - commit() bumps the version. "v7" must mean seven deliberate passes, not
 *   seven thousand onChange events.
 * - beginEditing()/endEditing() is the write-scope handshake the command bar
 *   surfaces as "Editing enabled — <title>". The chip shows a truth about
 *   which item Luca may write to; it is not decoration.
 *
 * Pure TS singleton, same shape as intentRoutingModeService: in-memory state,
 * subscribe() returns an unsubscribe. No persistence yet — that arrives with
 * Spaces, where an item's home actually lives.
 */

export type CanvasItemKind = "markdown" | "code";

export interface CanvasItem {
  id: string;
  title: string;
  kind: CanvasItemKind;
  content: string;
  /** Language hint for the code renderer (e.g. "typescript"). */
  language?: string;
  /** Deliberate revisions — bumped by commit(), never by update(). */
  version: number;
  updatedAt: number;
}

export interface OpenCanvasItemInput {
  title: string;
  kind: CanvasItemKind;
  content?: string;
  language?: string;
}

type CanvasListener = () => void;

let nextId = 1;

export class CanvasService {
  private items: CanvasItem[] = [];
  private activeId: string | null = null;
  private editingId: string | null = null;
  private listeners = new Set<CanvasListener>();

  /** Open a new item and make it active. Returns its id. */
  open(input: OpenCanvasItemInput): string {
    const id = `canvas-${nextId++}`;
    this.items = [
      ...this.items,
      {
        id,
        title: input.title,
        kind: input.kind,
        content: input.content ?? "",
        language: input.language,
        version: 1,
        updatedAt: Date.now(),
      },
    ];
    this.activeId = id;
    this.emit();
    return id;
  }

  /** Touch content/title. Streaming-safe: never bumps the version. */
  update(id: string, patch: Partial<Pick<CanvasItem, "content" | "title" | "language">>): void {
    let changed = false;
    this.items = this.items.map((item) => {
      if (item.id !== id) return item;
      changed = true;
      return { ...item, ...patch, updatedAt: Date.now() };
    });
    if (changed) this.emit();
  }

  /** A deliberate revision: v(n) -> v(n+1). */
  commit(id: string): void {
    let changed = false;
    this.items = this.items.map((item) => {
      if (item.id !== id) return item;
      changed = true;
      return { ...item, version: item.version + 1, updatedAt: Date.now() };
    });
    if (changed) this.emit();
  }

  close(id: string): void {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    if (this.items.length === before) return;
    if (this.editingId === id) this.editingId = null;
    if (this.activeId === id) {
      this.activeId = this.items.length ? this.items[this.items.length - 1].id : null;
    }
    this.emit();
  }

  setActive(id: string): void {
    if (this.activeId === id || !this.items.some((item) => item.id === id)) return;
    this.activeId = id;
    this.emit();
  }

  /** Grant Luca write scope on an item — the command bar announces it. */
  beginEditing(id: string): void {
    if (!this.items.some((item) => item.id === id) || this.editingId === id) return;
    this.editingId = id;
    this.emit();
  }

  endEditing(): void {
    if (this.editingId === null) return;
    this.editingId = null;
    this.emit();
  }

  getItems(): CanvasItem[] {
    return this.items;
  }

  getActiveItem(): CanvasItem | null {
    return this.items.find((item) => item.id === this.activeId) ?? null;
  }

  /** The title the "Editing enabled" chip shows, or null when scope is closed. */
  getEditingScope(): string | null {
    return this.items.find((item) => item.id === this.editingId)?.title ?? null;
  }

  subscribe(listener: CanvasListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const canvasService = new CanvasService();
