// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaOnboardingShell } from "./LucaOnboardingShell";

describe("LucaOnboardingShell", () => {
  it("renders children inside the scoped shell with the resolved skin/surface", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingShell selectedSkinId="flow" surface="onboarding-welcome">
        <p>Welcome to LucaOS</p>
      </LucaOnboardingShell>,
    );
    expect(markup).toContain('data-luca-onboarding-shell="onboarding-welcome"');
    expect(markup).toContain('data-luca-onboarding-skin="flow"');
    expect(markup).toContain('data-luca-material-role="root"');
    expect(markup).toContain("Welcome to LucaOS");
  });

  it("scopes both material and presence variables onto its own root", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingShell selectedSkinId="carbon">x</LucaOnboardingShell>,
    );
    // material variable from the bridge
    expect(markup).toContain("--luca-background-base");
    // presence variable from the presence resolver
    expect(markup).toContain("--luca-skin-presence-orb");
  });

  it("renders the ambient presence layer by default and can disable it", () => {
    const withAmbient = renderToStaticMarkup(
      <LucaOnboardingShell selectedSkinId="pearl">x</LucaOnboardingShell>,
    );
    expect(withAmbient).toContain('data-luca-presence="ambient"');

    const without = renderToStaticMarkup(
      <LucaOnboardingShell selectedSkinId="pearl" ambientPresence={false}>
        x
      </LucaOnboardingShell>,
    );
    expect(without).not.toContain('data-luca-presence="ambient"');
  });

  it("falls back to Pearl for an invalid skin id", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingShell selectedSkinId="not-a-skin">x</LucaOnboardingShell>,
    );
    expect(markup).toContain('data-luca-onboarding-skin="pearl"');
  });

  it("does not mutate document root / body styles when mounted", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <LucaOnboardingShell selectedSkinId="flow">
          <span>content</span>
        </LucaOnboardingShell>,
      );
    });

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
