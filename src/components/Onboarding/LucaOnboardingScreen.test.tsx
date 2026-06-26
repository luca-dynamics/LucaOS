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
    expect(copy.reassurance && markup.includes(copy.reassurance)).toBe(true);
    expect(markup).toContain(copy.primaryCta);
    expect(markup).toContain('data-luca-onboarding-screen="environment"');
  });

  it("renders an inert radiogroup with one card per option and the recommended chip", () => {
    const copy = getPremiumOnboardingCopy("basic").screens.environment;
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" />,
    );
    expect(markup).toContain('role="radiogroup"');
    for (const option of copy.options ?? []) {
      expect(markup).toContain(`data-luca-onboarding-option="${option.id}"`);
      expect(markup).toContain(option.title);
    }
    // Pearl is the recommended environment option.
    expect(markup).toContain('data-luca-onboarding-chip="recommended"');
  });

  it("marks the selected option (falling back to the map default) as checked", () => {
    const defaulted = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" />,
    );
    // Default environment selection is pearl.
    expect(defaulted).toMatch(
      /aria-checked="true" data-luca-onboarding-option="pearl"/,
    );

    const explicit = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" selectedOptionId="carbon" />,
    );
    expect(explicit).toMatch(
      /aria-checked="true" data-luca-onboarding-option="carbon"/,
    );
    expect(explicit).toMatch(
      /aria-checked="false" data-luca-onboarding-option="pearl"/,
    );
  });

  it("maps presence per screen: the hologram identity face on welcome/finish/presence, none on choice screens", () => {
    expect(getLucaOnboardingScreenPresence("welcome")).toBe("identity");
    expect(getLucaOnboardingScreenPresence("finish")).toBe("identity");
    expect(getLucaOnboardingScreenPresence("presence")).toBe("identity");
    expect(getLucaOnboardingScreenPresence("permission_style")).toBe("none");

    const welcome = renderToStaticMarkup(<LucaOnboardingScreen screenId="welcome" />);
    expect(welcome).toContain('data-luca-presence="identity"');

    const presence = renderToStaticMarkup(<LucaOnboardingScreen screenId="presence" />);
    expect(presence).toContain('data-luca-presence="identity"');

    const trust = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="permission_style" />,
    );
    expect(trust).not.toContain("data-luca-presence");
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
    const carbon = container.querySelector(
      '[data-luca-onboarding-option="carbon"]',
    ) as HTMLButtonElement;

    act(() => {
      primary.click();
      secondary.click();
      carbon.click();
    });

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onSelectOption).toHaveBeenCalledWith("carbon");

    act(() => {
      root.unmount();
    });
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
