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
  it("renders a safe immediate loading surface", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);
    expect(html).toContain("Preparing LucaOS");
    expect(html).toContain("Starting Luca&#x27;s web session…");
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
    expect(html).toContain("Preparing LucaOS");
    expect(html).toContain('src="/icon.png"');
    expect(html).toContain('data-visual-source="dictation-voice-canvas-orb"');
    expect(html).not.toContain('data-hologram-source="/models/avatar.glb"');
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

  it("renders returning-user resume copy", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{ userState: "returning_user", displayName: "Maya", hasCompletedOnboarding: true, preferredInteraction: "text", canEnterShell: true }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );
    expect(html).toContain("Welcome back, Maya");
    expect(html).toContain("Restoring your LucaOS workspace.");
  });
});
