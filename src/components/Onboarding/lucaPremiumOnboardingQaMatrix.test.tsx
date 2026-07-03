// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LUCA_SKIN_IDS, type LucaSkinHostKind } from "../../config/lucaSkins";
import {
  LUCA_SKIN_MATERIAL_VARIABLE_NAMES,
} from "../../styles/lucaSkinMaterialBridge";
import { LUCA_SKIN_PRESENCE_VARIABLE_NAMES } from "../../styles/lucaSkinPresence";
import { isLucaSkinBloomIridescent } from "../../styles/lucaSkinPresence";
import { resolveLucaOnboardingSkinBoundary } from "../../styles/lucaOnboardingSkinBoundary";
import { LucaOnboardingShell } from "./LucaOnboardingShell";
import { LucaOnboardingScreen } from "./LucaOnboardingScreen";
import { LucaPremiumOnboardingPreview } from "./LucaPremiumOnboardingPreview";

/**
 * Cross-skin / cross-host / accessibility QA matrix for the dormant premium
 * onboarding presence stack. Test-only: it asserts the staged system's
 * invariants across every skin (Pearl/Carbon/Flow/Canvas), host
 * (desktop/mobile, app/web), and the reduced-motion / reduced-transparency
 * accessibility flags, without changing any source or mounting the system into
 * production.
 */

const HOST_KINDS: LucaSkinHostKind[] = [
  "desktop-app",
  "desktop-web",
  "mobile-app",
  "mobile-web",
];

// Substrings that must never leak into skin-scoped material/presence variables.
const STATUS_OR_SAFETY_NAME_PARTS = [
  "danger",
  "warning",
  "success",
  "info",
  "approval",
  "permission",
  "blocked",
  "mission",
  "voice",
  "listening",
  "vision",
  "screen",
  "stop",
] as const;

function mountAndUnmount(ui: React.ReactElement): void {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  act(() => root.unmount());
  container.remove();
}

describe("premium onboarding QA matrix", () => {
  it("resolves a complete, status-free boundary for every skin × host", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      for (const hostKind of HOST_KINDS) {
        const boundary = resolveLucaOnboardingSkinBoundary({ selectedSkinId: skinId, hostKind });
        expect(boundary.skinId).toBe(skinId);
        expect(boundary.hostKind).toBe(hostKind);

        // Complete variable maps.
        expect(Object.keys(boundary.materialVariables).sort()).toEqual(
          [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
        );
        expect(Object.keys(boundary.presenceVariables).sort()).toEqual(
          [...LUCA_SKIN_PRESENCE_VARIABLE_NAMES].sort(),
        );

        // No status/safety semantics leak into skin variables.
        const names = [
          ...Object.keys(boundary.materialVariables),
          ...Object.keys(boundary.presenceVariables),
        ];
        for (const name of names) {
          for (const part of STATUS_OR_SAFETY_NAME_PARTS) {
            expect(name.includes(part), `${skinId}/${hostKind}: ${name}`).toBe(false);
          }
        }
      }
    }
  });

  it("keeps Flow static (reduced motion forced) and iridescent only on Flow", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const boundary = resolveLucaOnboardingSkinBoundary({ selectedSkinId: skinId });
      if (skinId === "flow") {
        expect(boundary.reducedMotion).toBe(true);
        expect(isLucaSkinBloomIridescent(skinId)).toBe(true);
      } else {
        expect(isLucaSkinBloomIridescent(skinId)).toBe(false);
      }
    }
  });

  it("collapses blur to zero under reduced transparency for every skin", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const boundary = resolveLucaOnboardingSkinBoundary({
        selectedSkinId: skinId,
        reducedTransparency: true,
      });
      expect(boundary.materialVariables["--luca-material-blur"]).toBe("0px");
      expect(boundary.presenceVariables["--luca-skin-presence-ambient-blur"]).toBe("0px");
      // Reduced transparency also forces a normal (non-light-bleeding) blend.
      expect(boundary.presenceVariables["--luca-skin-presence-ambient-blend"]).toBe("normal");
    }
  });

  it("never increases ambient blur on constrained hosts (mobile-web <= desktop)", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const desktop = resolveLucaOnboardingSkinBoundary({
        selectedSkinId: skinId,
        hostKind: "desktop-web",
      });
      const mobile = resolveLucaOnboardingSkinBoundary({
        selectedSkinId: skinId,
        hostKind: "mobile-web",
      });
      const desktopBlur = Number.parseFloat(
        desktop.presenceVariables["--luca-skin-presence-ambient-blur"],
      );
      const mobileBlur = Number.parseFloat(
        mobile.presenceVariables["--luca-skin-presence-ambient-blur"],
      );
      expect(mobileBlur).toBeLessThanOrEqual(desktopBlur);
    }
  });

  it("scopes each skin onto the shell root and never mutates document/body", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    for (const skinId of LUCA_SKIN_IDS) {
      const markup = renderToStaticMarkup(
        <LucaOnboardingShell selectedSkinId={skinId}>
          <span>content</span>
        </LucaOnboardingShell>,
      );
      expect(markup).toContain(`data-luca-onboarding-skin="${skinId}"`);
      // Material + presence variables are scoped onto the shell root.
      expect(markup).toContain("--luca-background-base");
      expect(markup).toContain("--luca-skin-presence-orb");

      mountAndUnmount(
        <LucaPremiumOnboardingPreview initialScreenId="environment" />,
      );
    }

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);
  });

  it("reduced transparency reaches the shell's scoped material style", () => {
    const markup = renderToStaticMarkup(
      <LucaOnboardingShell selectedSkinId="flow" reducedTransparency>
        <span>x</span>
      </LucaOnboardingShell>,
    );
    expect(markup).toContain("--luca-material-blur:0px");
  });

  it("holds the per-screen presence mapping across skins", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const welcome = renderToStaticMarkup(
        <LucaOnboardingScreen screenId="welcome" skinId={skinId} />,
      );
      expect(welcome).toContain('data-luca-presence="identity"');

      const presence = renderToStaticMarkup(
        <LucaOnboardingScreen screenId="presence" skinId={skinId} />,
      );
      expect(presence).toContain('data-luca-presence="identity"');

      // Incarnation rhythm: the being is present on every screen, small
      // while the user is choosing.
      const trust = renderToStaticMarkup(
        <LucaOnboardingScreen screenId="permission_style" skinId={skinId} />,
      );
      expect(trust).toContain('data-luca-presence="identity"');
    }
  });
});
