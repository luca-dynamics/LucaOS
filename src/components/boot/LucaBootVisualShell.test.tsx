// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaBootVisualShell } from "./LucaBootVisualShell";

const { readFileSync } = process.getBuiltinModule("node:fs");
const render = (node: React.ReactElement) => renderToStaticMarkup(node);

const theme = {
  hex: "#5eead4",
  themeName: "Test",
};

describe("LucaBootVisualShell", () => {
  it("renders browser-safe hologram boot without old orb, logo, spinner, or dot-chip treatment", () => {
    const html = render(
      <LucaBootVisualShell
        bootSequence="INIT"
        biosStatus={{}}
        theme={theme}
        browserSafeInterface
      />,
    );

    expect(html).toContain("data-boot-shell=\"luca-hologram-face\"");
    expect(html).toContain("data-boot-visual=\"landing-hologram-face\"");
    expect(html).toContain("/hologram.png");
    expect(html).toContain("LucaOS");
    expect(html).toContain("Host-native personal AI OS");
    expect(html).toContain("Entering browser host");
    expect(html).toContain("Web surface ready");
    expect(html).toContain("Actions remain permissioned");
    expect(html).not.toContain("/icon.png");
    expect(html).not.toContain("rounded-full border p-2");
    expect(html).not.toContain("holo-ring");
    expect(html).not.toContain("spinner");
    expect(html).not.toContain("top-[12%] h-px");
    expect(html).not.toContain("top-[49%] h-px");
  });
  it("locks boot to its neutral boundary without reading the selected skin", () => {
    const source = readFileSync("src/components/boot/LucaBootVisualShell.tsx", "utf8");

    expect(source).toContain("resolveLucaBootSkinBoundary");
    expect(source).not.toContain("settingsService");
    expect(source).not.toContain("selectedSkinId");
    expect(source).toContain('surface: "boot-window"');
    expect(source).toContain('hostKind: "desktop-web"');
    expect(source.match(/bootSkinBoundary\.materialVariables/g) ?? []).toHaveLength(1);
    expect(source).not.toMatch(
      /document\.documentElement|style\.setProperty|document\.body|body\.style|document\.querySelector\(\"html\"\)|LucaSkinProvider/,
    );
    expect(source).not.toMatch(
      /@keyframes|animation:|requestAnimationFrame|setInterval|setTimeout|parallax/,
    );
  });

});
