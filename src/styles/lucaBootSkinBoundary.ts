import {
  DEFAULT_LUCA_SKIN_ID,
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
  | "mode-select";

export interface LucaBootSkinBoundaryOptions {
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

function getBootSafetyNotes(options: {
  hostKind: LucaSkinHostKind;
  requestedHostKind?: LucaSkinHostKind;
  surface: LucaBootSkinBoundarySurface;
  reducedMotion: boolean;
  reducedTransparency: boolean;
}): string[] {
  const notes: string[] = [];

  if (options.hostKind === DEFAULT_BOOT_SKIN_HOST_KIND && options.requestedHostKind === undefined) {
    notes.push("Boot skin boundary defaulted to desktop-web as the safest general web host.");
  }

  notes.push(
    `Surface intent '${options.surface}' is preserved for future local boundary specificity only.`,
  );

  notes.push("Boot is locked to Carbon; user skin ownership begins at onboarding.");

  if (options.reducedMotion) {
    notes.push("Reduced motion was requested by the caller.");
  }

  if (options.reducedTransparency) {
    notes.push("Reduced transparency was requested; material output uses solid and zero-blur fallbacks where supported.");
  }

  return notes;
}

/**
 * Resolves LucaOS's fixed neutral startup material.
 *
 * This helper is pure and inert: it returns a local material variable map and
 * safety notes only. It does not apply variables to UI, root nodes, providers,
 * readiness, setup flow, or any shared service surface.
 */
export function resolveLucaBootSkinBoundary(
  options: LucaBootSkinBoundaryOptions = {},
): LucaBootSkinBoundaryState {
  const skinId = DEFAULT_LUCA_SKIN_ID;
  const hostKind = options.hostKind ?? DEFAULT_BOOT_SKIN_HOST_KIND;
  const surface = options.surface ?? DEFAULT_BOOT_SKIN_SURFACE;
  const reducedMotion = Boolean(options.reducedMotion);
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
      hostKind,
      requestedHostKind: options.hostKind,
      surface,
      reducedMotion,
      reducedTransparency,
    }),
  };
}
