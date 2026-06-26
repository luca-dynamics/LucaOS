// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LucaFaceRecognitionMoment } from "./LucaFaceRecognitionMoment";

const noop = () => {};

describe("LucaFaceRecognitionMoment", () => {
  it("opens with a calm, consent-first invitation in Luca's voice", () => {
    const markup = renderToStaticMarkup(
      <LucaFaceRecognitionMoment onComplete={noop} onSkip={noop} />,
    );
    expect(markup).toContain('data-luca-face-moment-stage="invite"');
    // Luca speaks; recognition framing, not a security checkpoint.
    expect(markup).toContain("Mind if I learn your face?");
    expect(markup).toContain("data-luca-face-moment-consent");
    expect(markup).toContain("never as a security lock");
    // Identity presence is the hero, and both choices are present.
    expect(markup).toContain('data-luca-presence="identity"');
    expect(markup).toContain('data-luca-face-moment-cta="accept"');
    expect(markup).toContain('data-luca-face-moment-cta="skip"');
    // The camera capture is NOT mounted until the user accepts.
    expect(markup).not.toContain('data-luca-face-moment-stage="capture"');
  });

  it("greets a known user by name without requiring one", () => {
    const named = renderToStaticMarkup(
      <LucaFaceRecognitionMoment userName="Maya" onComplete={noop} onSkip={noop} />,
    );
    expect(named).toContain("really you, Maya");

    const anon = renderToStaticMarkup(
      <LucaFaceRecognitionMoment onComplete={noop} onSkip={noop} />,
    );
    expect(anon).toContain("really you. It");
  });

  it("skips without ever opening the camera", () => {
    const onSkip = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<LucaFaceRecognitionMoment onComplete={noop} onSkip={onSkip} />));

    const skip = container.querySelector(
      '[data-luca-face-moment-cta="skip"]',
    ) as HTMLButtonElement;
    act(() => skip.click());

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('[data-luca-face-moment-stage="capture"]'),
    ).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it("advances to the capture stage only after the user accepts", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<LucaFaceRecognitionMoment userName="Sam" onComplete={noop} onSkip={noop} />));

    expect(
      container.querySelector('[data-luca-face-moment-stage="invite"]'),
    ).not.toBeNull();

    const accept = container.querySelector(
      '[data-luca-face-moment-cta="accept"]',
    ) as HTMLButtonElement;
    act(() => accept.click());

    expect(
      container.querySelector('[data-luca-face-moment-stage="capture"]'),
    ).not.toBeNull();

    act(() => root.unmount());
    container.remove();
  });
});
