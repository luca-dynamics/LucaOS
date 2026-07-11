// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import { LucaPremiumOnboardingPreview } from "./LucaPremiumOnboardingPreview";
import type { LucaOnboardingFlowState } from "./lucaOnboardingFlowEngine";

function clickPrimary(container: HTMLElement) {
  const primary = container.querySelector(
    '[data-luca-onboarding-cta="primary"]',
  ) as HTMLButtonElement;
  act(() => primary.click());
}

describe("LucaPremiumOnboardingPreview onComplete (P4)", () => {
  it("fires onComplete once with a completed flow from the finish CTA", () => {
    const onComplete = vi.fn<[LucaOnboardingFlowState], void>();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        <LucaPremiumOnboardingPreview
          initialScreenId="finish"
          settleDurationMs={0}
          offerFaceRecognition={false}
          onComplete={onComplete}
        />,
      ),
    );

    clickPrimary(container);

    expect(onComplete).toHaveBeenCalledTimes(1);
    const flow = onComplete.mock.calls[0][0];
    expect(flow.complete).toBe(true);
    expect(flow.currentScreenId).toBe("finish");

    // Idempotent: clicking again does not re-fire.
    clickPrimary(container);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });

  it("does not fire onComplete before the finish screen completes", () => {
    const onComplete = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<LucaPremiumOnboardingPreview onComplete={onComplete} />));

    // Welcome primary advances; it must not complete the flow.
    clickPrimary(container);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });
});
