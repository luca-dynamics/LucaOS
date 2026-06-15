import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebPostBootTransition } from "./WebPostBootTransition";
import { WebPostBootLoading } from "./WebPostBootLoading";

const noop = () => {};

describe("WebPostBootTransition", () => {
  it("renders a safe immediate loading surface", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);

    expect(html).toContain("Preparing LucaOS");
    expect(html).toContain("Starting Luca&#x27;s web session…");
    expect(html).not.toContain("React did not hydrate");
  });

  it("renders premium new-user preparation copy with existing Luca visuals", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{
          userState: "new_user",
          hasCompletedOnboarding: false,
          canEnterShell: false,
        }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );

    expect(html).toContain("Preparing LucaOS");
    expect(html).toContain("Luca is setting up your personal AI environment.");
    expect(html).toContain('src="/icon.png"');
    expect(html).toContain("Luca voice presence preparing");
    expect(html).not.toContain("&gt; Luca is waking up");
  });

  it("renders returning-user resume copy", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{
          userState: "returning_user",
          displayName: "Maya",
          hasCompletedOnboarding: true,
          preferredInteraction: "text",
          canEnterShell: true,
        }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );

    expect(html).toContain("Welcome back, Maya");
    expect(html).toContain("Restoring your LucaOS workspace.");
  });

  it("renders minimal partial-setup actions", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{
          userState: "partial_setup",
          displayName: "Maya",
          hasCompletedOnboarding: false,
          canEnterShell: false,
        }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );

    for (const action of [
      "Continue with limited mode",
      "Review voice access",
      "Choose model route",
      "Restart onboarding",
    ]) {
      expect(html).toContain(action);
    }
  });
});
