import { describe, expect, it } from "vitest";

import {
  LUCA_MOBILE_ACCENT_PRIMARY,
  LUCA_MOBILE_ACCENT_SOFT,
  LUCA_MOBILE_BACKGROUND_BASE,
  LUCA_MOBILE_BACKGROUND_ELEVATED,
  LUCA_MOBILE_SURFACE_SOLID,
  lucaMobileActiveIndicatorStyle,
  lucaMobileActiveTabStyle,
  lucaMobileAppBackgroundStyle,
  lucaMobileCardSurfaceStyle,
  lucaMobileClassNames,
  lucaMobileContentSurfaceStyle,
  lucaMobileNavSurfaceStyle,
  lucaMobilePanelSurfaceStyle,
} from "./lucaMobileShellStyles";

const serialize = (value: unknown) => JSON.stringify(value);

describe("lucaMobileShellStyles", () => {
  it("uses mobile-safe semantic background and solid surface tokens", () => {
    const mobileSurfaces = serialize({
      app: lucaMobileAppBackgroundStyle,
      content: lucaMobileContentSurfaceStyle,
      panel: lucaMobilePanelSurfaceStyle,
      card: lucaMobileCardSurfaceStyle,
      nav: lucaMobileNavSurfaceStyle,
    });

    expect(mobileSurfaces).toContain("--luca-background-base");
    expect(mobileSurfaces).toContain("--luca-background-elevated");
    expect(mobileSurfaces).toContain("--luca-surface-solid");
    expect(mobileSurfaces).toContain("--luca-border-subtle");
    expect(mobileSurfaces).toContain("--luca-text-primary");
  });

  it("does not use liquid wallpaper tokens or full-screen blur as the mobile background policy", () => {
    const mobileBackgroundPolicy = serialize({
      base: LUCA_MOBILE_BACKGROUND_BASE,
      elevated: LUCA_MOBILE_BACKGROUND_ELEVATED,
      solid: LUCA_MOBILE_SURFACE_SOLID,
      app: lucaMobileAppBackgroundStyle,
      content: lucaMobileContentSurfaceStyle,
      panel: lucaMobilePanelSurfaceStyle,
      nav: lucaMobileNavSurfaceStyle,
    });

    expect(mobileBackgroundPolicy).not.toContain("--luca-background-liquid");
    expect(mobileBackgroundPolicy).not.toMatch(/backdropFilter|WebkitBackdropFilter|--luca-blur-level|--app-bg-blur/i);
  });

  it("keeps mobile accent use restrained to active affordances", () => {
    const activeAffordances = serialize({
      tab: lucaMobileActiveTabStyle,
      indicator: lucaMobileActiveIndicatorStyle,
    });
    const passiveSurfaces = serialize({
      app: lucaMobileAppBackgroundStyle,
      content: lucaMobileContentSurfaceStyle,
      panel: lucaMobilePanelSurfaceStyle,
      nav: lucaMobileNavSurfaceStyle,
    });

    expect(activeAffordances).toContain(LUCA_MOBILE_ACCENT_PRIMARY);
    expect(activeAffordances).toContain(LUCA_MOBILE_ACCENT_SOFT);
    expect(passiveSurfaces).not.toContain(LUCA_MOBILE_ACCENT_PRIMARY);
    expect(passiveSurfaces).not.toMatch(/cyan|emerald|green|#00|16,185,129/i);
  });

  it("does not require legacy theme IDs for mobile shell styling", () => {
    const helperSource = serialize({
      classes: lucaMobileClassNames,
      app: lucaMobileAppBackgroundStyle,
      content: lucaMobileContentSurfaceStyle,
      panel: lucaMobilePanelSurfaceStyle,
      nav: lucaMobileNavSurfaceStyle,
    });

    expect(helperSource).not.toMatch(/lucagent|lightcream|ruthless|assistant/i);
  });

  it("does not expose runtime, tool, browser, file, or messaging execution surfaces", () => {
    const helperSource = serialize({
      classes: lucaMobileClassNames,
      app: lucaMobileAppBackgroundStyle,
      panel: lucaMobilePanelSurfaceStyle,
      nav: lucaMobileNavSurfaceStyle,
    });

    expect(helperSource).not.toMatch(
      /executeTool|ipcRenderer|open-browser|browser|file|message|send\(/i,
    );
  });
});
