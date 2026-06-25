// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaOnboardingScreen } from "./LucaOnboardingScreen";

describe("LucaOnboardingScreen progressive disclosure", () => {
  it("collapses advanced options behind a native disclosure in Basic", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="intelligence_route" audienceMode="basic" />,
    );
    // Disclosure wrapper + toggle present.
    expect(markup).toContain("data-luca-onboarding-advanced");
    expect(markup).toContain("data-luca-onboarding-advanced-toggle");
    expect(markup).toContain("Advanced options");
    // Primary options sit outside the disclosure; advanced ones live inside it.
    expect(markup).toContain('data-luca-onboarding-option="luca_prime"');
    expect(markup).toContain('data-luca-onboarding-option="local_model"');
    expect(markup).toContain('data-luca-onboarding-option="bring_your_own_key"');
  });

  it("shows advanced options inline (no disclosure) for Pro", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="intelligence_route" audienceMode="pro" />,
    );
    expect(markup).not.toContain("data-luca-onboarding-advanced");
    // Advanced options still render, just inline.
    expect(markup).toContain('data-luca-onboarding-option="local_model"');
    expect(markup).toContain('data-luca-onboarding-option="bring_your_own_key"');
  });

  it("shows advanced options inline (no disclosure) for Creator", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="permission_style" audienceMode="creator" />,
    );
    expect(markup).not.toContain("data-luca-onboarding-advanced");
    expect(markup).toContain('data-luca-onboarding-option="custom"');
  });

  it("adds no disclosure for a screen with no advanced options, regardless of tier", () => {
    for (const mode of ["basic", "pro", "creator"] as const) {
      const markup = renderToStaticMarkup(
        <LucaOnboardingScreen screenId="environment" audienceMode={mode} />,
      );
      expect(markup, mode).not.toContain("data-luca-onboarding-advanced");
      expect(markup, mode).toContain('data-luca-onboarding-option="pearl"');
    }
  });
});
