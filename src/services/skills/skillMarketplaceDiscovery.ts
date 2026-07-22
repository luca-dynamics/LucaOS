/**
 * Absorb Phase 3 — richer skill catalog discovery / filter.
 */

import type { SkillRegistryRecord } from "../../types/skillContinuity";
import type { LucaSkillRiskLevel } from "./SkillManifest";
import type { SkillContinuityLifecycleState } from "../../types/skillContinuity";

export interface SkillCatalogDiscoveryQuery {
  text?: string;
  lifecycle?: SkillContinuityLifecycleState | "all";
  riskLevel?: LucaSkillRiskLevel | "all";
  source?: string | "all";
  /** Match any capability substring (case-insensitive). */
  capability?: string;
  /** Match any required permission substring. */
  permission?: string;
  /** Prefer enabled / low-risk first. */
  sort?: "name" | "updated" | "risk" | "lifecycle";
  limit?: number;
}

export interface SkillCatalogDiscoveryResult {
  items: SkillRegistryRecord[];
  totalMatched: number;
  totalCatalog: number;
  facets: {
    byLifecycle: Record<string, number>;
    byRisk: Record<string, number>;
    bySource: Record<string, number>;
  };
}

const RISK_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const LIFECYCLE_ORDER: Record<string, number> = {
  enabled: 0,
  installed: 1,
  discovered: 2,
  update_pending: 3,
  disabled: 4,
  deprecated: 5,
  quarantined: 6,
  removed: 7,
};

function matchesText(record: SkillRegistryRecord, text: string): boolean {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    record.name,
    record.skillId,
    record.source,
    record.version,
    ...(record.capabilities || []),
    ...(record.requiredPermissions || []),
    typeof (record.manifest as { description?: string })?.description ===
    "string"
      ? (record.manifest as { description: string }).description
      : "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Filter + facet a skill catalog for marketplace discovery.
 */
export function discoverSkills(
  catalog: SkillRegistryRecord[],
  query: SkillCatalogDiscoveryQuery = {},
): SkillCatalogDiscoveryResult {
  let items = [...catalog];

  if (query.text?.trim()) {
    items = items.filter((r) => matchesText(r, query.text!));
  }
  if (query.lifecycle && query.lifecycle !== "all") {
    items = items.filter((r) => r.lifecycleState === query.lifecycle);
  }
  if (query.riskLevel && query.riskLevel !== "all") {
    items = items.filter((r) => r.riskLevel === query.riskLevel);
  }
  if (query.source && query.source !== "all") {
    const src = query.source.toLowerCase();
    items = items.filter((r) => r.source.toLowerCase().includes(src));
  }
  if (query.capability?.trim()) {
    const cap = query.capability.trim().toLowerCase();
    items = items.filter((r) =>
      (r.capabilities || []).some((c) => c.toLowerCase().includes(cap)),
    );
  }
  if (query.permission?.trim()) {
    const perm = query.permission.trim().toLowerCase();
    items = items.filter((r) =>
      (r.requiredPermissions || []).some((p) => p.toLowerCase().includes(perm)),
    );
  }

  const sort = query.sort ?? "name";
  items.sort((a, b) => {
    if (sort === "updated") {
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    }
    if (sort === "risk") {
      return (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9);
    }
    if (sort === "lifecycle") {
      return (
        (LIFECYCLE_ORDER[a.lifecycleState] ?? 9) -
        (LIFECYCLE_ORDER[b.lifecycleState] ?? 9)
      );
    }
    return a.name.localeCompare(b.name);
  });

  const totalMatched = items.length;
  if (query.limit != null && query.limit > 0) {
    items = items.slice(0, query.limit);
  }

  const byLifecycle: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const r of catalog) {
    byLifecycle[r.lifecycleState] = (byLifecycle[r.lifecycleState] || 0) + 1;
    byRisk[r.riskLevel] = (byRisk[r.riskLevel] || 0) + 1;
    bySource[r.source] = (bySource[r.source] || 0) + 1;
  }

  return {
    items,
    totalMatched,
    totalCatalog: catalog.length,
    facets: { byLifecycle, byRisk, bySource },
  };
}
