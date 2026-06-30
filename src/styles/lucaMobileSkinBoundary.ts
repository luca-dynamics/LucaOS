import {
  DEFAULT_LUCA_SKIN_ID,
  normalizeLucaSkinId,
  type LucaSkinHostKind,
  type LucaSkinId,
} from "../config/lucaSkins";
import {
  getLucaSkinMaterialVariables,
  type LucaSkinMaterialVariableMap,
} from "./lucaSkinMaterialBridge";

const DEFAULT_MOBILE_SKIN_HOST_KIND: LucaSkinHostKind = "mobile-web";
const MOBILE_HOST_KINDS: ReadonlySet<LucaSkinHostKind> = new Set([
  "mobile-app",
  "mobile-web",
]);

export interface LucaMobileSkinBoundaryOptions {
  selectedSkinId?: unknown;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
}

export interface LucaMobileSkinBoundaryState {
  skinId: LucaSkinId;
  hostKind: LucaSkinHostKind;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  materialVariables: LucaSkinMaterialVariableMap;
  safetyNotes: string[];
}

function normalizeMobileHostKind(hostKind: LucaSkinHostKind | undefined): LucaSkinHostKind {
  return hostKind && MOBILE_HOST_KINDS.has(hostKind)
    ? hostKind
    : DEFAULT_MOBILE_SKIN_HOST_KIND;
}

function resolveMobileReducedMotion(skinId: LucaSkinId, reducedMotion?: boolean): boolean {
  return skinId === "flow" ? true : Boolean(reducedMotion);
}

function getMobileSafetyNotes(options: {
  selectedSkinId?: unknown;
  skinId: LucaSkinId;
  hostKind: LucaSkinHostKind;
  requestedHostKind?: LucaSkinHostKind;
  reducedMotion: boolean;
  reducedTransparency: boolean;
}): string[] {
  const notes: string[] = [];

  if (
    options.skinId === DEFAULT_LUCA_SKIN_ID &&
    options.selectedSkinId !== undefined &&
    options.selectedSkinId !== DEFAULT_LUCA_SKIN_ID
  ) {
    notes.push("Invalid or unsupported skin selection fell back to Carbon.");
  }

  if (options.hostKind === DEFAULT_MOBILE_SKIN_HOST_KIND && options.requestedHostKind !== DEFAULT_MOBILE_SKIN_HOST_KIND) {
    notes.push("Mobile skin boundary defaulted to mobile-web as the safest mobile host.");
  }

  if (options.hostKind === "mobile-web") {
    notes.push("Mobile-web prefers conservative material output and solid fallback behavior where host policy supports it.");
  }

  if (options.skinId === "flow") {
    notes.push("Flow remains static on mobile; reduced motion is forced for now.");
  } else if (options.reducedMotion) {
    notes.push("Reduced motion was requested by the caller.");
  }

  if (options.reducedTransparency) {
    notes.push("Reduced transparency was requested; material output uses solid and zero-blur fallbacks where supported.");
  }

  return notes;
}

/**
 * Resolves selected LucaOS skin material variables for a future mobile shell boundary.
 *
 * This helper is pure and inert: it only returns local material variables for a
 * future boundary consumer. It does not apply variables to any UI, root node, or
 * shared runtime surface.
 */
export function resolveLucaMobileSkinBoundary(
  options: LucaMobileSkinBoundaryOptions = {},
): LucaMobileSkinBoundaryState {
  const skinId = normalizeLucaSkinId(options.selectedSkinId);
  const hostKind = normalizeMobileHostKind(options.hostKind);
  const reducedMotion = resolveMobileReducedMotion(skinId, options.reducedMotion);
  const reducedTransparency = Boolean(options.reducedTransparency);

  return {
    skinId,
    hostKind,
    reducedMotion,
    reducedTransparency,
    materialVariables: getLucaSkinMaterialVariables({
      skinId,
      hostKind,
      reducedMotion,
      reducedTransparency,
    }),
    safetyNotes: getMobileSafetyNotes({
      selectedSkinId: options.selectedSkinId,
      skinId,
      hostKind,
      requestedHostKind: options.hostKind,
      reducedMotion,
      reducedTransparency,
    }),
  };
}
