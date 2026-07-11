/**
 * Manager-owned LucaLink host connection state.
 *
 * Host classification remains pure; this store owns the mutable host
 * connection registry used by manager-facing surfaces.
 */
import {
  clearLucaLinkHostConnectionRegistry,
  createLucaLinkHostConnectionRegistry,
  getLucaLinkHostConnection,
  listLucaLinkHostConnections,
  removeLucaLinkHostConnection,
  summarizeLucaLinkHostConnectionRegistry,
  upsertLucaLinkHostConnection,
  type LucaLinkHostConnectionInput,
  type LucaLinkHostConnectionRecord,
  type LucaLinkHostConnectionRegistrySummary,
} from "./lucaLinkHostConnectionModel";

export class LucaLinkHostConnectionStore {
  private readonly state = createLucaLinkHostConnectionRegistry();

  list(): LucaLinkHostConnectionRecord[] {
    return listLucaLinkHostConnections(this.state);
  }

  get(id: string): LucaLinkHostConnectionRecord | undefined {
    return getLucaLinkHostConnection(this.state, id);
  }

  has(id: string): boolean {
    return !!this.get(id);
  }

  summarize(): LucaLinkHostConnectionRegistrySummary {
    return summarizeLucaLinkHostConnectionRegistry(this.state);
  }

  upsert(
    input: LucaLinkHostConnectionInput | LucaLinkHostConnectionRecord,
    options?: { now?: number },
  ): LucaLinkHostConnectionRecord {
    return upsertLucaLinkHostConnection(this.state, input, options);
  }

  remove(id: string): boolean {
    return removeLucaLinkHostConnection(this.state, id);
  }

  clear(): void {
    clearLucaLinkHostConnectionRegistry(this.state);
  }
}

export const lucaLinkHostConnectionStore = new LucaLinkHostConnectionStore();
