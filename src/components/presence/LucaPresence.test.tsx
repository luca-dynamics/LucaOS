// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LucaPresence, LUCA_PRESENCE_FACE_SRC } from "./LucaPresence";

describe("LucaPresence", () => {
  it("renders the ambient state as a hidden, non-interactive blurred face layer", () => {
    const markup = renderToStaticMarkup(
      <LucaPresence state="ambient" skinId="flow" position="top-right" />,
    );
    expect(markup).toContain('data-luca-presence="ambient"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain(LUCA_PRESENCE_FACE_SRC);
    // Consumes the scoped presence variables, not a hardcoded look.
    expect(markup).toContain("--luca-skin-presence-ambient-blur");
    expect(markup).toContain("--luca-skin-presence-ambient-opacity");
    expect(markup).toContain("pointer-events:none");
  });

  it("renders the identity state as a sharp face using the skin face filter", () => {
    const markup = renderToStaticMarkup(
      <LucaPresence state="identity" skinId="pearl" />,
    );
    expect(markup).toContain('data-luca-presence="identity"');
    expect(markup).toContain(LUCA_PRESENCE_FACE_SRC);
    expect(markup).toContain("var(--luca-skin-presence-face-filter)");
    expect(markup).toContain("--luca-skin-presence-bloom");
  });

  it("renders the voice state as a labelled orb from the skin orb token", () => {
    const markup = renderToStaticMarkup(
      <LucaPresence state="voice" skinId="carbon" label="Listening" />,
    );
    expect(markup).toContain('data-luca-presence="voice"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Listening"');
    expect(markup).toContain("var(--luca-skin-presence-orb)");
    // The voice orb does not require the face image.
    expect(markup).not.toContain(LUCA_PRESENCE_FACE_SRC);
  });

  it("falls back to the default skin for an invalid skin id", () => {
    const invalid = renderToStaticMarkup(
      <LucaPresence state="voice" skinId="not-a-skin" label="x" />,
    );
    const pearl = renderToStaticMarkup(
      <LucaPresence state="voice" skinId="pearl" label="x" />,
    );
    expect(invalid).toBe(pearl);
  });

  it("does not mutate document root / body styles when mounted (no global side effects)", () => {
    const rootStyleBefore = document.documentElement.getAttribute("style");
    const bodyStyleBefore = document.body.getAttribute("style");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<LucaPresence state="identity" skinId="flow" />);
    });

    expect(document.documentElement.getAttribute("style")).toBe(rootStyleBefore);
    expect(document.body.getAttribute("style")).toBe(bodyStyleBefore);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
