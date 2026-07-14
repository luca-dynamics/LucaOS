import {
  getLucaSkinDefinition,
  normalizeLucaSkinId,
  type LucaSkinId,
  type LucaSkinMaterialTone,
} from "../config/lucaSkins";
import {
  getLucaSkinMaterialVariables,
  LUCA_SKIN_MATERIAL_VARIABLE_NAMES,
  type LucaSkinMaterialVariableMap,
} from "./lucaSkinMaterialBridge";

export interface LucaNativeBootAppearanceSnapshot {
  schemaVersion: 1;
  skinId: LucaSkinId;
  materialTone: LucaSkinMaterialTone;
  variables: LucaSkinMaterialVariableMap;
}

export interface LucaNativeBootAppearanceOptions {
  skinId?: unknown;
  userMaterialOpacity?: unknown;
  userMaterialBlurPx?: unknown;
}

function finiteNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Creates the small, non-sensitive appearance payload persisted by Electron.
 * Only the established skin/material contract crosses the renderer boundary.
 */
export function createLucaNativeBootAppearanceSnapshot(
  options: LucaNativeBootAppearanceOptions = {},
): LucaNativeBootAppearanceSnapshot {
  const skinId = normalizeLucaSkinId(options.skinId);
  const skin = getLucaSkinDefinition(skinId);
  const variables = getLucaSkinMaterialVariables({
    skinId,
    hostKind: "desktop-app",
    userMaterialOpacity: finiteNumberInRange(
      options.userMaterialOpacity,
      0,
      1,
    ),
    userMaterialBlurPx: finiteNumberInRange(
      options.userMaterialBlurPx,
      0,
      80,
    ),
  });

  return {
    schemaVersion: 1,
    skinId,
    materialTone: skin.materialTone,
    variables: Object.fromEntries(
      LUCA_SKIN_MATERIAL_VARIABLE_NAMES.map((name) => [name, variables[name]]),
    ) as LucaSkinMaterialVariableMap,
  };
}
