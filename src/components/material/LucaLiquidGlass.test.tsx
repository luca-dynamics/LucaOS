import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaLiquidGlassLayer, LucaLiquidGlassSurface } from "./LucaLiquidGlass";

describe("Luca liquid glass material", () => {
  it("keeps optics decorative and outside semantic content", () => {
    const markup = renderToStaticMarkup(
      <LucaLiquidGlassSurface shape="circle" depth="hero">
        <span>Presence</span>
      </LucaLiquidGlassSurface>,
    );

    expect(markup).toContain("luca-liquid-glass");
    expect(markup).toContain('data-luca-glass-shape="circle"');
    expect(markup).toContain('data-luca-glass-depth="hero"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup.indexOf("Presence")).toBeLessThan(markup.indexOf("luca-liquid-glass__optics"));
  });

  it("exposes a layout-neutral layer for existing buttons", () => {
    const markup = renderToStaticMarkup(<LucaLiquidGlassLayer depth="quiet" />);
    expect(markup).toContain('data-luca-glass-depth="quiet"');
    expect(markup).toContain('data-luca-glass-shape="inherit"');
  });
});
