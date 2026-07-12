import { describe, expect, it } from "vitest";
import { getLucaSkinMaterialVariables } from "../../styles/lucaSkinMaterialBridge";
import { resolveVoiceHudSkinPalette } from "./voiceHudSkinModel";

describe("resolveVoiceHudSkinPalette", () => {
  it.each(["pearl", "carbon", "flow", "canvas", "graphite", "onyx", "dusk", "mist"])(
    "uses the %s skin for the VoiceHud visual palette",
    (skinId) => {
      const variables = getLucaSkinMaterialVariables({ skinId });
      const palette = resolveVoiceHudSkinPalette(variables, {
        primary: "#ff0000",
        secondary: "#00ff00",
        background: "#0000ff",
      });

      expect(palette).toEqual({
        primary: variables["--luca-accent-primary"],
        secondary: variables["--luca-accent-soft"],
        background: variables["--luca-background-base"],
      });
    },
  );
});
