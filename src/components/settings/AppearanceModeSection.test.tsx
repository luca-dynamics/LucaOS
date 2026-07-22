// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AppearanceModeSection, {
  APPEARANCE_MODE_HELPER_COPY,
} from "./AppearanceModeSection";

const mount = (ui: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe("AppearanceModeSection", () => {
  it("renders the three Luca-branded appearance modes as a radiogroup", () => {
    const markup = renderToStaticMarkup(<AppearanceModeSection />);
    expect(markup).toContain('role="radiogroup"');
    for (const mode of ["light", "dark", "system"]) {
      expect(markup).toContain(`data-luca-appearance-mode="${mode}"`);
    }
    expect(markup).toContain("Luca Light");
    expect(markup).toContain("Luca Dark");
    expect(markup).toContain("System");
    expect(APPEARANCE_MODE_HELPER_COPY).toContain("light or dark");
  });

  it("defaults to light and marks the current mode as checked", () => {
    const defaulted = renderToStaticMarkup(<AppearanceModeSection />);
    expect(defaulted).toMatch(
      /aria-checked="true" data-luca-appearance-mode="light"/,
    );

    const dark = renderToStaticMarkup(
      <AppearanceModeSection appearanceMode="dark" />,
    );
    expect(dark).toMatch(/aria-checked="true" data-luca-appearance-mode="dark"/);
    expect(dark).toMatch(
      /aria-checked="false" data-luca-appearance-mode="light"/,
    );

    // An unknown persisted value falls back to the default mode.
    const invalid = renderToStaticMarkup(
      <AppearanceModeSection appearanceMode="not-a-mode" />,
    );
    expect(invalid).toMatch(
      /aria-checked="true" data-luca-appearance-mode="light"/,
    );
  });

  it("reports the chosen mode and the skin it resolves to", () => {
    const onAppearanceModeChange = vi.fn();
    const { container, cleanup } = mount(
      <AppearanceModeSection onAppearanceModeChange={onAppearanceModeChange} />,
    );

    const click = (mode: string) =>
      act(() => {
        (
          container.querySelector(
            `[data-luca-appearance-mode="${mode}"]`,
          ) as HTMLButtonElement
        ).click();
      });

    click("dark");
    expect(onAppearanceModeChange).toHaveBeenCalledWith("dark", "carbon");

    click("light");
    expect(onAppearanceModeChange).toHaveBeenLastCalledWith("light", "pearl");

    // "system" resolves through the OS signal; jsdom reports no dark
    // preference, so it lands on the light skin.
    click("system");
    expect(onAppearanceModeChange).toHaveBeenLastCalledWith("system", "pearl");

    cleanup();
  });

  it("does not mutate document root / body styles when mounted", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    const { cleanup } = mount(<AppearanceModeSection />);

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);

    cleanup();
  });
});
