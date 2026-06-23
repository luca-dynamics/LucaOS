import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLucaDashboardSkinBoundary } from "./lucaDashboardSkinBoundary";
import { resolveLucaMobileSkinBoundary } from "./lucaMobileSkinBoundary";
import { LUCA_SKIN_MATERIAL_VARIABLE_NAMES } from "./lucaSkinMaterialBridge";

const repoRoot = resolve(__dirname, "../..");

function readSource(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const boundarySourcePaths = [
  "src/App.tsx",
  "src/styles/lucaDashboardSkinBoundary.ts",
  "src/styles/lucaMobileSkinBoundary.ts",
  "src/styles/lucaSkinRegistry.ts",
  "src/styles/lucaSkinMaterialBridge.ts",
  "src/styles/lucaShellStyles.ts",
  "src/styles/lucaMobileShellStyles.ts",
];

const boundarySources = boundarySourcePaths.map((path) => [path, readSource(path)] as const);
const pureSkinBoundarySourcePaths = boundarySourcePaths.filter((path) => path !== "src/App.tsx");
const pureSkinBoundarySources = pureSkinBoundarySourcePaths.map(
  (path) => [path, readSource(path)] as const,
);
const protectedTokenNamePattern =
  /danger|warning|success|info|approval|permission|blocked|voice|listening|vision|screen|stop/i;

describe("Luca skin QA matrix source boundaries", () => {
  it("keeps dashboard and mobile skin boundaries wired through local material variable maps", () => {
    const appSource = readSource("src/App.tsx");

    expect(appSource).toContain("resolveLucaDashboardSkinBoundary");
    expect(appSource).toContain("resolveLucaMobileSkinBoundary");
    expect(appSource).toContain("dashboardSkinBoundary.materialVariables");
    expect(appSource).toContain("mobileSkinBoundary.materialVariables");
  });

  it("does not introduce root, body, html, or provider-based skin mutation", () => {
    const forbiddenFragments = [
      "document.documentElement.style.setProperty",
      "document.body",
      "body.style",
      'document.querySelector("html")',
      "LucaSkinProvider",
    ];

    for (const [path, source] of pureSkinBoundarySources) {
      for (const fragment of forbiddenFragments) {
        expect(source, `${path} should not include ${fragment}`).not.toContain(fragment);
      }
    }
  });

  it("keeps Flow static in skin boundary, bridge, and shell style sources", () => {
    const forbiddenMotionFragments = [
      "@keyframes",
      "requestAnimationFrame",
      "setInterval",
      "setTimeout",
      "parallax",
      "animation:",
    ];

    for (const [path, source] of pureSkinBoundarySources) {
      for (const fragment of forbiddenMotionFragments) {
        expect(source, `${path} should not include ${fragment}`).not.toContain(fragment);
      }
    }
  });
});

describe("Luca skin QA matrix resolver contract", () => {
  it("falls invalid dashboard and mobile selections back to Pearl", () => {
    expect(resolveLucaDashboardSkinBoundary({ selectedSkinId: "invalid" }).skinId).toBe(
      "pearl",
    );
    expect(resolveLucaMobileSkinBoundary({ selectedSkinId: "invalid" }).skinId).toBe(
      "pearl",
    );
  });

  it("returns complete dashboard and mobile material variable maps", () => {
    const dashboardVariables = resolveLucaDashboardSkinBoundary().materialVariables;
    const mobileVariables = resolveLucaMobileSkinBoundary().materialVariables;

    for (const variableName of LUCA_SKIN_MATERIAL_VARIABLE_NAMES) {
      expect(dashboardVariables[variableName]).toEqual(expect.any(String));
      expect(mobileVariables[variableName]).toEqual(expect.any(String));
    }
  });

  it("uses mobile-web by default and preserves mobile-app when requested", () => {
    expect(resolveLucaMobileSkinBoundary().hostKind).toBe("mobile-web");
    expect(resolveLucaMobileSkinBoundary({ hostKind: "desktop-web" }).hostKind).toBe(
      "mobile-web",
    );
    expect(resolveLucaMobileSkinBoundary({ hostKind: "mobile-app" }).hostKind).toBe(
      "mobile-app",
    );
  });

  it("forces Flow reduced motion on mobile and honors reduced transparency blur fallback", () => {
    expect(
      resolveLucaMobileSkinBoundary({ selectedSkinId: "flow", reducedMotion: false })
        .reducedMotion,
    ).toBe(true);
    expect(
      resolveLucaMobileSkinBoundary({
        selectedSkinId: "flow",
        reducedTransparency: true,
      }).materialVariables["--luca-material-blur"],
    ).toBe("0px");
  });

  it("excludes status and safety token names from skin material maps", () => {
    for (const variableName of LUCA_SKIN_MATERIAL_VARIABLE_NAMES) {
      expect(variableName).not.toMatch(protectedTokenNamePattern);
    }

    for (const variables of [
      resolveLucaDashboardSkinBoundary().materialVariables,
      resolveLucaMobileSkinBoundary().materialVariables,
    ]) {
      for (const variableName of Object.keys(variables)) {
        expect(variableName).not.toMatch(protectedTokenNamePattern);
      }
    }
  });
});
