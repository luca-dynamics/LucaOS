// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  createLucaOnboardingFlowState,
  lucaOnboardingFlowSetName,
} from "./lucaOnboardingFlowEngine";
import { mapLucaOnboardingFlowToWebProfile } from "./lucaOnboardingCompletionBridge";
import { LucaOnboardingScreen } from "./LucaOnboardingScreen";
import { LucaPremiumOnboardingPreview } from "./LucaPremiumOnboardingPreview";

describe("premium onboarding name capture (P2)", () => {
  it("seeds an empty display name and sets it immutably", () => {
    const state = createLucaOnboardingFlowState();
    expect(state.displayName).toBe("");

    const named = lucaOnboardingFlowSetName(state, "Maya");
    expect(named.displayName).toBe("Maya");
    expect(state.displayName).toBe(""); // original untouched
    // unchanged value returns same reference
    expect(lucaOnboardingFlowSetName(named, "Maya")).toBe(named);
  });

  it("flows the captured (trimmed) name into the web profile", () => {
    const flow = lucaOnboardingFlowSetName(createLucaOnboardingFlowState(), "  Maya  ");
    expect(mapLucaOnboardingFlowToWebProfile(flow).profile.name).toBe("Maya");
  });

  it("renders the optional name field only on welcome when a handler is given", () => {
    const welcome = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="welcome" onNameChange={() => {}} nameValue="" />,
    );
    expect(welcome).toContain("data-luca-onboarding-name");
    expect(welcome).toContain("What should Luca call you?");

    // No handler -> no field.
    const noHandler = renderToStaticMarkup(<LucaOnboardingScreen screenId="welcome" />);
    expect(noHandler).not.toContain("data-luca-onboarding-name");

    // Not the welcome screen -> no field even with a handler.
    const env = renderToStaticMarkup(
      <LucaOnboardingScreen screenId="environment" onNameChange={() => {}} />,
    );
    expect(env).not.toContain("data-luca-onboarding-name");
  });

  it("reports name edits through the controlled handler", () => {
    const onNameChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <LucaOnboardingScreen screenId="welcome" nameValue="" onNameChange={onNameChange} />,
      );
    });
    const input = container.querySelector(
      "[data-luca-onboarding-name] input",
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "Maya");
    act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onNameChange).toHaveBeenCalledWith("Maya");

    act(() => root.unmount());
    container.remove();
  });

  it("captures the name in the dormant preview on the welcome screen", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<LucaPremiumOnboardingPreview />));

    const input = container.querySelector(
      "[data-luca-onboarding-name] input",
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "Sam");
    act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const updated = container.querySelector(
      "[data-luca-onboarding-name] input",
    ) as HTMLInputElement;
    expect(updated.value).toBe("Sam");

    act(() => root.unmount());
    container.remove();
  });
});
