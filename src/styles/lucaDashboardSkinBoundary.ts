import { normalizeLucaSkinId, type LucaSkinHostKind } from "../config/lucaSkins";
import { getLucaSkinMaterialVariables, type LucaSkinMaterialVariableMap } from "./lucaSkinMaterialBridge";

export interface LucaDashboardSkinBoundaryOptions {
  selectedSkinId?: unknown;
  hostKind?: LucaSkinHostKind;
  reducedMotion?: boolean;
  reducedTransparency?: boolean;
}

export interface LucaDashboardSkinBoundaryState {
  skinId: ReturnType<typeof normalizeLucaSkinId>;
  materialVariables: LucaSkinMaterialVariableMap;
}

/**
 * Resolves the selected LucaOS skin for the dashboard shell boundary only.
 *
 * This helper is intentionally pure: it returns a local CSS variable map for a
 * React boundary style prop and never mutates document.documentElement, body,
 * html, or any global provider. When no host policy is available at the shell
 * boundary, desktop-web is the safest static default because it avoids assuming
 * native desktop glass or mobile-specific constraints.
 */
export function resolveLucaDashboardSkinBoundary(
  options: LucaDashboardSkinBoundaryOptions = {},
): LucaDashboardSkinBoundaryState {
  const skinId = normalizeLucaSkinId(options.selectedSkinId);

  return {
    skinId,
    materialVariables: getLucaSkinMaterialVariables({
      skinId,
      hostKind: options.hostKind ?? "desktop-web",
      reducedMotion: options.reducedMotion,
      reducedTransparency: options.reducedTransparency,
    }),
  };
}
