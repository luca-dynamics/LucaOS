// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LucaOnboardingMotion,
  getLucaOnboardingMotionStyle,
} from "./LucaOnboardingMotion";

describe("getLucaOnboardingMotionStyle", () => {
  it("is fully static under reduced motion (no transform, no transition)", () => {
    const style = getLucaOnboardingMotionStyle({ reducedMotion: true, active: false });
    expect(style.opacity).toBe(1);
    expect(style.transform).toBeUndefined();
    expect(style.transition).toBeUndefined();
  });

  it("fades/settles in when motion is allowed", () => {
    const entering = getLucaOnboardingMotionStyle({ reducedMotion: false, active: false });
    expect(entering.opacity).toBe(0);
    expect(entering.transform).toContain("translateY(8px)");
    expect(String(entering.transition)).toContain("opacity");

    const entered = getLucaOnboardingMotionStyle({ reducedMotion: false, active: true });
    expect(entered.opacity).toBe(1);
    expect(entered.transform).toContain("translateY(0)");
  });
});

describe("LucaOnboardingMotion", () => {
  it("renders children at full opacity and static marker under reduced motion", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingMotion reducedMotion>
        <span>hello</span>
      </LucaOnboardingMotion>,
    );
    expect(markup).toContain('data-luca-onboarding-motion="static"');
    expect(markup).toContain("hello");
    expect(markup).toContain("opacity:1");
    expect(markup).not.toContain("transition");
  });

  it("marks an entrance transition when motion is allowed", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingMotion>
        <span>hello</span>
      </LucaOnboardingMotion>,
    );
    expect(markup).toContain('data-luca-onboarding-motion="enter"');
    expect(markup).toContain("transition");
    expect(markup).toContain("hello");
  });

  it("does not mutate document root / body styles when mounted", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <LucaOnboardingMotion>
          <span>content</span>
        </LucaOnboardingMotion>,
      );
    });

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);

    act(() => root.unmount());
    container.remove();
  });
});
