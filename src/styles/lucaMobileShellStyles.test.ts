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
  lucaMobileGlassControlStyle,
  lucaMobileNavActiveStyle,
  lucaMobileNavInactiveStyle,
  lucaMobileNavSurfaceStyle,
  lucaMobilePanelSurfaceStyle,
  lucaMobileSheetSurfaceStyle,
} from "./lucaMobileShellStyles";

const serialize = (value: unknown) => JSON.stringify(value);

const ALL_MOBILE_STYLES = serialize({
  app: lucaMobileAppBackgroundStyle,
  content: lucaMobileContentSurfaceStyle,
  panel: lucaMobilePanelSurfaceStyle,
  sheet: lucaMobileSheetSurfaceStyle,
  card: lucaMobileCardSurfaceStyle,
  nav: lucaMobileNavSurfaceStyle,
  navActive: lucaMobileNavActiveStyle,
  navInactive: lucaMobileNavInactiveStyle,
  glassControl: lucaMobileGlassControlStyle,
  activeTab: lucaMobileActiveTabStyle,
  indicator: lucaMobileActiveIndicatorStyle,
});

const STATUS_OR_SAFETY_NAME_PARTS = [
  "danger",
  "warning",
  "success",
  "approval",
  "permission",
  "blocked",
  "mission",
  "listening",
  "stop-generation",
] as const;

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

  it("keeps inactive bottom-nav labels readable via the secondary text role", () => {
    const navInactive = serialize(lucaMobileNavInactiveStyle);
    const navActive = serialize(lucaMobileNavActiveStyle);

    expect(navInactive).toContain("--luca-text-secondary");
    expect(navInactive).not.toContain("--luca-text-tertiary");
    // Active items remain at full primary contrast for clear selected state.
    expect(navActive).toContain("--luca-text-primary");
  });

  it("opts small glass affordances into capped skin blur with a safe 0px fallback", () => {
    const glassControl = serialize(lucaMobileGlassControlStyle);

    expect(glassControl).toContain("--luca-material-blur");
    expect(glassControl).toContain("0px");
    expect(glassControl).toMatch(/backdropFilter/);

    // Primary structural surfaces must stay solid (no full-screen blur).
    const primarySurfaces = serialize({
      app: lucaMobileAppBackgroundStyle,
      content: lucaMobileContentSurfaceStyle,
      panel: lucaMobilePanelSurfaceStyle,
      sheet: lucaMobileSheetSurfaceStyle,
      nav: lucaMobileNavSurfaceStyle,
    });
    expect(primarySurfaces).not.toMatch(/backdropFilter|--luca-material-blur/i);
  });

  it("adds no Flow-style motion to mobile shell surfaces", () => {
    expect(ALL_MOBILE_STYLES).not.toMatch(
      /@keyframes|animation|requestAnimationFrame|setInterval|setTimeout|parallax/i,
    );
  });

  it("does not override status or safety variables in mobile shell surfaces", () => {
    for (const part of STATUS_OR_SAFETY_NAME_PARTS) {
      expect(ALL_MOBILE_STYLES.toLowerCase()).not.toContain(part);
    }
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
