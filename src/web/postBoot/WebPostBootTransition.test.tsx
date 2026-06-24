import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";
import { WebPostBootLoading } from "./WebPostBootLoading";
import { WebPostBootTransition } from "./WebPostBootTransition";

const noop = () => {};
const postBootSource = readFileSync("src/web/postBoot/WebPostBootTransition.tsx", "utf8");
const staticFaceSource = readFileSync("src/components/visual/LucaStaticFacePresence.tsx", "utf8");

describe("WebPostBootTransition", () => {
  it("renders the pending loading bridge copy", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);
    expect(html).toContain("Preparing your LucaOS environment");
    expect(html).toContain("Checking your preferences");
  });

  it("uses the readiness bridge copy model and maps snapshot user state", () => {
    expect(postBootSource).toContain("resolvePostBootReadinessBridgeCopy");
    expect(postBootSource).toContain("state: snapshot.userState");
  });

  it("uses a static Luca face and keeps canvas status orbs", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "new_user", hasCompletedOnboarding: false, canEnterShell: false }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );

    expect(postBootSource).not.toContain("LucaHologramShaderPresence");
    expect(postBootSource).not.toContain("LucaHologramShaderScene");
    expect(postBootSource).not.toContain("HologramFace");
    expect(postBootSource).toContain("LucaStaticFacePresence");
    expect(staticFaceSource).toContain('src="/icon.png"');
    expect(staticFaceSource).not.toMatch(/three|@react-three\/fiber|@react-three\/drei|eventBus|Service/);
    expect(staticFaceSource.match(/className={[^}]+}|className="[^"]+"/g)?.join(" ") ?? "").not.toMatch(/ring|border|orbit|halo|rounded-full/);
    expect(html).toContain("Preparing your LucaOS environment");
    expect(html).toContain('src="/icon.png"');
    expect(html).toContain('data-visual-source="dictation-voice-canvas-orb"');
    expect(html).not.toContain('data-hologram-source="/models/avatar.glb"');
  });

  it("renders new-user copy", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "new_user", hasCompletedOnboarding: false, canEnterShell: false }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );
    expect(html).toContain("Preparing your LucaOS environment");
    expect(html).toContain("Luca is getting this device ready for first run.");
    expect(html).toContain("Ready to continue");
  });

  it("renders returning-user resume copy", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "returning_user", displayName: "Maya", hasCompletedOnboarding: true, preferredInteraction: "text", canEnterShell: true }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );
    expect(html).toContain("Welcome back");
    expect(html).toContain("LucaOS is restoring your workspace.");
    expect(html).not.toContain("Welcome back, Maya");
  });

  it("renders partial setup action copy", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "partial_setup", hasCompletedOnboarding: false, preferredInteraction: "text", canEnterShell: false }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );
    expect(html).toContain("Pick up where you left off");
    expect(html).toContain("Continue setup");
  });

  it("renders permission attention action copy", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "permission_attention", hasCompletedOnboarding: true, preferredInteraction: "voice", needsVoicePermission: true, canEnterShell: false }}
        onContinue={noop}
        onRestartOnboarding={noop}
        onReviewVoiceAccess={noop}
      />,
    );
    expect(html).toContain("Review voice access");
    expect(html).toContain("Continue without voice");
  });

  it("preserves callback prop names and auto-continue behavior", () => {
    expect(postBootSource).toContain("onContinue");
    expect(postBootSource).toContain("onRestartOnboarding");
    expect(postBootSource).toContain("onReviewVoiceAccess");
    expect(postBootSource).toContain("onChooseModelRoute");
    expect(postBootSource).toContain("window.setTimeout(onContinue");
  });

  it("does not render terminal-style readiness wording", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "returning_user", hasCompletedOnboarding: true, canEnterShell: true }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    ).toLowerCase();

    for (const forbidden of ["system ready", "runtime ready", "kernel", "protocol", "webbridge", "browser-safe"]) {
      expect(html, forbidden).not.toContain(forbidden);
    }
  });
});
