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

export type LucaBootSkinBoundarySurface =
  | "boot-window"
  | "boot-loading"
  | "mode-select"
  | "onboarding";

export interface LucaBootSkinBoundaryOptions {
  selectedSkinId?: unknown;
  hostKind?: LucaSkinHostKind;
  surface?: LucaBootSkinBoundarySurface;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
}

export interface LucaBootSkinBoundaryState {
  skinId: LucaSkinId;
  hostKind: LucaSkinHostKind;
  surface: LucaBootSkinBoundarySurface;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  materialVariables: LucaSkinMaterialVariableMap;
  safetyNotes: string[];
}

const DEFAULT_BOOT_SKIN_HOST_KIND: LucaSkinHostKind = "desktop-web";
const DEFAULT_BOOT_SKIN_SURFACE: LucaBootSkinBoundarySurface = "boot-window";

function resolveBootReducedMotion(skinId: LucaSkinId, reducedMotion?: boolean): boolean {
  return skinId === "flow" ? true : Boolean(reducedMotion);
}

function getBootSafetyNotes(options: {
  selectedSkinId?: unknown;
  skinId: LucaSkinId;
  hostKind: LucaSkinHostKind;
  requestedHostKind?: LucaSkinHostKind;
  surface: LucaBootSkinBoundarySurface;
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

  if (options.hostKind === DEFAULT_BOOT_SKIN_HOST_KIND && options.requestedHostKind === undefined) {
    notes.push("Boot skin boundary defaulted to desktop-web as the safest general web host.");
  }

  notes.push(
    `Surface intent '${options.surface}' is preserved for future local boundary specificity only.`,
  );

  if (options.skinId === "flow") {
    notes.push("Flow remains static during boot and onboarding; reduced motion is forced for now.");
  } else if (options.reducedMotion) {
    notes.push("Reduced motion was requested by the caller.");
  }

  if (options.reducedTransparency) {
    notes.push("Reduced transparency was requested; material output uses solid and zero-blur fallbacks where supported.");
  }

  return notes;
}

/**
 * Resolves selected LucaOS skin material variables for future startup and setup boundaries.
 *
 * This helper is pure and inert: it returns a local material variable map and
 * safety notes only. It does not apply variables to UI, root nodes, providers,
 * readiness, setup flow, or any shared service surface.
 */
export function resolveLucaBootSkinBoundary(
  options: LucaBootSkinBoundaryOptions = {},
): LucaBootSkinBoundaryState {
  const skinId = normalizeLucaSkinId(options.selectedSkinId);
  const hostKind = options.hostKind ?? DEFAULT_BOOT_SKIN_HOST_KIND;
  const surface = options.surface ?? DEFAULT_BOOT_SKIN_SURFACE;
  const reducedMotion = resolveBootReducedMotion(skinId, options.reducedMotion);
  const reducedTransparency = Boolean(options.reducedTransparency);

  return {
    skinId,
    hostKind,
    surface,
    reducedMotion,
    reducedTransparency,
    materialVariables: getLucaSkinMaterialVariables({
      skinId,
      hostKind,
      reducedMotion,
      reducedTransparency,
    }),
    safetyNotes: getBootSafetyNotes({
      selectedSkinId: options.selectedSkinId,
      skinId,
      hostKind,
      requestedHostKind: options.hostKind,
      surface,
      reducedMotion,
      reducedTransparency,
    }),
  };
}
