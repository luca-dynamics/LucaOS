import { describe, expect, it } from "vitest";
import {
  LUCA_MATERIAL_TEXTURE_QUIET,
  LUCA_MATERIAL_TEXTURE_STANDARD,
  lucaMaterialCardStyle,
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
  lucaMaterialMetricStyle,
  lucaMaterialPanelStyle,
  lucaMaterialPopoverStyle,
  lucaMaterialSolidCardStyle,
} from "./lucaMaterialSystem";

describe("Luca material role optical textures", () => {
  it("gives hierarchy surfaces a restrained quiet texture", () => {
    expect(lucaMaterialPanelStyle.background).toContain(LUCA_MATERIAL_TEXTURE_QUIET);
    expect(lucaMaterialCardStyle.background).toContain(LUCA_MATERIAL_TEXTURE_QUIET);
    expect(lucaMaterialSolidCardStyle.background).toContain(
      LUCA_MATERIAL_TEXTURE_QUIET,
    );
    expect(lucaMaterialDialogStyle.background).toContain(LUCA_MATERIAL_TEXTURE_QUIET);
  });

  it("gives small elevated interaction surfaces the clearer standard texture", () => {
    expect(lucaMaterialControlStyle.background).toContain(LUCA_MATERIAL_TEXTURE_STANDARD);
    expect(lucaMaterialPopoverStyle.background).toContain(LUCA_MATERIAL_TEXTURE_STANDARD);
  });

  it("keeps dense metric surfaces optically quiet", () => {
    expect(lucaMaterialMetricStyle.background).not.toContain("radial-gradient");
    expect(lucaMaterialMetricStyle.background).not.toContain("linear-gradient");
  });

  it("keeps nested solid cards free of stacked backdrop blur", () => {
    expect(lucaMaterialSolidCardStyle.backdropFilter).toBeUndefined();
    expect(lucaMaterialSolidCardStyle.WebkitBackdropFilter).toBeUndefined();
  });
});
