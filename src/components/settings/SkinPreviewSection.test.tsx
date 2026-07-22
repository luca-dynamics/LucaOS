// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SKIN_PREVIEW_HELPER_COPY,
  SkinPreviewSection,
} from "./SkinPreviewSection";
import { getLucaSkinPreviewMetadataList } from "../../config/lucaSkinPreviewMetadata";
import {
  DEFAULT_LUCA_SKIN_ID,
  normalizeLucaSkinId,
} from "../../config/lucaSkins";

describe("LucaOS skin settings section", () => {
  it("normalizes missing and invalid selected skin IDs to the default skin", () => {
    expect(normalizeLucaSkinId(undefined)).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(normalizeLucaSkinId("not-a-skin")).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(normalizeLucaSkinId("carbon")).toBe("carbon");
  });

  it("renders all eight skins in order", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);

    const list = getLucaSkinPreviewMetadataList();
    expect(list).toHaveLength(8);

    // Launch order: the four originals, then Graphite, Onyx, Dusk, Mist.
    expect(list.map((skin) => skin.id)).toEqual([
      "pearl",
      "carbon",
      "flow",
      "canvas",
      "graphite",
      "onyx",
      "dusk",
      "mist",
    ]);

    for (const skin of list) {
      expect(markup).toContain(skin.label);
      expect(markup).toContain(`data-skin-preview-card="${skin.id}"`);
    }

    const order = list.map((skin) =>
      markup.indexOf(`data-skin-preview-card="${skin.id}"`),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("marks Pearl as the recommended default and current fallback", () => {
    const markup = renderToStaticMarkup(
      <SkinPreviewSection selectedSkinId="not-a-skin" />,
    );
    expect(markup).toContain("Recommended");
    expect(markup).toContain("Current");
    expect(markup).toContain('data-skin-preview-card="pearl"');

    const list = getLucaSkinPreviewMetadataList();
    const recommended = list.filter((skin) =>
      skin.capabilities.includes("recommended-default"),
    );
    expect(recommended.map((skin) => skin.id)).toEqual(["pearl"]);
  });

  it("presents the catalog as the optional shelf below appearance mode", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);
    expect(markup).toContain("active LucaOS visual environment");
    expect(markup).not.toContain("applies to the dashboard shell only");
    expect(markup).not.toContain("not skinned yet");
    // Appearance mode leads; this section is explicitly optional.
    expect(markup).toContain("More environments");
    expect(SKIN_PREVIEW_HELPER_COPY).toContain("Optional");
    expect(markup).toContain("overrides the appearance mode above");
  });

  it("selecting a card calls the settings update path with that skin ID", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onSelectedSkinChange = vi.fn();

    act(() => {
      root.render(
        <SkinPreviewSection
          selectedSkinId="pearl"
          onSelectedSkinChange={onSelectedSkinChange}
        />,
      );
    });

    const carbonCard = container.querySelector(
      '[data-skin-preview-card="carbon"]',
    ) as HTMLButtonElement | null;
    expect(carbonCard?.tagName).toBe("BUTTON");

    act(() => {
      carbonCard?.click();
    });

    expect(onSelectedSkinChange).toHaveBeenCalledWith("carbon");

    act(() => {
      root.unmount();
    });
  });

  it("does not render apply or save controls", () => {
    const markup = renderToStaticMarkup(<SkinPreviewSection />);
    expect(markup.toLowerCase()).not.toContain("apply skin");
    expect(markup.toLowerCase()).not.toContain("save skin");
  });
});
