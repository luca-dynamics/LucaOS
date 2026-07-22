/**
 * Absorb Phase 3 — product boot bridge for Skill Marketplace.
 * Installs LucaLink / eventBus catalog sync hooks once (soft-fail).
 */

import {
  installSkillCatalogSyncHooks,
  type EventBusLike,
  type InstallSkillCatalogSyncHooksResult,
  type LucaLinkLike,
} from "./skillMarketplaceLinkSync";
import {
  getSkillMarketplaceService,
  type SkillMarketplaceService,
} from "./SkillMarketplaceService";

let installed: InstallSkillCatalogSyncHooksResult | null = null;
let installPromise: Promise<InstallSkillCatalogSyncHooksResult> | null = null;

/**
 * Ensure skill catalog sync hooks are installed (idempotent).
 */
export async function ensureSkillMarketplaceProductBridge(options?: {
  lucaLink?: LucaLinkLike | null;
  bus?: EventBusLike | null;
  marketplace?: SkillMarketplaceService;
}): Promise<InstallSkillCatalogSyncHooksResult> {
  if (installed?.installed) return installed;
  if (installPromise) return installPromise;

  installPromise = (async () => {
    // undefined = auto-resolve; null = explicit opt-out (tests)
    let link: LucaLinkLike | null | undefined = options?.lucaLink;
    let bus: EventBusLike | null | undefined = options?.bus;

    if (link === undefined) {
      try {
        const mod = await import("../lucaLink/manager");
        link = mod.lucaLinkManager as LucaLinkLike;
      } catch {
        link = null;
      }
    }

    if (bus === undefined) {
      try {
        const mod = await import("../eventBus");
        bus = mod.eventBus as EventBusLike;
      } catch {
        bus = null;
      }
    }

    const marketplace =
      options?.marketplace ?? getSkillMarketplaceService();

    const result = installSkillCatalogSyncHooks({
      lucaLink: link ?? null,
      bus: bus ?? null,
      marketplace,
    });
    installed = result;
    if (result.installed) {
      console.log(
        "[SKILL_MARKETPLACE] Phase 3 catalog sync product bridge installed",
      );
    }
    return result;
  })();

  try {
    return await installPromise;
  } finally {
    installPromise = null;
  }
}

export function getSkillMarketplaceBridgeStatus(): {
  installed: boolean;
  reason?: string;
} {
  return {
    installed: Boolean(installed?.installed),
    reason: installed?.reason,
  };
}

/** Test helper: reset singleton install state. */
export function resetSkillMarketplaceProductBridgeForTests(): void {
  installed?.dispose?.();
  installed = null;
  installPromise = null;
}
