/**
 * Absorb Phase 2 pilot — readable / editable Memory Vault.
 *
 * Unifies the local archive (memoryService) behind LucaMemory contracts with:
 * list, get, update, delete, export, import.
 *
 * Soft-fails when storage is unavailable. Does not change live embedding
 * pipelines or Cortex remote stores in this pilot.
 */

import type { MemoryNode } from "../../types";
import type {
  LucaMemoryItem,
  LucaMemoryQuery,
  LucaMemoryQueryResult,
  LucaMemoryWriteResult,
} from "./MemoryContracts";
import {
  mapLegacyMemoryToLucaMemoryItem,
  mapLucaMemoryItemToLegacyMemory,
} from "./MemoryTierMapping";

export const MEMORY_VAULT_EXPORT_FORMAT = "luca_memory_vault_v1" as const;
const ARCHIVE_KEY = "LUCA_LUCA_ARCHIVE_V1";

type SaveMemoryFn = (
  key: string,
  value: string,
  category?: MemoryNode["category"],
  autoConsolidate?: boolean,
  importance?: number,
  tenantId?: string,
) => Promise<MemoryNode | null>;

export interface MemoryVaultExport {
  format: typeof MEMORY_VAULT_EXPORT_FORMAT;
  exportedAt: string;
  itemCount: number;
  items: LucaMemoryItem[];
}

export interface MemoryVaultImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  mode: "merge" | "replace";
  reason?: string;
}

export interface MemoryVaultDependencies {
  listNodes?: () => MemoryNode[];
  persistNodes?: (nodes: MemoryNode[]) => void;
  saveMemory?: SaveMemoryFn;
}

/** Lazy load memoryService so unit tests can inject pure deps without browser globals. */
function getMemoryServiceModule(): {
  getAllMemories: () => MemoryNode[];
  saveMemory: SaveMemoryFn;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../memoryService") as {
      memoryService: {
        getAllMemories: () => MemoryNode[];
        saveMemory: SaveMemoryFn;
      };
    };
    return mod.memoryService;
  } catch {
    return null;
  }
}

function defaultListNodes(): MemoryNode[] {
  try {
    return getMemoryServiceModule()?.getAllMemories() ?? [];
  } catch {
    return [];
  }
}

function defaultPersistNodes(nodes: MemoryNode[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(nodes));
}

function defaultSaveMemory(
  key: string,
  value: string,
  category: MemoryNode["category"] = "SEMANTIC",
  autoConsolidate = false,
  importance?: number,
  tenantId?: string,
): Promise<MemoryNode | null> {
  const svc = getMemoryServiceModule();
  if (!svc?.saveMemory) {
    return Promise.resolve(null);
  }
  return svc.saveMemory(key, value, category, autoConsolidate, importance, tenantId);
}

function matchesQuery(item: LucaMemoryItem, query?: LucaMemoryQuery): boolean {
  if (!query) return true;
  if (query.tier && item.tier !== query.tier) return false;
  if (query.minConfidence != null && (item.confidence ?? 0) < query.minConfidence) {
    return false;
  }
  if (query.tags?.length) {
    const tags = item.tags ?? [];
    if (!query.tags.every((t) => tags.includes(t))) return false;
  }
  if (query.text?.trim()) {
    const q = query.text.trim().toLowerCase();
    const hay = `${item.content} ${item.summary ?? ""} ${item.id} ${item.source}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (query.scope) {
    for (const [k, v] of Object.entries(query.scope)) {
      if (v == null || v === "") continue;
      const actual = (item.scope as Record<string, unknown>)[k];
      if (actual != null && String(actual) !== String(v)) return false;
    }
  }
  return true;
}

export class MemoryVaultService {
  private readonly listNodes: () => MemoryNode[];
  private readonly persistNodes: (nodes: MemoryNode[]) => void;
  private readonly saveMemory: SaveMemoryFn;

  constructor(deps: MemoryVaultDependencies = {}) {
    this.listNodes = deps.listNodes ?? defaultListNodes;
    this.persistNodes = deps.persistNodes ?? defaultPersistNodes;
    this.saveMemory = deps.saveMemory ?? defaultSaveMemory;
  }

  /** List vault items as LucaMemory contracts (readable). */
  async list(query?: LucaMemoryQuery): Promise<LucaMemoryQueryResult> {
    const items = this.listNodes()
      .map((node) =>
        mapLegacyMemoryToLucaMemoryItem(node as unknown as Record<string, unknown>, {
          source: "memory-vault",
        }),
      )
      .filter((item) => matchesQuery(item, query));

    const limited =
      query?.limit != null && query.limit > 0
        ? items.slice(0, query.limit)
        : items;

    return {
      items: limited,
      total: items.length,
      metadata: {
        source: "memory_vault",
        absorbPhase: 2,
        runtimeBehaviorChanged: false,
      },
    };
  }

  async get(id: string): Promise<LucaMemoryItem | null> {
    const { items } = await this.list();
    return items.find((i) => i.id === id) ?? null;
  }

  /**
   * Edit content of an existing archive entry (editable vault).
   */
  async update(
    id: string,
    patch: { content?: string; summary?: string; tags?: string[] },
  ): Promise<LucaMemoryWriteResult> {
    const nodes = [...this.listNodes()];
    const idx = nodes.findIndex(
      (n) => n.id === id || n.key.toLowerCase() === id.toLowerCase(),
    );
    if (idx < 0) {
      return { ok: false, reason: `Memory not found: ${id}` };
    }

    if (patch.content != null) {
      nodes[idx] = { ...nodes[idx], value: patch.content, timestamp: Date.now() };
    }
    if (patch.summary != null || patch.tags != null) {
      nodes[idx] = {
        ...nodes[idx],
        metadata: {
          ...(nodes[idx].metadata || {}),
          ...(patch.summary != null ? { summary: patch.summary } : {}),
          ...(patch.tags != null ? { tags: patch.tags } : {}),
        } as MemoryNode["metadata"],
      };
    }

    try {
      this.persistNodes(nodes);
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof Error ? error.message : "Failed to persist memory edit",
      };
    }

    const item = mapLegacyMemoryToLucaMemoryItem(
      nodes[idx] as unknown as Record<string, unknown>,
      { source: "memory-vault" },
    );
    return { ok: true, item, metadata: { source: "memory_vault", mode: "update" } };
  }

  async delete(id: string): Promise<LucaMemoryWriteResult> {
    const nodes = this.listNodes();
    const next = nodes.filter(
      (n) => n.id !== id && n.key.toLowerCase() !== id.toLowerCase(),
    );
    if (next.length === nodes.length) {
      return { ok: false, reason: `Memory not found: ${id}` };
    }
    try {
      this.persistNodes(next);
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof Error ? error.message : "Failed to persist memory delete",
      };
    }
    return { ok: true, metadata: { source: "memory_vault", mode: "delete", id } };
  }

  /** Export vault (or filtered subset) as portable JSON. */
  async exportVault(query?: LucaMemoryQuery): Promise<MemoryVaultExport> {
    const { items } = await this.list(query);
    return {
      format: MEMORY_VAULT_EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      itemCount: items.length,
      items,
    };
  }

  /**
   * Import vault JSON. merge = upsert by id; replace = wipe then import.
   */
  async importVault(
    payload: MemoryVaultExport | string | unknown,
    options?: { mode?: "merge" | "replace" },
  ): Promise<MemoryVaultImportResult> {
    const mode = options?.mode ?? "merge";
    let data: MemoryVaultExport;

    try {
      const raw =
        typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload;
      if (!raw || typeof raw !== "object") {
        return {
          ok: false,
          imported: 0,
          skipped: 0,
          mode,
          reason: "Invalid vault payload",
        };
      }
      const obj = raw as Partial<MemoryVaultExport>;
      if (
        obj.format !== MEMORY_VAULT_EXPORT_FORMAT ||
        !Array.isArray(obj.items)
      ) {
        return {
          ok: false,
          imported: 0,
          skipped: 0,
          mode,
          reason: `Expected format ${MEMORY_VAULT_EXPORT_FORMAT} with items[]`,
        };
      }
      data = obj as MemoryVaultExport;
    } catch (error) {
      return {
        ok: false,
        imported: 0,
        skipped: 0,
        mode,
        reason:
          error instanceof Error ? error.message : "Failed to parse vault JSON",
      };
    }

    let nodes: MemoryNode[] =
      mode === "replace" ? [] : [...this.listNodes()];
    let imported = 0;
    let skipped = 0;

    for (const item of data.items) {
      if (!item?.id || typeof item.content !== "string") {
        skipped += 1;
        continue;
      }
      const legacy = mapLucaMemoryItemToLegacyMemory(item) as Partial<MemoryNode> &
        Record<string, unknown>;
      const node: MemoryNode = {
        id: String(legacy.id || item.id),
        key: String(legacy.key || item.id),
        value: String(legacy.value ?? item.content),
        category: (legacy.category as MemoryNode["category"]) || "SEMANTIC",
        timestamp: Number(legacy.timestamp || item.createdAt || Date.now()),
        confidence:
          typeof legacy.confidence === "number" ? legacy.confidence : 0.9,
        metadata: (legacy.metadata as MemoryNode["metadata"]) || {
          source: "memory-vault-import",
        },
      };

      const existing = nodes.findIndex(
        (n) => n.id === node.id || n.key === node.key,
      );
      if (existing >= 0) {
        nodes[existing] = { ...nodes[existing], ...node, timestamp: Date.now() };
      } else {
        nodes.push(node);
      }
      imported += 1;
    }

    try {
      this.persistNodes(nodes);
    } catch (error) {
      return {
        ok: false,
        imported: 0,
        skipped,
        mode,
        reason:
          error instanceof Error
            ? error.message
            : "Failed to persist imported vault",
      };
    }

    return { ok: true, imported, skipped, mode };
  }

  /**
   * Convenience write for new notes into the vault (uses memoryService.saveMemory when available).
   */
  async writeNote(
    key: string,
    content: string,
    category: MemoryNode["category"] = "SEMANTIC",
  ): Promise<LucaMemoryWriteResult> {
    try {
      const node = await this.saveMemory(key, content, category, false);
      if (!node) {
        return { ok: false, reason: "saveMemory returned null (filtered or failed)" };
      }
      const item = mapLegacyMemoryToLucaMemoryItem(
        node as unknown as Record<string, unknown>,
        { source: "memory-vault" },
      );
      return { ok: true, item };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "writeNote failed",
      };
    }
  }
}

let singleton: MemoryVaultService | null = null;

export function getMemoryVaultService(
  deps?: MemoryVaultDependencies,
): MemoryVaultService {
  if (deps) return new MemoryVaultService(deps);
  if (!singleton) singleton = new MemoryVaultService();
  return singleton;
}

export const memoryVaultService = {
  list: (query?: LucaMemoryQuery) => getMemoryVaultService().list(query),
  get: (id: string) => getMemoryVaultService().get(id),
  update: (
    id: string,
    patch: { content?: string; summary?: string; tags?: string[] },
  ) => getMemoryVaultService().update(id, patch),
  delete: (id: string) => getMemoryVaultService().delete(id),
  exportVault: (query?: LucaMemoryQuery) =>
    getMemoryVaultService().exportVault(query),
  importVault: (
    payload: MemoryVaultExport | string | unknown,
    options?: { mode?: "merge" | "replace" },
  ) => getMemoryVaultService().importVault(payload, options),
  writeNote: (
    key: string,
    content: string,
    category?: MemoryNode["category"],
  ) => getMemoryVaultService().writeNote(key, content, category),
};
