/**
 * Absorb Phase 2 — TokenJuice-like compression pilot for Memory Vault.
 *
 * Representation-only: exact/near-duplicate collapse + long-content trim.
 * Does not call remote summarization models in this pilot.
 */

import type { MemoryNode } from "../../types";

export interface MemoryVaultCompressOptions {
  /** Max characters kept per item body (default 800). */
  maxContentLength?: number;
  /** Collapse items with identical trimmed content (default true). */
  collapseExactDuplicates?: boolean;
  /** Collapse items that share the same key (keep newest) (default true). */
  collapseSameKey?: boolean;
}

export interface MemoryVaultCompressResult {
  ok: boolean;
  beforeCount: number;
  afterCount: number;
  removedDuplicates: number;
  truncated: number;
  reason?: string;
}

function normalizeBody(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Compress a node list in memory (pure). Caller persists the result.
 */
export function compressMemoryNodes(
  nodes: MemoryNode[],
  options: MemoryVaultCompressOptions = {},
): { nodes: MemoryNode[]; result: MemoryVaultCompressResult } {
  const maxContentLength = options.maxContentLength ?? 800;
  const collapseExact = options.collapseExactDuplicates !== false;
  const collapseKey = options.collapseSameKey !== false;

  const beforeCount = nodes.length;
  let working = [...nodes].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  let removedDuplicates = 0;

  if (collapseKey) {
    const byKey = new Map<string, MemoryNode>();
    for (const node of working) {
      const k = (node.key || node.id || "").toLowerCase();
      if (!k) {
        byKey.set(node.id, node);
        continue;
      }
      if (!byKey.has(k)) {
        byKey.set(k, node);
      } else {
        removedDuplicates += 1;
      }
    }
    working = Array.from(byKey.values());
  }

  if (collapseExact) {
    const byBody = new Map<string, MemoryNode>();
    for (const node of working) {
      const body = normalizeBody(node.value || "");
      if (!body) {
        byBody.set(node.id, node);
        continue;
      }
      if (!byBody.has(body)) {
        byBody.set(body, node);
      } else {
        removedDuplicates += 1;
      }
    }
    working = Array.from(byBody.values());
  }

  let truncated = 0;
  working = working.map((node) => {
    const value = node.value || "";
    if (value.length <= maxContentLength) return node;
    truncated += 1;
    return {
      ...node,
      value: `${value.slice(0, maxContentLength).trimEnd()}…`,
      metadata: {
        ...(node.metadata || {}),
        compressed: true,
        originalLength: value.length,
      } as MemoryNode["metadata"],
    };
  });

  // Stable-ish order: newest first
  working.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return {
    nodes: working,
    result: {
      ok: true,
      beforeCount,
      afterCount: working.length,
      removedDuplicates,
      truncated,
    },
  };
}
