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
import {
  getLucaSkinPresenceVariables,
  type LucaSkinPresenceVariableMap,
} from "./lucaSkinPresence";

/**
 * Resolves the selected LucaOS skin for a future local onboarding shell
 * boundary (per docs/luca-onboarding-presence-visual-language-spec.md).
 *
 * Onboarding needs BOTH the material/glass variables (surfaces, text, accent)
 * and the presence variables (ambient face / identity face / orb), so this
 * boundary returns both maps for a single local consumer to spread onto one
 * onboarding shell wrapper.
 *
 * This helper is pure and inert: options in, local variable maps out. It does
 * not apply variables to any UI, root node, provider, or shared runtime
 * surface; it does not mutate document.documentElement, body, or html. It is
 * not yet consumed — onboarding skin application remains staged.
 *
 * Status/safety semantics are intentionally excluded from both maps; danger,
 * warning, approval, permission, voice-live, vision, blocked, and stop states
 * stay outside skin control.
 */

export type LucaOnboardingSkinBoundarySurface =
  | "onboarding-welcome"
  | "onboarding-step"
  | "onboarding-finish";

export interface LucaOnboardingSkinBoundaryOptions {
  selectedSkinId?: unknown;
  hostKind?: LucaSkinHostKind;
  surface?: LucaOnboardingSkinBoundarySurface;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
  /** User-chosen material (onboarding sliders) — overrides the skin defaults. */
  userMaterialOpacity?: number;
  userMaterialBlurPx?: number;
}

export interface LucaOnboardingSkinBoundaryState {
  skinId: LucaSkinId;
  hostKind: LucaSkinHostKind;
  surface: LucaOnboardingSkinBoundarySurface;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  materialVariables: LucaSkinMaterialVariableMap;
  presenceVariables: LucaSkinPresenceVariableMap;
  safetyNotes: string[];
}

const DEFAULT_ONBOARDING_SKIN_HOST_KIND: LucaSkinHostKind = "desktop-web";
const DEFAULT_ONBOARDING_SKIN_SURFACE: LucaOnboardingSkinBoundarySurface =
  "onboarding-welcome";

function resolveOnboardingReducedMotion(
  skinId: LucaSkinId,
  reducedMotion?: boolean,
): boolean {
  // Flow remains static during onboarding for now.
  return skinId === "flow" ? true : Boolean(reducedMotion);
}

function getOnboardingSafetyNotes(options: {
  selectedSkinId?: unknown;
  skinId: LucaSkinId;
  hostKind: LucaSkinHostKind;
  requestedHostKind?: LucaSkinHostKind;
  surface: LucaOnboardingSkinBoundarySurface;
  reducedMotion: boolean;
  reducedTransparency: boolean;
}): string[] {
  const notes: string[] = [];

  if (
    options.skinId === DEFAULT_LUCA_SKIN_ID &&
    options.selectedSkinId !== undefined &&
    options.selectedSkinId !== DEFAULT_LUCA_SKIN_ID
  ) {
    notes.push("Invalid or unsupported skin selection fell back to Luca Light.");
  }

  if (
    options.hostKind === DEFAULT_ONBOARDING_SKIN_HOST_KIND &&
    options.requestedHostKind === undefined
  ) {
    notes.push(
      "Onboarding skin boundary defaulted to desktop-web as the safest general web host.",
    );
  }

  notes.push(
    `Surface intent '${options.surface}' is preserved for future local boundary specificity only.`,
  );

  if (options.skinId === "flow") {
    notes.push(
      "Flow remains static during onboarding; reduced motion is forced for now.",
    );
  } else if (options.reducedMotion) {
    notes.push("Reduced motion was requested by the caller.");
  }

  if (options.reducedTransparency) {
    notes.push(
      "Reduced transparency was requested; material and presence output use solid, zero-blur fallbacks where supported.",
    );
  }

  return notes;
}

export function resolveLucaOnboardingSkinBoundary(
  options: LucaOnboardingSkinBoundaryOptions = {},
): LucaOnboardingSkinBoundaryState {
  const skinId = normalizeLucaSkinId(options.selectedSkinId);
  const hostKind = options.hostKind ?? DEFAULT_ONBOARDING_SKIN_HOST_KIND;
  const surface = options.surface ?? DEFAULT_ONBOARDING_SKIN_SURFACE;
  const reducedMotion = resolveOnboardingReducedMotion(
    skinId,
    options.reducedMotion,
  );
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
      userMaterialOpacity: options.userMaterialOpacity,
      userMaterialBlurPx: options.userMaterialBlurPx,
    }),
    presenceVariables: getLucaSkinPresenceVariables({
      skinId,
      hostKind,
      reducedMotion,
      reducedTransparency,
    }),
    safetyNotes: getOnboardingSafetyNotes({
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
