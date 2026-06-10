// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaBootVisualShell } from "./LucaBootVisualShell";

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
    expect(html).toContain("landing/hologram.png");
    expect(html).toContain("LucaOS");
    expect(html).toContain("Host-native AI operating system");
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
});
