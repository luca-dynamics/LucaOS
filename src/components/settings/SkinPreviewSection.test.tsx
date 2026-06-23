// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SKIN_PREVIEW_HELPER_COPY,
  SkinPreviewSection,
} from "./SkinPreviewSection";
import { getLucaSkinPreviewMetadataList } from "../../config/lucaSkinPreviewMetadata";

describe("LucaOS skin settings preview section", () => {
  it("renders all four launch skins in order", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);

    const list = getLucaSkinPreviewMetadataList();
    expect(list).toHaveLength(4);

    // Launch order: Pearl, Carbon, Flow, Canvas.
    expect(list.map((skin) => skin.id)).toEqual([
      "pearl",
      "carbon",
      "flow",
      "canvas",
    ]);

    for (const skin of list) {
      expect(markup).toContain(skin.label);
      expect(markup).toContain(`data-skin-preview-card="${skin.id}"`);
    }

    // Cards should appear in launch order within the rendered markup.
    const order = list.map((skin) =>
      markup.indexOf(`data-skin-preview-card="${skin.id}"`),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("marks Pearl as the recommended default", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);
    expect(markup).toContain("Recommended");

    const list = getLucaSkinPreviewMetadataList();
    const recommended = list.filter((skin) =>
      skin.capabilities.includes("recommended-default"),
    );
    expect(recommended.map((skin) => skin.id)).toEqual(["pearl"]);
  });

  it("states clearly that previews are not active yet", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);
    expect(markup).toContain("Skins are not active yet");
    expect(SKIN_PREVIEW_HELPER_COPY).toContain("Skins are not active yet");
    expect(SKIN_PREVIEW_HELPER_COPY).toContain(
      "does not change your current interface",
    );
  });

  it("does not render any apply, save, or select controls", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);
    // Preview-only: no actionable skin controls of any kind.
    expect(markup).not.toContain("<button");
    expect(markup.toLowerCase()).not.toContain("apply skin");
    expect(markup.toLowerCase()).not.toContain("save skin");
    expect(markup.toLowerCase()).not.toContain("select skin");
  });
});
