// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import { LucaPremiumOnboardingPreview } from "./LucaPremiumOnboardingPreview";

const mount = (ui: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, cleanup: () => { act(() => root.unmount()); container.remove(); } };
};

const clickPrimary = (c: HTMLElement) =>
  act(() => (c.querySelector('[data-luca-onboarding-cta="primary"]') as HTMLButtonElement).click());

describe("LucaPremiumOnboardingPreview functional tail", () => {
  it("completes immediately when the tail is empty (no camera, cloud route)", () => {
    const onComplete = vi.fn();
    const { container, cleanup } = mount(
      <LucaPremiumOnboardingPreview
        settleDurationMs={0}
        initialScreenId="finish"
        cameraAvailable={false}
        supportsLocalProvisioning={false}
        onComplete={onComplete}
      />,
    );
    clickPrimary(container);
    expect(onComplete).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("runs the face moment before completing when a camera is available", () => {
    const onComplete = vi.fn();
    const { container, cleanup } = mount(
      <LucaPremiumOnboardingPreview
        settleDurationMs={0}
        initialScreenId="finish"
        cameraAvailable={true}
        supportsLocalProvisioning={false}
        onComplete={onComplete}
      />,
    );
    clickPrimary(container);
    // Entered the tail phase on the face step; not completed yet.
    expect(container.querySelector('[data-luca-onboarding-preview-phase="tail"]')).not.toBeNull();
    expect(container.querySelector("[data-luca-face-moment]")).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    // Decline the face moment -> tail finishes -> completes.
    act(() => (container.querySelector('[data-luca-face-moment-cta="skip"]') as HTMLButtonElement).click());
    expect(onComplete).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("sequences face then local for a local route on a provisioning host", () => {
    const onComplete = vi.fn();
    const { container, cleanup } = mount(
      <LucaPremiumOnboardingPreview
        settleDurationMs={0}
        initialScreenId="finish"
        cameraAvailable={true}
        supportsLocalProvisioning={true}
        onComplete={onComplete}
      />,
    );
    // Pick the local route on the finish screen is not possible; seed via initial flow:
    cleanup();

    // Re-mount starting at intelligence_route to choose local, then advance to finish.
    const m = mount(
      <LucaPremiumOnboardingPreview
        settleDurationMs={0}
        initialScreenId="intelligence_route"
        cameraAvailable={true}
        supportsLocalProvisioning={true}
        onComplete={onComplete}
      />,
    );
    act(() => (m.container.querySelector('[data-luca-onboarding-option="local_model"]') as HTMLButtonElement).click());
    clickPrimary(m.container); // intelligence_route -> finish
    clickPrimary(m.container); // finish -> enter tail (face first)

    expect(m.container.querySelector("[data-luca-face-moment]")).not.toBeNull();
    act(() => (m.container.querySelector('[data-luca-face-moment-cta="skip"]') as HTMLButtonElement).click());

    // Now the local-intelligence moment should be active (offer-setup, nothing configured).
    expect(m.container.querySelector("[data-luca-local-moment]")).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    // Stay on Luca Prime -> tail finishes -> completes.
    act(() => (m.container.querySelector('[data-luca-local-cta="skip"]') as HTMLButtonElement).click());
    expect(onComplete).toHaveBeenCalledTimes(1);
    m.cleanup();
  });
});
