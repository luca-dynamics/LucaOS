/**
 * Absorb Phase 3 — LucaLink skill catalog sync pilot.
 *
 * Soft-fail friendly. Packages marketplace catalog for push/pull over LucaLink
 * (or eventBus). Does not install remote code — import goes through marketplace
 * registry only.
 */

import type { SkillRegistryRecord } from "../../types/skillContinuity";
import {
  getSkillMarketplaceService,
  type SkillMarketplaceService,
  type SkillMarketplaceImportResult,
} from "./SkillMarketplaceService";
import {
  LUCA_SKILL_CATALOG_FORMAT,
  type SkillCatalogExport,
} from "./skillImportFormats";

export const SKILL_CATALOG_SYNC_EVENT = "skills:catalog_sync" as const;
export const SKILL_CATALOG_SYNC_BUS_EVENT = "skills:vault_catalog_sync" as const;

export const LUCA_SKILL_SYNC_ENVELOPE = "luca_skill_sync_v1" as const;

export interface SkillCatalogSyncEnvelope {
  format: typeof LUCA_SKILL_SYNC_ENVELOPE;
  direction: "push" | "pull_response";
  fromDeviceId?: string;
  exportedAt: string;
  catalog: SkillCatalogExport;
}

export interface LucaLinkLike {
  on?: (event: string, handler: (event: unknown) => void) => void;
  off?: (event: string, handler: (event: unknown) => void) => void;
  sendEvent?: (target: string, type: string, payload: unknown) => void;
}

export interface EventBusLike {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
  emit?: (event: string, ...args: unknown[]) => void;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapLinkEvent(event: unknown): Record<string, unknown> {
  const rec = asRecord(event);
  if (!rec) return {};
  return asRecord(rec.data) ?? rec;
}

/**
 * Build a sync envelope from the current marketplace catalog.
 */
export function packageSkillCatalogForSync(
  marketplace: SkillMarketplaceService = getSkillMarketplaceService(),
  options?: { fromDeviceId?: string; direction?: "push" | "pull_response" },
): SkillCatalogSyncEnvelope {
  return {
    format: LUCA_SKILL_SYNC_ENVELOPE,
    direction: options?.direction ?? "push",
    fromDeviceId: options?.fromDeviceId,
    exportedAt: new Date().toISOString(),
    catalog: marketplace.exportCatalog(),
  };
}

/**
 * Apply a remote catalog envelope (or raw catalog export) into the marketplace.
 */
export function applySkillCatalogSyncPayload(
  payload: unknown,
  marketplace: SkillMarketplaceService = getSkillMarketplaceService(),
): SkillMarketplaceImportResult & { envelope?: boolean } {
  let raw = payload;
  if (typeof payload === "string") {
    try {
      raw = JSON.parse(payload);
    } catch {
      return {
        ok: false,
        imported: 0,
        skipped: 0,
        skillIds: [],
        reason: "Invalid JSON skill sync payload",
      };
    }
  }

  const rec = asRecord(raw);
  if (!rec) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      skillIds: [],
      reason: "Unrecognized skill sync payload",
    };
  }

  // Full envelope
  if (rec.format === LUCA_SKILL_SYNC_ENVELOPE && rec.catalog) {
    const result = marketplace.importLoose(rec.catalog);
    return { ...result, envelope: true };
  }

  // Bare catalog
  if (rec.format === LUCA_SKILL_CATALOG_FORMAT) {
    const result = marketplace.importLoose(rec);
    return { ...result, envelope: false };
  }

  // Link event data: { catalog: {...} }
  if (rec.catalog) {
    const result = marketplace.importLoose(rec.catalog);
    return { ...result, envelope: true };
  }

  return {
    ok: false,
    imported: 0,
    skipped: 0,
    skillIds: [],
    reason: "Expected luca_skill_sync_v1 envelope or luca_skill_catalog_v1",
  };
}

/**
 * Push catalog to linked devices (soft-fail if sendEvent missing).
 */
export function pushSkillCatalogViaLucaLink(
  link: LucaLinkLike | null | undefined,
  marketplace?: SkillMarketplaceService,
  options?: { fromDeviceId?: string },
): { ok: boolean; reason?: string; envelope?: SkillCatalogSyncEnvelope } {
  if (!link?.sendEvent) {
    return { ok: false, reason: "LucaLink sendEvent unavailable" };
  }
  const envelope = packageSkillCatalogForSync(marketplace, {
    fromDeviceId: options?.fromDeviceId,
    direction: "push",
  });
  try {
    link.sendEvent("all", SKILL_CATALOG_SYNC_EVENT, envelope);
    return { ok: true, envelope };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? error.message : "LucaLink skill push failed",
      envelope,
    };
  }
}

export interface InstallSkillCatalogSyncHooksResult {
  installed: boolean;
  reason?: string;
  dispose?: () => void;
}

/**
 * Install soft hooks for skill catalog sync on LucaLink + eventBus.
 */
export function installSkillCatalogSyncHooks(options?: {
  lucaLink?: LucaLinkLike | null;
  bus?: EventBusLike | null;
  marketplace?: SkillMarketplaceService;
}): InstallSkillCatalogSyncHooksResult {
  const link = options?.lucaLink ?? null;
  const bus = options?.bus ?? null;
  const marketplace = options?.marketplace;

  if (!link?.on && !bus?.on) {
    return { installed: false, reason: "No LucaLink or eventBus available" };
  }

  const handlers: Array<{
    target: "link" | "bus";
    event: string;
    fn: (...args: unknown[]) => void;
  }> = [];

  const onPayload = (...args: unknown[]) => {
    const payload = unwrapLinkEvent(args[0]);
    try {
      applySkillCatalogSyncPayload(payload, marketplace);
    } catch (error) {
      console.warn("[SKILL_MARKETPLACE_SYNC] apply failed", error);
    }
  };

  if (link?.on) {
    link.on(`event:${SKILL_CATALOG_SYNC_EVENT}`, onPayload);
    link.on(SKILL_CATALOG_SYNC_EVENT, onPayload);
    handlers.push({
      target: "link",
      event: `event:${SKILL_CATALOG_SYNC_EVENT}`,
      fn: onPayload,
    });
    handlers.push({
      target: "link",
      event: SKILL_CATALOG_SYNC_EVENT,
      fn: onPayload,
    });
  }

  if (bus?.on) {
    bus.on(SKILL_CATALOG_SYNC_BUS_EVENT, onPayload);
    handlers.push({
      target: "bus",
      event: SKILL_CATALOG_SYNC_BUS_EVENT,
      fn: onPayload,
    });
  }

  return {
    installed: true,
    dispose: () => {
      for (const h of handlers) {
        try {
          if (h.target === "link") link?.off?.(h.event, h.fn);
          else bus?.off?.(h.event, h.fn);
        } catch {
          /* soft-fail */
        }
      }
    },
  };
}

/** Diff helper for UI: count remote vs local skill ids. */
export function summarizeCatalogDiff(
  local: SkillRegistryRecord[],
  remoteSkillIds: string[],
): { localOnly: number; remoteOnly: number; shared: number } {
  const localIds = new Set(local.map((s) => s.skillId));
  const remoteIds = new Set(remoteSkillIds);
  let shared = 0;
  let remoteOnly = 0;
  for (const id of remoteIds) {
    if (localIds.has(id)) shared += 1;
    else remoteOnly += 1;
  }
  const localOnly = [...localIds].filter((id) => !remoteIds.has(id)).length;
  return { localOnly, remoteOnly, shared };
}
