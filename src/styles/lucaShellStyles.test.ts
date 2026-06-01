import { describe, expect, it } from "vitest";

import {
  LUCA_SHELL_ACCENT_PRIMARY,
  LUCA_SHELL_ACCENT_SOFT,
  LUCA_SHELL_BORDER_STRONG,
  LUCA_SHELL_BORDER_SUBTLE,
  LUCA_SHELL_HOVER_BACKGROUND,
  LUCA_SHELL_SURFACE_BACKGROUND,
  lucaShellActiveControlStyle,
  lucaShellActiveIndicatorStyle,
  lucaShellActiveTabStyle,
  lucaShellClassNames,
  lucaShellControlStyle,
  lucaShellPanelSurfaceStyle,
  lucaShellTabStyle,
} from "./lucaShellStyles";

const serialize = (value: unknown) => JSON.stringify(value);

describe("lucaShellStyles", () => {
  it("uses semantic Luca appearance variables for desktop shell surfaces", () => {
    const surface = serialize(lucaShellPanelSurfaceStyle);

    expect(surface).toContain("--luca-surface-glass");
    expect(surface).toContain("--luca-border-subtle");
    expect(surface).toContain("--luca-text-primary");
    expect(surface).toContain("--luca-shadow-soft");
    expect(surface).toContain("--luca-blur-level");
  });

  it("keeps legacy app variables as fallbacks for compatibility", () => {
    const values = [
      LUCA_SHELL_SURFACE_BACKGROUND,
      LUCA_SHELL_HOVER_BACKGROUND,
      LUCA_SHELL_BORDER_SUBTLE,
      LUCA_SHELL_BORDER_STRONG,
      serialize(lucaShellPanelSurfaceStyle),
    ].join(" ");

    expect(values).toContain("--app-bg-tint");
    expect(values).toContain("--app-border-main");
    expect(values).toContain("--app-text-main");
    expect(values).toContain("--app-bg-blur");
  });

  it("keeps active states restrained to semantic accent variables", () => {
    const activeState = serialize({
      tab: lucaShellActiveTabStyle,
      control: lucaShellActiveControlStyle,
      indicator: lucaShellActiveIndicatorStyle,
    });

    expect(activeState).toContain("--luca-surface-hover");
    expect(activeState).toContain("--luca-border-strong");
    expect(activeState).toContain(LUCA_SHELL_ACCENT_PRIMARY);
    expect(activeState).toContain(LUCA_SHELL_ACCENT_SOFT);
    expect(activeState).not.toMatch(/emerald|green|#00|16,185,129/i);
  });

  it("does not require legacy theme IDs for shell styling", () => {
    const helperSource = serialize({
      classes: lucaShellClassNames,
      panel: lucaShellPanelSurfaceStyle,
      control: lucaShellControlStyle,
      tab: lucaShellTabStyle,
    });

    expect(helperSource).not.toMatch(/lucagent|lightcream|ruthless|assistant/i);
  });

  it("does not expose runtime, tool, browser, file, or messaging execution surfaces", () => {
    const helperSource = serialize({
      classes: lucaShellClassNames,
      panel: lucaShellPanelSurfaceStyle,
      activeControl: lucaShellActiveControlStyle,
    });

    expect(helperSource).not.toMatch(
      /executeTool|ipcRenderer|open-browser|browser|file|message|send\(/i,
    );
  });
});
