// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vitest";
import { LucaPremiumOnboardingPreview } from "./LucaPremiumOnboardingPreview";

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

describe("LucaPremiumOnboardingPreview", () => {
  it("starts on welcome inside the shell with the default Pearl skin", () => {
    const { container, cleanup } = mount(<LucaPremiumOnboardingPreview settleDurationMs={0} />);
    expect(
      container.querySelector('[data-luca-onboarding-preview-screen="welcome"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-luca-onboarding-skin="pearl"]'),
    ).not.toBeNull();
    // welcome shows the hologram hero face (bespoke light hero, no orb)
    expect(
      container.querySelector('[data-luca-onboarding-screen="welcome"] img'),
    ).not.toBeNull();
    cleanup();
  });

  it("advances welcome -> environment via the primary CTA", () => {
    const { container, cleanup } = mount(<LucaPremiumOnboardingPreview settleDurationMs={0} />);
    const primary = container.querySelector(
      '[data-luca-onboarding-cta="primary"]',
    ) as HTMLButtonElement;
    act(() => primary.click());
    expect(
      container.querySelector('[data-luca-onboarding-preview-screen="environment"]'),
    ).not.toBeNull();
    cleanup();
  });

  it("lets the environment choice drive the shell skin", () => {
    const { container, cleanup } = mount(
      <LucaPremiumOnboardingPreview settleDurationMs={0} initialScreenId="environment" />,
    );
    // default appearance mode is light -> Pearl
    expect(
      container.querySelector('[data-luca-onboarding-skin="pearl"]'),
    ).not.toBeNull();

    const darkMode = container.querySelector(
      '[data-luca-onboarding-option="dark"]',
    ) as HTMLButtonElement;
    act(() => darkMode.click());

    expect(
      container.querySelector('[data-luca-onboarding-skin="carbon"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-luca-onboarding-skin="pearl"]'),
    ).toBeNull();
    cleanup();
  });

  it("hides Back on welcome and shows it after advancing", () => {
    const { container, cleanup } = mount(<LucaPremiumOnboardingPreview settleDurationMs={0} />);
    expect(
      container.querySelector("[data-luca-onboarding-preview-back]"),
    ).toBeNull();

    const primary = container.querySelector(
      '[data-luca-onboarding-cta="primary"]',
    ) as HTMLButtonElement;
    act(() => primary.click());

    const back = container.querySelector(
      "[data-luca-onboarding-preview-back]",
    ) as HTMLButtonElement;
    expect(back).not.toBeNull();
    act(() => back.click());
    expect(
      container.querySelector('[data-luca-onboarding-preview-screen="welcome"]'),
    ).not.toBeNull();
    cleanup();
  });

  it("completes only via the finish primary CTA (inert flag, no side effects)", () => {
    const { container, cleanup } = mount(
      <LucaPremiumOnboardingPreview settleDurationMs={0} initialScreenId="finish" />,
    );
    const preview = container.querySelector(
      "[data-luca-onboarding-preview]",
    ) as HTMLElement;
    expect(preview.getAttribute("data-luca-onboarding-preview-complete")).toBe(
      "false",
    );

    const primary = container.querySelector(
      '[data-luca-onboarding-cta="primary"]',
    ) as HTMLButtonElement;
    act(() => primary.click());

    expect(preview.getAttribute("data-luca-onboarding-preview-complete")).toBe(
      "true",
    );
    cleanup();
  });

  it("does not mutate document root / body styles when mounted", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    const { cleanup } = mount(<LucaPremiumOnboardingPreview settleDurationMs={0} />);

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);

    cleanup();
  });
});
