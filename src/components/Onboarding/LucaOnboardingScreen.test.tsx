// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LucaOnboardingScreen, getLucaOnboardingScreenPresence } from "./LucaOnboardingScreen";
import { getPremiumOnboardingCopy } from "./onboardingPremiumCopy";

describe("LucaOnboardingScreen", () => {
  it("renders the merged copy for a screen (no re-authored text)", () => {
    const copy = getPremiumOnboardingCopy("basic").screens.environment;
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" />,
    );
    expect(markup).toContain(copy.title);
    expect(markup).toContain(copy.summary);
    expect(markup).toContain(copy.primaryCta);
    expect(markup).toContain('data-luca-onboarding-screen="environment"');
    // The light hero closes with the Settings footnote instead of the
    // per-screen reassurance line.
    expect(markup).toContain(
      "You can customize colors, accents, and more in Settings.",
    );
  });

  it("renders an inert radiogroup with the appearance-mode cards and the recommended chip", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" />,
    );
    expect(markup).toContain('role="radiogroup"');
    // One identity, two modes (plus follow-the-system).
    for (const id of ["light", "dark", "system"]) {
      expect(markup).toContain(`data-luca-onboarding-option="${id}"`);
      expect(markup).toContain(`data-luca-onboarding-appearance-option="${id}"`);
    }
    // Light is the recommended appearance mode.
    expect(markup).toContain('data-luca-onboarding-chip="recommended"');
  });

  it("marks the selected option (falling back to the map default) as checked", () => {
    const defaulted = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" />,
    );
    // Default appearance mode is light.
    expect(defaulted).toMatch(
      /aria-checked="true" data-luca-onboarding-option="light"/,
    );

    const explicit = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" selectedOptionId="dark" />,
    );
    expect(explicit).toMatch(
      /aria-checked="true" data-luca-onboarding-option="dark"/,
    );
    expect(explicit).toMatch(
      /aria-checked="false" data-luca-onboarding-option="light"/,
    );
  });

  it("keeps the hologram identity face present on every screen (incarnation rhythm)", () => {
    expect(getLucaOnboardingScreenPresence("welcome")).toBe("identity");
    expect(getLucaOnboardingScreenPresence("finish")).toBe("identity");
    expect(getLucaOnboardingScreenPresence("presence")).toBe("identity");
    expect(getLucaOnboardingScreenPresence("permission_style")).toBe("identity");

    // Welcome is the bespoke light hero: the being appears as the large
    // hologram face itself rather than the LucaPresence orb wrapper.
    const welcome = renderToStaticMarkup(<LucaOnboardingScreen screenId="welcome" />);
    expect(welcome).toContain("/hologram.png");
    expect(welcome).toContain('data-luca-onboarding-screen="welcome"');

    // The centered choice screens carry the light chrome (their own step
    // progress) rather than a face; the face returns large at finish.
    const trust = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="permission_style" />,
    );
    expect(trust).toContain('data-luca-onboarding-screen="permission_style"');
    expect(trust).toContain("data-luca-onboarding-preview-progress");

    const finish = renderToStaticMarkup(<LucaOnboardingScreen screenId="finish" />);
    expect(finish).toContain("/hologram.png");
    expect(finish).toContain('data-luca-onboarding-screen="finish"');
  });

  it("keeps the primary action semantic on the light hero CTAs", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="permission_style" />,
    );

    expect(markup).toMatch(
      /data-luca-onboarding-cta="primary" class="luca-material-pressable"/,
    );
    expect(markup).toContain('data-luca-onboarding-cta="secondary"');
  });

  it("invokes CTA and option callbacks without performing side effects", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    const onSelectOption = vi.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <LucaOnboardingScreen
          screenId="environment"
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          onSelectOption={onSelectOption}
        />,
      );
    });

    const primary = container.querySelector(
      '[data-luca-onboarding-cta="primary"]',
    ) as HTMLButtonElement;
    const secondary = container.querySelector(
      '[data-luca-onboarding-cta="secondary"]',
    ) as HTMLButtonElement;
    const darkMode = container.querySelector(
      '[data-luca-onboarding-option="dark"]',
    ) as HTMLButtonElement;

    act(() => {
      primary.click();
      secondary.click();
      darkMode.click();
    });

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onSelectOption).toHaveBeenCalledWith("dark");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the presence screen as a startup-surface list with per-row toggles", () => {
    const onStartupSurfacesChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <LucaOnboardingScreen
          screenId="presence"
          startupSurfaceSelections={["minichat"]}
          onStartupSurfacesChange={onStartupSurfacesChange}
        />,
      );
    });

    // List layout — one row per startup surface, no dashboard row (everyone
    // lands in the dashboard after setup).
    expect(
      container.querySelector(
        '[data-luca-onboarding-options-layout="startup-list"]',
      ),
    ).not.toBeNull();
    for (const id of ["minichat", "voice", "widget", "presence"]) {
      expect(
        container.querySelector(`[data-luca-startup-surface="${id}"]`),
      ).not.toBeNull();
    }
    expect(
      container.querySelector('[data-luca-startup-surface="dashboard"]'),
    ).toBeNull();
    expect(container.querySelector("[data-luca-onboarding-advanced-toggle]")).toBeNull();

    // The controlled active set drives each row's toggle state.
    const minichat = container.querySelector(
      '[data-luca-onboarding-option="minichat"]',
    ) as HTMLButtonElement;
    expect(minichat.getAttribute("aria-pressed")).toBe("true");
    expect(minichat.textContent).toContain("Active now");
    const widget = container.querySelector(
      '[data-luca-onboarding-option="widget"]',
    ) as HTMLButtonElement;
    expect(widget.getAttribute("aria-pressed")).toBe("false");
    expect(widget.textContent).toContain("Enable later");

    // Toggling reports the full next set; turning the last one off is allowed.
    act(() => widget.click());
    expect(onStartupSurfacesChange).toHaveBeenCalledWith(["minichat", "widget"]);
    act(() => minichat.click());
    expect(onStartupSurfacesChange).toHaveBeenLastCalledWith([]);

    act(() => root.unmount());
    container.remove();
  });

  it("does not mutate document root / body styles when mounted", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<LucaOnboardingScreen screenId="finish" />);
    });

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
