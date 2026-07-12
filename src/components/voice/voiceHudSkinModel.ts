import type { LucaSkinMaterialVariableMap } from "../../styles/lucaSkinMaterialBridge";

export interface VoiceHudSkinPalette {
  primary: string;
  secondary: string;
  background: string;
}

export function resolveVoiceHudSkinPalette(
  variables: LucaSkinMaterialVariableMap,
  fallback: VoiceHudSkinPalette,
): VoiceHudSkinPalette {
  return {
    primary: variables["--luca-accent-primary"] || fallback.primary,
    secondary: variables["--luca-accent-soft"] || fallback.secondary,
    background: variables["--luca-background-base"] || fallback.background,
  };
}
